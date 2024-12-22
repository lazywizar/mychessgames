const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { logger } = require('./utils/logger');
require('dotenv').config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    logger.info({
        message: '🔵 Incoming Request',
        method: req.method,
        url: req.url,
        origin: req.get('origin'),
        referer: req.get('referer'),
        userAgent: req.get('user-agent'),
        query: req.query,
        headers: {
            'content-type': req.get('content-type'),
            'accept': req.get('accept'),
            'authorization': req.get('authorization') ? 'Present' : 'None'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        timestamp: new Date().toISOString()
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            message: '🟢 Request Completed',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    });

    next();
});

// Request logging middleware
app.use(morgan(':method :url :status :response-time ms', {
    stream: {
        write: (message) => logger.http(message.trim())
    }
}));

// Custom request logging
app.use((req, res, next) => {
    const start = Date.now();
    
    logger.info({
        message: 'Incoming Request',
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers,
        body: req.method !== 'GET' ? req.body : undefined,
        timestamp: new Date().toISOString()
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            message: 'Request Completed',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    });

    next();
});

// Regular middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5003', 'http://localhost:3003'],  
    credentials: true
}));
app.use(passport.initialize());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../../client')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    logger.info('MongoDB connected successfully');
}).catch((err) => {
    logger.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check endpoint
app.get('/health', (req, res) => {
    logger.debug('Health check requested');
    res.json({ 
        status: 'ok',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Handle SPA routing
app.get('*', (req, res, next) => {
    if (!req.url.startsWith('/api')) {
        logger.debug(`Serving index.html for path: ${req.url}`);
        res.sendFile(path.join(__dirname, '../../client/index.html'));
    } else {
        next();
    }
});

// 404 handler
app.use((req, res) => {
    logger.warn({
        message: 'Route not found',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });
    
    res.status(404).json({ 
        message: 'Route not found',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error({
        message: 'Error occurred',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });

    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5003;  
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`Client URL configured as: ${process.env.CLIENT_URL}`);
});
