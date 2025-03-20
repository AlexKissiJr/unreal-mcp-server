# Model Context Protocol Server for Smithery

This is a simple Model Context Protocol (MCP) server that can be deployed on Smithery. It provides basic tools for demonstrating MCP functionality.

## Available Tools

### Echo

Echoes back the input text.

**Input Schema:**
```json
{
  "text": "Text to echo back"
}
```

**Example Response:**
```json
{
  "result": "Text to echo back"
}
```

### Get Time

Returns the current time in various formats.

**Input Schema:**
```json
{
  "format": "iso" // Optional, can be "iso", "unix", or "human"
}
```

**Example Response (iso format):**
```json
{
  "result": "2025-04-15T18:30:25.123Z"
}
```

## Local Development

To run the server locally:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build and run in production mode
npm run build
npm start
```

## Deployment on Smithery

This server is configured to be deployed on [Smithery](https://smithery.ai/docs/deployments).

1. Fork or clone this repository
2. Push your changes to a public repository
3. Use the Smithery UI to add this server, providing the repository URL

The server uses the STDIO transport which is compatible with Smithery's WebSocket deployment.

## License

MIT 