/**
 * Simple test client for the MCP server
 * This can be used to verify that the server is operational
 */

// This test doesn't use TCP but instead directly interacts with the MCP server tools
// to verify they are working correctly

// Import logger for consistent output
const logger = require('./utils/logger');

// Check all tools
async function testTools() {
  logger.info('Testing MCP tools...');
  
  try {
    // Import tool handlers
    const { echo, getTime, unrealInfo, serverStatus } = require('./index');
    
    // Test echo tool
    logger.info('Testing echo tool...');
    const echoResult = await echo({ text: 'Test message' });
    if (echoResult.result !== 'Test message') {
      throw new Error(`Echo tool failed: ${JSON.stringify(echoResult)}`);
    }
    logger.info('Echo tool test: PASSED');
    
    // Test get_time tool
    logger.info('Testing get_time tool...');
    const timeResult = await getTime({ format: 'unix' });
    if (!timeResult.result || typeof timeResult.result !== 'number') {
      throw new Error(`Get time tool failed: ${JSON.stringify(timeResult)}`);
    }
    logger.info('Get time tool test: PASSED');
    
    // Test unreal_info tool
    logger.info('Testing unreal_info tool...');
    const unrealResult = await unrealInfo({ detail: 'version' });
    if (!unrealResult.result || !unrealResult.result.mcp_server) {
      throw new Error(`Unreal info tool failed: ${JSON.stringify(unrealResult)}`);
    }
    logger.info('Unreal info tool test: PASSED');
    
    // Test server_status tool
    logger.info('Testing server_status tool...');
    const statusResult = await serverStatus({ includeMemory: true });
    if (!statusResult.result || !statusResult.result.status) {
      throw new Error(`Server status tool failed: ${JSON.stringify(statusResult)}`);
    }
    logger.info('Server status tool test: PASSED');
    
    logger.info('All tools tested successfully!');
    return true;
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  testTools().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testTools }; 