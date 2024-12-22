const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
            (info) => `${info.timestamp} ${info.level}: ${info.message}`
        ),
    ),
    transports: [
        // Console transport
        new winston.transports.Console(),
        
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
        }),
        
        // Write all logs to combined.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log') 
        }),
    ],
});

// Create a stream object with a write function that will be used by morgan
const stream = {
    write: (message) => logger.http(message.trim()),
};

module.exports = {
    logger,
    stream,
};
