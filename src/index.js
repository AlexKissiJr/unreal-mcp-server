import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import net from 'net';
import debug from 'debug';

// Initialize environment variables
dotenv.config();

const log = debug('smithery:github');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Tool definitions
const tools = {
  search_repositories: {
    name: 'search_repositories',
    description: 'Search for GitHub repositories',
    category: 'github',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (see GitHub search syntax)' },
        page: { type: 'number', description: 'Page number for pagination (default: 1)' },
        perPage: { type: 'number', description: 'Number of results per page (default: 30, max: 100)' }
      },
      required: ['query']
    },
    handler: async ({ query, page = 1, perPage = 30 }) => {
      try {
        const response = await octokit.search.repos({
          q: query,
          page,
          per_page: perPage
        });
        return response.data;
      } catch (error) {
        log('Error searching repositories:', error);
        throw error;
      }
    }
  },
  create_repository: {
    name: 'create_repository',
    description: 'Create a new GitHub repository in your account',
    category: 'github',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Repository name' },
        description: { type: 'string', description: 'Repository description' },
        private: { type: 'boolean', description: 'Whether the repository should be private' },
        autoInit: { type: 'boolean', description: 'Initialize with README.md' }
      },
      required: ['name']
    },
    handler: async ({ name, description = '', private: isPrivate = false, autoInit = false }) => {
      try {
        const response = await octokit.repos.createForAuthenticatedUser({
          name,
          description,
          private: isPrivate,
          auto_init: autoInit
        });
        return response.data;
      } catch (error) {
        log('Error creating repository:', error);
        throw error;
      }
    }
  }
};

// Server setup
const server = net.createServer((socket) => {
  log('Client connected');

  socket.on('data', async (data) => {
    try {
      const request = JSON.parse(data.toString());
      log('Received request:', request);

      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        throw new Error('Invalid JSON-RPC version');
      }

      const tool = tools[request.method];
      if (!tool) {
        throw new Error(`Method ${request.method} not found`);
      }

      const response = {
        jsonrpc: '2.0',
        id: request.id
      };

      try {
        response.result = await tool.handler(request.params || {});
      } catch (error) {
        response.error = {
          code: -32000,
          message: error.message
        };
      }

      socket.write(JSON.stringify(response) + '\n');
    } catch (error) {
      log('Error processing request:', error);
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
  });

  socket.on('end', () => {
    log('Client disconnected');
  });

  socket.on('error', (error) => {
    log('Socket error:', error);
  });
});

const PORT = process.env.PORT || 13378;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 