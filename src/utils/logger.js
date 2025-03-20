/**
 * Simple logger utility for the MCP server
 */

// Get the log level from environment or default to 'info'
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.DEBUG === 'true' ? 'debug' : 'info');

// Log levels and their numeric values
const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Current numeric log level
const currentLevel = LEVELS[LOG_LEVEL] || LEVELS.info;

// Format a log message with timestamp and level
const formatMessage = (level, ...messages) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]: ${messages.join(' ')}`;
};

// Logger methods for each level
const logger = {
  error: (...messages) => {
    if (currentLevel >= LEVELS.error) {
      console.error(formatMessage('error', ...messages));
    }
    return messages[0]; // Return the first message for chaining
  },
  
  warn: (...messages) => {
    if (currentLevel >= LEVELS.warn) {
      console.warn(formatMessage('warn', ...messages));
    }
    return messages[0];
  },
  
  info: (...messages) => {
    if (currentLevel >= LEVELS.info) {
      console.log(formatMessage('info', ...messages));
    }
    return messages[0];
  },
  
  debug: (...messages) => {
    if (currentLevel >= LEVELS.debug) {
      console.log(formatMessage('debug', ...messages));
    }
    return messages[0];
  },
  
  // Log the start of the server
  start: () => {
    return logger.info('MCP server starting...');
  },
  
  // Log a successful connection
  connected: () => {
    return logger.info('MCP server connected to transport');
  }
};

export default logger; 