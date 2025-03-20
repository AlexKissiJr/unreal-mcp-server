/**
 * Health check script for the MCP server
 * This script can be used to verify that the server is operational
 */

import logger from './utils/logger.js';

/**
 * Starts periodic health checks
 * @param {number} interval - Interval in seconds between checks
 */
export function startHealthChecks(interval = 60) {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    logger.info('Health check', {
      memory: {
        heapUsed: `${heapUsed}MB`,
        heapTotal: `${heapTotal}MB`,
        percentage: `${Math.round((heapUsed / heapTotal) * 100)}%`
      }
    });
  }, interval * 1000);
}

// If run directly, start health checks
if (import.meta.url === `file://${process.argv[1]}`) {
  startHealthChecks();
} 