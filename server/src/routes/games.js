const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Game = require('../models/game');
const logger = require('../utils/logger');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all games for a user
router.get('/', auth, async (req, res) => {
    try {
        const games = await Game.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        logger.info(`Fetched ${games.length} games for user: ${req.user.username}`);
        res.json(games.map(game => game.toAPI()));
    } catch (error) {
        logger.error(`Error fetching games: ${error.message}`);
        res.status(500).json({ error: 'Error fetching games' });
    }
});

// Get a specific game by ID
router.get('/:id', auth, async (req, res) => {
    try {
        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            logger.error(`Invalid game ID format: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid game ID format' });
        }

        logger.info(`Fetching game ${req.params.id} for user ${req.user.username}`);
        
        const game = await Game.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!game) {
            logger.warn(`Game not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Game not found' });
        }

        logger.info(`Successfully fetched game ${req.params.id}`);
        res.json(game.toAPI());
    } catch (error) {
        logger.error(`Error fetching game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error fetching game' });
    }
});

// Update game annotations
router.patch('/:id/annotations', auth, async (req, res) => {
    try {
        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            logger.error(`Invalid game ID format: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid game ID format' });
        }

        const { annotations } = req.body;
        logger.info(`Updating annotations for game ${req.params.id}`);

        const game = await Game.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!game) {
            logger.warn(`Game not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Game not found' });
        }

        game.annotations = annotations;
        await game.save();

        logger.info(`Successfully updated annotations for game ${req.params.id}`);
        res.json(game.toAPI());
    } catch (error) {
        logger.error(`Error updating annotations for game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error updating annotations' });
    }
});

// Upload a PGN file
router.post('/upload', auth, upload.single('pgn'), async (req, res) => {
    try {
        if (!req.file) {
            logger.warn('No file uploaded in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const pgnContent = req.file.buffer.toString();

        // Basic validation
        if (!pgnContent.trim()) {
            logger.warn('Empty PGN file uploaded');
            return res.status(400).json({ error: 'PGN file is empty' });
        }

        // Create game document
        const game = new Game({
            user: req.user._id,
            pgn: pgnContent
        });

        await game.save();
        logger.info(`Successfully uploaded PGN for user ${req.user.username}, game ID: ${game._id}`);

        res.status(201).json(game.toAPI());
    } catch (error) {
        logger.error(`Error uploading PGN: ${error.message}`);
        res.status(500).json({ error: 'Error uploading PGN file' });
    }
});

module.exports = router;
