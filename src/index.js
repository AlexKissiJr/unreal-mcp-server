// Using dynamic imports to avoid package.json exports issues
const path = require('path');

// Direct paths to modules
const serverPath = path.join(__dirname, '../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js');
const stdioPath = path.join(__dirname, '../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');

// Import the modules directly
const { Server } = require(serverPath);
const { StdioServerTransport } = require(stdioPath);

// Use dynamic imports to avoid issues with package.json exports
const importSDK = async () => {
  return await import('@modelcontextprotocol/sdk');
};

// Import health check functionality
const { checkHealth } = require('./health');

// Import logger utility
const logger = require('./utils/logger');

// Import utilities
const connectionManager = require('./utils/connection-manager');
const TcpServerTransport = require('./utils/tcp-transport');

// Safe handler wrapper for tool handlers to prevent server crashes
const safeHandler = (handler) => {
  return async (inputs, context) => {
    try {
      logger.debug(`Tool handler called with inputs: ${JSON.stringify(inputs)}`);
      const result = await handler(inputs, context);
      return result;
    } catch (error) {
      logger.error(`Error in tool handler: ${error.message}`);
      return { error: error.message };
    }
  };
};

// Tool definitions
const echoTool = {
  name: 'echo',
  description: 'Echo the input text back to the caller',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to echo'
      }
    },
    required: ['text']
  }
};

const getTimeTool = {
  name: 'get_time',
  description: 'Get the current time in various formats',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Format of the time to return',
        enum: ['iso', 'unix', 'human'],
        default: 'iso'
      }
    }
  }
};

const unrealInfoTool = {
  name: 'unreal_info',
  description: 'Get information about the Unreal Engine integration',
  inputSchema: {
    type: 'object',
    properties: {
      detail: {
        type: 'string',
        description: 'Type of information to retrieve',
        enum: ['version', 'system', 'connectivity', 'all'],
        default: 'all'
      }
    }
  }
};

const serverStatusTool = {
  name: 'server_status',
  description: 'Get current status of the MCP server',
  inputSchema: {
    type: 'object',
    properties: {
      includeMemory: {
        type: 'boolean',
        description: 'Include memory usage in the status report',
        default: false
      },
      includeConnections: {
        type: 'boolean',
        description: 'Include client connection information',
        default: true
      }
    }
  }
};

// Tool handlers
const echo = safeHandler(async (inputs) => {
  return { result: inputs.text };
});

const getTime = safeHandler(async (inputs) => {
  const now = new Date();
  
  switch (inputs.format) {
    case 'unix':
      return { result: Math.floor(now.getTime() / 1000) };
    case 'human':
      return { result: now.toLocaleString() };
    case 'iso':
    default:
      return { result: now.toISOString() };
  }
});

const unrealInfo = safeHandler(async (inputs) => {
  const info = {
    version: {
      mcp_server: '1.0.0',
      sdk_version: '1.7.0',
      protocol_version: '0.1',
    },
    system: {
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    connectivity: {
      status: connectionManager.hasConnections() ? 'online' : 'waiting',
      transport: 'tcp',
      port: process.env.PORT || 13378,
      activeConnections: connectionManager.getConnectionCount(),
      timestamp: new Date().toISOString()
    }
  };
  
  switch (inputs.detail) {
    case 'version':
      return { result: info.version };
    case 'system':
      return { result: info.system };
    case 'connectivity':
      return { result: info.connectivity };
    case 'all':
    default:
      return { result: info };
  }
});

const serverStatus = safeHandler(async (inputs) => {
  const status = {
    status: connectionManager.hasConnections() ? 'connected' : 'waiting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    transport: 'tcp',
    port: process.env.PORT || 13378,
    node_version: process.version,
    activeConnections: connectionManager.getConnectionCount()
  };
  
  if (inputs.includeMemory) {
    status.memory = process.memoryUsage();
  }
  
  if (inputs.includeConnections) {
    status.connections = connectionManager.getConnections();
  }
  
  return { result: status };
});

// Create the server
const server = new Server({
  tools: [echoTool, getTimeTool, unrealInfoTool, serverStatusTool],
  handlers: {
    // Echo tool handler
    echo: echo,
    
    // Get time tool handler
    get_time: getTime,
    
    // Unreal info tool handler
    unreal_info: unrealInfo,
    
    // Server status tool handler
    server_status: serverStatus,
  },
});

// Keep server alive and provide status updates
const setupMonitoring = () => {
  // Server status logging
  const statusInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60', 10) * 1000;
  
  if (statusInterval > 0) {
    setInterval(() => {
      logger.debug('Running periodic health check');
      checkHealth();
      
      // Log connection status
      const status = connectionManager.getStatus();
      logger.debug(`Active connections: ${status.activeConnections}`);
      if (status.activeConnections > 0) {
        logger.debug('Connected clients:', status.connections);
      }
    }, statusInterval);
  }
  
  // Basic keep-alive mechanism
  setInterval(() => {
    logger.debug('Server still running...');
  }, 60000); // Log every minute
  
  // Listen for connection events
  connectionManager.on('connection', (connection) => {
    logger.info(`Client connected: ${connection.address}:${connection.port}`);
  });
  
  connectionManager.on('disconnection', (connection) => {
    logger.info(`Client disconnected: ${connection.address}:${connection.port}`);
  });
};

// Prevent unhandled promise rejections from crashing application
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  // Do not exit the process
});

// Handle SIGTERM without exiting (for graceful shutdown in containers)
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Preparing for graceful shutdown...');
  // We won't call process.exit() to keep the server running
});

// Main function to start the server
async function main() {
  logger.start();
  
  try {
    const sdk = await importSDK();
    const { McpServer, McpToolRegistry } = sdk;
    
    // Create tool registry and register tools
    const toolRegistry = new McpToolRegistry();
    toolRegistry.registerTool(echoTool, echo);
    toolRegistry.registerTool(getTimeTool, getTime);
    toolRegistry.registerTool(unrealInfoTool, unrealInfo);
    toolRegistry.registerTool(serverStatusTool, serverStatus);
    
    logger.info('Registered tools:', toolRegistry.listTools().map(t => t.name).join(', '));
    
    // Initialize server with proper error handling
    try {
      const server = new McpServer(toolRegistry);
      const transport = new TcpServerTransport(process.env.PORT || 13378);
      
      // Connect with the transport but don't exit on error
      logger.info('Starting TCP server...');
      
      await transport.connect().catch(error => {
        logger.error(`Connection error: ${error.message}`);
        logger.info('Server will continue running despite connection issue.');
        // No process.exit() here to keep server alive
      });
      
      await server.connect(transport).catch(error => {
        logger.error(`MCP server error: ${error.message}`);
        logger.info('Server will continue running despite connection issue.');
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
    logger.error(`Failed to import SDK: ${error.message}`);
    logger.error('Server cannot start without SDK.');
  }
}

// Export handlers for testing
module.exports = {
  echo,
  getTime,
  unrealInfo,
  serverStatus
};

// Start the server
main(); 