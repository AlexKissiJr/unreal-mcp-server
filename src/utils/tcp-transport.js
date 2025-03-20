/**
 * TCP transport for the MCP server
 * Handles TCP connections and message passing
 */

const net = require('net');
const logger = require('./logger');
const connectionManager = require('./connection-manager');

class TcpServerTransport {
  constructor(port = 13378) { // Using 13378 instead of 13377 to avoid conflict with UnrealMCP
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
                      socket.write(JSON.stringify(response) + '\n');
                    }
                  }).catch(error => {
                    logger.error(`Error processing message from client ${clientId}: ${error.message}`);
                    socket.write(JSON.stringify({ error: error.message }) + '\n');
                  });
                }
              } catch (error) {
                logger.error(`Invalid JSON from client ${clientId}: ${error.message}`);
                socket.write(JSON.stringify({ error: 'Invalid JSON message' }) + '\n');
              }
            }
          });
          
          socket.on('error', (error) => {
            logger.error(`Socket error for client ${clientId}: ${error.message}`);
          });
        });
        
        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${this.port} is already in use. Please choose a different port.`);
          } else {
            logger.error(`Server error: ${error.message}`);
          }
          reject(error);
        });
        
        this.server.listen(this.port, () => {
          this.isConnected = true;
          logger.info(`TCP server listening on port ${this.port}`);
          resolve();
        });
        
      } catch (error) {
        logger.error(`Failed to start TCP server: ${error.message}`);
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
        logger.error(`Failed to send message to client ${connection.id}: ${error.message}`);
      }
    }
  }

  // Close the server
  async disconnect() {
    return new Promise((resolve) => {
      if (this.server) {
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

module.exports = TcpServerTransport; 