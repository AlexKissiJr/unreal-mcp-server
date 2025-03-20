/**
 * Test TCP client for the MCP server
 * This can be used to verify that the server is accepting connections
 */

import net from 'net';

class TestClient {
  constructor(port = 13378, host = 'localhost') {
    this.port = port;
    this.host = host;
    this.socket = null;
    this.requestId = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('data', (data) => {
        const messages = data.toString().split('\n').filter(Boolean);
        for (const message of messages) {
          try {
            const response = JSON.parse(message);
            console.log('Received response:', response);
          } catch (error) {
            console.error('Error parsing response:', error);
          }
        }
      });

      this.socket.on('close', () => {
        console.log('Connection closed');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        reject(error);
      });

      this.socket.connect(this.port, this.host);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: ++this.requestId,
        method,
        params
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, 5000);

      const messageHandler = (data) => {
        const messages = data.toString().split('\n').filter(Boolean);
        for (const message of messages) {
          try {
            const response = JSON.parse(message);
            if (response.id === request.id) {
              clearTimeout(timeout);
              this.socket.removeListener('data', messageHandler);
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch (error) {
            console.error('Error parsing response:', error);
          }
        }
      };

      this.socket.on('data', messageHandler);
      this.socket.write(JSON.stringify(request) + '\n');
    });
  }

  async testConnection() {
    try {
      // Test echo tool
      console.log('\nTesting echo tool...');
      const echoResult = await this.sendRequest('echo', { text: 'Hello, MCP Server!' });
      console.log('Echo result:', echoResult);

      // Test get_time tool
      console.log('\nTesting get_time tool...');
      const timeResult = await this.sendRequest('get_time', { format: 'human' });
      console.log('Time result:', timeResult);

      // Test unreal_info tool
      console.log('\nTesting unreal_info tool...');
      const infoResult = await this.sendRequest('unreal_info', { detail: 'all' });
      console.log('Unreal info:', infoResult);

      // Test server_status tool
      console.log('\nTesting server_status tool...');
      const statusResult = await this.sendRequest('server_status', { include_memory: true });
      console.log('Server status:', statusResult);

      return true;
    } catch (error) {
      console.error('Test failed:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new TestClient();
  client.connect()
    .then(() => client.testConnection())
    .then(success => {
      client.disconnect();
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export default TestClient; 