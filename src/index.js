// Import health check functionality
import { startHealthChecks } from './health.js';

// Import logger utility
import logger from './utils/logger.js';

// Import utilities
import connectionManager from './utils/connection-manager.js';
import TcpServerTransport from './utils/tcp-transport.js';

// Tool definitions with Smithery-compatible metadata
const tools = {
  echo: {
    name: 'echo',
    description: 'Echoes back the input text',
    version: '1.0.0',
    category: 'utility',
    schema: {
      type: 'object',
      properties: {
        text: { 
          type: 'string',
          description: 'The text to echo back'
        }
      },
      required: ['text']
    },
    handler: async ({ text }) => {
      logger.debug('Echo tool called with:', { text });
      return { text };
    }
  },
  
  get_time: {
    name: 'get_time',
    description: 'Returns the current time in various formats',
    version: '1.0.0',
    category: 'utility',
    schema: {
      type: 'object',
      properties: {
        format: { 
          type: 'string',
          description: 'The format to return the time in',
          enum: ['iso', 'unix', 'human'],
          default: 'iso'
        }
      }
    },
    handler: async ({ format = 'iso' }) => {
      const now = new Date();
      switch (format) {
        case 'unix':
          return { timestamp: Math.floor(now.getTime() / 1000) };
        case 'human':
          return { time: now.toLocaleString() };
        default:
          return { time: now.toISOString() };
      }
    }
  },
  
  unreal_info: {
    name: 'unreal_info',
    description: 'Returns information about the Unreal Engine integration',
    version: '1.0.0',
    category: 'unreal',
    schema: {
      type: 'object',
      properties: {
        detail: { 
          type: 'string',
          description: 'The type of information to return',
          enum: ['version', 'system', 'connectivity', 'all'],
          default: 'all'
        }
      }
    },
    handler: async ({ detail = 'all' }) => {
      const info = {
        name: 'Unreal MCP Server',
        version: '5.3',
        system: process.platform,
        connectivity: {
          transport: 'tcp',
          port: 13378,
          active_connections: connectionManager.getConnectionCount()
        }
      };

      if (detail === 'all') {
        return info;
      }
      return { [detail]: info[detail] };
    }
  },
  
  server_status: {
    name: 'server_status',
    description: 'Returns the current server status and health metrics',
    version: '1.0.0',
    category: 'system',
    schema: {
      type: 'object',
      properties: {
        include_memory: { 
          type: 'boolean',
          description: 'Whether to include memory usage information',
          default: false
        }
      }
    },
    handler: async ({ include_memory = false }) => {
      const status = {
        name: 'Unreal MCP Server',
        status: 'running',
        uptime: Math.floor(process.uptime()),
        active_connections: connectionManager.getConnectionCount(),
        transport: {
          type: 'tcp',
          port: 13378
        }
      };

      if (include_memory) {
        const memoryUsage = process.memoryUsage();
        status.memory = {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
        };
      }

      return status;
    }
  }
};

// Handle JSON-RPC requests
const handleRequest = async (request) => {
  if (!request.jsonrpc || request.jsonrpc !== '2.0') {
    throw new Error('Invalid JSON-RPC version');
  }

  if (!request.method) {
    throw new Error('Method not specified');
  }

  const tool = tools[request.method];
  if (!tool) {
    throw new Error(`Unknown method: ${request.method}`);
  }

  // Validate params against schema
  const params = request.params || {};
  if (tool.schema) {
    if (tool.schema.required) {
      for (const required of tool.schema.required) {
        if (!(required in params)) {
          throw new Error(`Missing required parameter: ${required}`);
        }
      }
    }
  }

  try {
    const result = await tool.handler(params);
    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  } catch (error) {
    logger.error('Tool handler error:', error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32000,
        message: error.message
      }
    };
  }
};

// Setup monitoring functions
function setupMonitoring() {
  // Start health checks
  startHealthChecks();

  // Log active connections periodically
  setInterval(() => {
    const count = connectionManager.getConnectionCount();
    logger.debug(`Active connections: ${count}`);
  }, 60000);

  // Log keep-alive message
  setInterval(() => {
    logger.debug('Server is running');
  }, 300000);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  process.exit(0);
});

// Main function to start the server
async function main() {
  logger.start();
  
  try {
    const transport = new TcpServerTransport();
    transport.setMessageHandler(handleRequest);
    
    await transport.connect();
    logger.info('MCP server started and ready for connections');
    
    // Setup monitoring
    setupMonitoring();
    
  } catch (error) {
    logger.error(`Failed to initialize server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
main(); 