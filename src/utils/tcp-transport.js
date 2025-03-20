/**
 * TCP transport for the MCP server
 * Handles TCP connections and message passing
 */

import net from 'net';
import logger from './logger.js';
import connectionManager from './connection-manager.js';

class TcpServerTransport {
  constructor(port = 13378) {
    this.port = port;
    this.server = null;
    this.onMessage = null;
    this.isConnected = false;
  }

  // Start listening for connections
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.server = net.createServer((socket) => {
          const clientId = connectionManager.addConnection(socket);
          logger.info(`Client ${clientId} connected from ${socket.remoteAddress}:${socket.remotePort}`);
          
          let buffer = '';
          
          socket.on('data', (data) => {
            buffer += data.toString();
            
            // Process complete messages
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const message = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              
              try {
                const parsed = JSON.parse(message);
                if (this.onMessage) {
                  this.onMessage(parsed).then(response => {
                    if (response) {
                      const responseStr = JSON.stringify(response) + '\n';
                      socket.write(responseStr);
                      logger.debug(`Sent response to client ${clientId}:`, response);
                    }
                  }).catch(error => {
                    logger.error(`Error processing message from client ${clientId}:`, error);
                    const errorResponse = {
                      jsonrpc: '2.0',
                      id: parsed.id,
                      error: {
                        code: -32000,
                        message: error.message || 'Internal error'
                      }
                    };
                    socket.write(JSON.stringify(errorResponse) + '\n');
                  });
                }
              } catch (error) {
                logger.error(`Invalid JSON from client ${clientId}:`, error);
                const errorResponse = {
                  jsonrpc: '2.0',
                  id: null,
                  error: {
                    code: -32700,
                    message: 'Parse error'
                  }
                };
                socket.write(JSON.stringify(errorResponse) + '\n');
              }
            }
          });
          
          socket.on('error', (error) => {
            logger.error(`Socket error for client ${clientId}:`, error);
          });
          
          socket.on('close', () => {
            logger.info(`Client ${clientId} disconnected`);
            connectionManager.removeConnection(clientId);
          });

          // Send initial connection success message
          const initMessage = {
            jsonrpc: '2.0',
            method: 'connection_status',
            params: {
              status: 'connected',
              client_id: clientId,
              server_info: {
                version: '1.0.0',
                transport: 'tcp',
                port: this.port
              }
            }
          };
          socket.write(JSON.stringify(initMessage) + '\n');
        });
        
        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${this.port} is already in use`);
          } else {
            logger.error('Server error:', error);
          }
          reject(error);
        });
        
        this.server.listen(this.port, () => {
          this.isConnected = true;
          logger.info(`TCP server listening on port ${this.port}`);
          resolve();
        });
        
      } catch (error) {
        logger.error('Failed to start TCP server:', error);
        reject(error);
      }
    });
  }

  // Set message handler
  setMessageHandler(handler) {
    this.onMessage = handler;
  }

  // Send a message to all connected clients
  broadcast(message) {
    const messageStr = JSON.stringify(message) + '\n';
    for (const connection of connectionManager.getConnections()) {
      try {
        connection.socket.write(messageStr);
      } catch (error) {
        logger.error(`Failed to send message to client ${connection.id}:`, error);
      }
    }
  }

  // Close the server
  async disconnect() {
    return new Promise((resolve) => {
      if (this.server) {
        // Close all client connections first
        for (const connection of connectionManager.getConnections()) {
          try {
            connection.socket.end();
          } catch (error) {
            logger.error(`Error closing client ${connection.id} connection:`, error);
          }
        }

        this.server.close(() => {
          this.isConnected = false;
          logger.info('TCP server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default TcpServerTransport; 