// Import health check functionality
import { startHealthChecks } from './health.js';

// Import logger utility
import logger from './utils/logger.js';

// Import utilities
import connectionManager from './utils/connection-manager.js';
import TcpServerTransport from './utils/tcp-transport.js';

// Safe handler wrapper for tool handlers to prevent server crashes
const safeHandler = (handler) => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      logger.error('Tool handler error:', error);
      throw error;
    }
  };
};

// Tool definitions
const tools = {
  echo: {
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' }
      },
      required: ['text']
    },
    handler: safeHandler(async ({ text }) => {
      logger.debug('Echo tool called with:', { text });
      return { text };
    })
  },
  
  get_time: {
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['iso', 'unix', 'human'] }
      }
    },
    handler: safeHandler(async ({ format = 'iso' }) => {
      const now = new Date();
      switch (format) {
        case 'unix':
          return { timestamp: Math.floor(now.getTime() / 1000) };
        case 'human':
          return { time: now.toLocaleString() };
        default:
          return { time: now.toISOString() };
      }
    })
  },
  
  unreal_info: {
    schema: {
      type: 'object',
      properties: {
        detail: { type: 'string', enum: ['version', 'system', 'connectivity', 'all'] }
      }
    },
    handler: safeHandler(async ({ detail = 'all' }) => {
      const info = {
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
    })
  },
  
  server_status: {
    schema: {
      type: 'object',
      properties: {
        include_memory: { type: 'boolean' }
      }
    },
    handler: safeHandler(async ({ include_memory = false }) => {
      const status = {
        uptime: Math.floor(process.uptime()),
        active_connections: connectionManager.getConnectionCount()
      };

      if (include_memory) {
        const memoryUsage = process.memoryUsage();
        status.memory = {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        };
      }

      return status;
    })
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

  // Validate params against schema if provided
  if (tool.schema) {
    // Basic schema validation
    const params = request.params || {};
    if (tool.schema.required) {
      for (const required of tool.schema.required) {
        if (!(required in params)) {
          throw new Error(`Missing required parameter: ${required}`);
        }
      }
    }
  }

  const result = await tool.handler(request.params || {});
  return {
    jsonrpc: '2.0',
    id: request.id,
    result
  };
};

// Keep server alive and provide status updates
const setupMonitoring = () => {
  // Start health checks
  startHealthChecks(60);

  // Log active connections every minute
  setInterval(() => {
    const count = connectionManager.getConnectionCount();
    logger.info(`Active connections: ${count}`);
  }, 60000);
};

// Prevent unhandled promise rejections from crashing application
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

// Handle SIGTERM without exiting (for graceful shutdown in containers)
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down...');
  try {
    await server.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Main function to start the server
async function main() {
  logger.start();
  
  try {
    // Initialize server with proper error handling
    try {
      const transport = new TcpServerTransport();
      
      // Set message handler
      transport.setMessageHandler(handleRequest);
      
      // Connect with the transport but don't exit on error
      logger.info('Starting TCP server...');
      
      await transport.connect().catch(error => {
        logger.error(`Connection error: ${error.message}`);
        logger.info('Server will continue running despite connection issue.');
        // No process.exit() here to keep server alive
      });
      
      logger.info('MCP server started and ready for connections');
      
      // Setup monitoring
      setupMonitoring();
      
    } catch (error) {
      logger.error(`Error starting server: ${error.message}`);
      logger.info('Attempting to continue operation...');
      setupMonitoring();
    }
  } catch (error) {
    logger.error(`Failed to initialize server: ${error.message}`);
    logger.error('Server cannot start without proper initialization.');
  }
}

// Start the server
main(); 