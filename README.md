# Model Context Protocol Server for Smithery

[![smithery badge](https://smithery.ai/badge/@AlexKissiJr/unreal-mcp-server)](https://smithery.ai/server/@AlexKissiJr/unreal-mcp-server)

This is a robust Model Context Protocol (MCP) server designed to be deployed on Smithery. It's specifically configured for integration with Unreal Engine applications via the UnrealMCP plugin.

## Features

- Robust error handling that prevents server crashes
- Health check mechanism for deployment stability
- Configurable debug logging via Smithery configuration
- Compatible with Unreal Engine's MCP client

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

# Enable debug logging
DEBUG=true npm run dev
```

## Deployment on Smithery

This server is configured to be deployed on [Smithery](https://smithery.ai/docs/deployments).

1. Fork or clone this repository
2. Push your changes to a public repository
3. Use the Smithery UI to add this server, providing the repository URL
4. Enable the "debug" option in Smithery if you need verbose logging

The server uses the STDIO transport which is compatible with Smithery's WebSocket deployment.

## Troubleshooting

If you encounter the "client closed" error:
1. Check the Smithery logs for specific error messages
2. Ensure that port 13377 is not being used by another application
3. Enable the "debug" option in Smithery configuration to get more detailed logs

## Unreal Engine Integration

To integrate with Unreal Engine:
1. Ensure the UnrealMCP plugin is correctly installed and configured
2. Make sure the plugin is configured to connect to the same port as your MCP server
3. Use the MCP tools provided by this server from within your Unreal Engine project

## License

MIT 
