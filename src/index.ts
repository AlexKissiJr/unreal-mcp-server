// Using require syntax instead of ESM imports
const { Server } = require('@modelcontextprotocol/sdk');
const { stdioTransport } = require('@modelcontextprotocol/sdk/transports/stdio');

// Define our tools
const echoTool = {
  name: 'echo',
  description: 'Echoes back the input text',
  inputSchema: {
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        description: 'The text to echo back',
      },
    },
  },
};

const getTimeTool = {
  name: 'get_time',
  description: 'Returns the current time in various formats',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'The format to return the time in (default: "iso")',
        enum: ['iso', 'unix', 'human'],
      },
    },
  },
};

// Create the server
const server = new Server({
  tools: [echoTool, getTimeTool],
  handlers: {
    // Echo tool handler
    echo: async (params) => {
      const { text } = params;
      return { result: text };
    },
    
    // Get time tool handler
    get_time: async (params) => {
      const { format = 'iso' } = params;
      const now = new Date();
      
      switch (format) {
        case 'unix':
          return { result: Math.floor(now.getTime() / 1000) };
        case 'human':
          return { result: now.toLocaleString() };
        case 'iso':
        default:
          return { result: now.toISOString() };
      }
    },
  },
});

// Start the server with STDIO transport
console.error('Starting MCP server with STDIO transport...');
stdioTransport(server).catch((error) => {
  console.error('Error in MCP server:', error);
  process.exit(1);
}); 