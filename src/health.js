/**
 * Health check script for the MCP server
 * This script can be used to verify that the server is operational
 */

// Simple health check that reports server status
const checkHealth = () => {
  try {
    // Check if Node.js environment is functioning
    const uptime = process.uptime();
    
    // Basic self-diagnostics
    const healthInfo = {
      status: 'healthy',
      uptime: `${uptime.toFixed(2)} seconds`,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      node_version: process.version
    };
    
    console.log(JSON.stringify(healthInfo, null, 2));
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Run health check if called directly
if (require.main === module) {
  const isHealthy = checkHealth();
  process.exit(isHealthy ? 0 : 1);
}

module.exports = { checkHealth }; 