const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5003'],
    credentials: true
}));
app.use(express.json());
app.use(morgan('combined', {
    stream: {
        write: message => logger.info(message.trim())
    }
}));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../../client')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Handle SPA routes - this should be after API routes but before error handling
app.get('/game', (req, res) => {
    const gameId = req.query.id;
    logger.info(`Game route hit with ID: ${gameId}`);

    if (!gameId) {
        logger.warn('No game ID provided, redirecting to dashboard');
        return res.redirect('/dashboard');
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(gameId)) {
        logger.warn(`Invalid game ID format: ${gameId}`);
        return res.redirect('/dashboard');
    }

    res.sendFile(path.join(__dirname, '../../client/game.html'));
});

app.get('/game.html', (req, res) => {
    res.redirect(`/game${req.url.substring(req.url.indexOf('?'))}`);
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.redirect('/dashboard');
});

app.get(['/', '/index', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Catch-all route for any other requests
app.get('*', (req, res) => {
    logger.warn(`404 - Not found: ${req.originalUrl}`);
    res.redirect('/');
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
