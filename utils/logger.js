const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the 'logs' directory exists (create it if it doesn't)
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Define the full path to the log file
const logFilePath = path.join(logDirectory, 'app.log');

// Create a Winston logger instance
const logger = winston.createLogger({
  level: 'info', // Minimum level to log (e.g., 'info', 'warn', 'error')
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamp to each log
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`; // Custom log format
    })
  ),
  transports: [
    // Output logs to the console with colors
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // Also write logs to a file
    new winston.transports.File({ filename: logFilePath }),
  ],
});

// Export the logger to be used throughout the application
module.exports = logger;
