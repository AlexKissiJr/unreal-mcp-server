/**
 * Connection manager for the MCP server
 * Tracks active client connections and provides connection status
 */

const EventEmitter = require('events');
const logger = require('./logger');

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.lastConnectionId = 0;
  }

  // Add a new client connection
  addConnection(socket) {
    const id = ++this.lastConnectionId;
    const connectionInfo = {
      id,
      socket,
      connectedAt: new Date(),
      address: socket.remoteAddress,
      port: socket.remotePort
    };

    this.connections.set(id, connectionInfo);
    
    logger.info(`New client connected: ${connectionInfo.address}:${connectionInfo.port} (ID: ${id})`);
    this.emit('connection', connectionInfo);
    
    // Setup disconnect handler
    socket.on('close', () => {
      this.removeConnection(id);
    });
    
    socket.on('error', (error) => {
      logger.error(`Client ${id} error: ${error.message}`);
    });
    
    return id;
  }

  // Remove a client connection
  removeConnection(id) {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      logger.info(`Client disconnected: ${connection.address}:${connection.port} (ID: ${id})`);
      this.emit('disconnection', connection);
    }
  }

  // Get all active connections
  getConnections() {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      address: conn.address,
      port: conn.port,
      connectedAt: conn.connectedAt,
      connectedFor: Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000)
    }));
  }

  // Get connection count
  getConnectionCount() {
    return this.connections.size;
  }

  // Check if any clients are connected
  hasConnections() {
    return this.connections.size > 0;
  }

  // Get connection status
  getStatus() {
    return {
      activeConnections: this.getConnectionCount(),
      connections: this.getConnections()
    };
  }
}

module.exports = new ConnectionManager(); 