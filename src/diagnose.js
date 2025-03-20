/**
 * Self-diagnostic script for the MCP server
 * This script checks if the server can run properly
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Import logger
const logger = require('./utils/logger');

// Run diagnostics
async function runDiagnostics() {
  logger.info('Starting MCP server diagnostics...');
  
  const results = {
    platform: {
      status: 'OK',
      details: {}
    },
    dependencies: {
      status: 'unknown',
      details: {}
    },
    permissions: {
      status: 'unknown',
      details: {}
    },
    network: {
      status: 'unknown',
      details: {}
    }
  };
  
  // Check platform
  results.platform.details = {
    os: os.platform(),
    release: os.release(),
    node: process.version,
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    freemem: `${Math.round(os.freemem() / (1024 * 1024))} MB`
  };
  
  // Check dependencies
  try {
    // Read package.json
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    results.dependencies.details.packageJson = 'Found';
    
    // Check if we can import SDK
    try {
      const { McpServer } = await import('@modelcontextprotocol/sdk');
      results.dependencies.details.sdk = 'Loaded successfully';
      results.dependencies.status = 'OK';
    } catch (err) {
      results.dependencies.details.sdk = `Error: ${err.message}`;
      results.dependencies.status = 'ERROR';
    }
  } catch (err) {
    results.dependencies.details.packageJson = `Error: ${err.message}`;
    results.dependencies.status = 'ERROR';
  }
  
  // Check file permissions
  try {
    const testFile = path.join(os.tmpdir(), 'mcp-test-file.txt');
    fs.writeFileSync(testFile, 'test');
    fs.readFileSync(testFile);
    fs.unlinkSync(testFile);
    results.permissions.details.fileIO = 'OK';
    results.permissions.status = 'OK';
  } catch (err) {
    results.permissions.details.fileIO = `Error: ${err.message}`;
    results.permissions.status = 'ERROR';
  }
  
  // Check stdio access
  try {
    process.stdout.write('');
    process.stderr.write('');
    results.permissions.details.stdio = 'OK';
  } catch (err) {
    results.permissions.details.stdio = `Error: ${err.message}`;
    results.permissions.status = 'ERROR';
  }
  
  // Overall status
  const overall = Object.values(results).every(r => r.status === 'OK') ? 'PASS' : 'FAIL';
  
  logger.info(`Diagnostics complete. Status: ${overall}`);
  console.log(JSON.stringify(results, null, 2));
  
  return {
    status: overall,
    results
  };
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics().then(result => {
    process.exit(result.status === 'PASS' ? 0 : 1);
  });
}

module.exports = { runDiagnostics }; 