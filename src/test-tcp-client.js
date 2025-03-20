/**
 * Test TCP client for the MCP server
 * This can be used to verify that the server is accepting connections
 */

const net = require('net');
const logger = require('./utils/logger');

class TestClient {
  constructor(port = 13378, host = 'localhost') {
    this.port = port;
    this.host = host;
    this.socket = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on('connect', () => {
        this.connected = true;
        logger.info(`Connected to server at ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          logger.info('Received response:', response);
        } catch (error) {
          logger.error('Error parsing response:', error.message);
        }
      });

      this.socket.on('close', () => {
        this.connected = false;
        logger.info('Connection closed');
      });

      this.socket.on('error', (error) => {
        logger.error('Socket error:', error.message);
        if (!this.connected) {
          reject(error);
        }
      });

      logger.info(`Attempting to connect to ${this.host}:${this.port}...`);
      this.socket.connect(this.port, this.host);
    });
  }

  async sendRequest(tool, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    const request = {
      jsonrpc: '2.0',
      method: tool,
      params,
      id: Date.now()
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, 5000);

      const messageHandler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.socket.removeListener('data', messageHandler);
            resolve(response);
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      };

      this.socket.on('data', messageHandler);
      this.socket.write(JSON.stringify(request) + '\n');
    });
  }

  async testConnection() {
    try {
      await this.connect();
      
      // Test echo
      logger.info('Testing echo tool...');
      const echoResponse = await this.sendRequest('echo', { text: 'Hello, MCP!' });
      logger.info('Echo response:', echoResponse);

      // Test server status
      logger.info('Testing server_status tool...');
      const statusResponse = await this.sendRequest('server_status', { includeConnections: true });
      logger.info('Status response:', statusResponse);

      return true;
    } catch (error) {
      logger.error('Test failed:', error.message);
      return false;
    } finally {
      if (this.socket) {
        this.socket.end();
      }
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const port = process.env.PORT || 13378;
  const client = new TestClient(port);
  
  client.testConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TestClient; 