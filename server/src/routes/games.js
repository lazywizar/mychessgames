const express = require('express');
const router = express.Router();
const multer = require('multer');
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

        res.json(games.map(game => game.toAPI()));
    } catch (error) {
        logger.error(`Error fetching games: ${error.message}`);
        res.status(500).json({ error: 'Error fetching games' });
    }
});

// Upload a PGN file
router.post('/upload', auth, upload.single('pgnFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const pgnContent = req.file.buffer.toString();
        
        // Basic validation
        if (!pgnContent.trim()) {
            return res.status(400).json({ error: 'PGN file is empty' });
        }

        // Create game document
        const game = new Game({
            user: req.user._id,
            pgn: pgnContent,
            // Other fields will be set to their defaults
        });

        await game.save();
        logger.info(`Successfully uploaded PGN for user: ${req.user.username}`);
        
        res.status(201).json(game.toAPI());
    } catch (error) {
        logger.error(`Error uploading PGN: ${error.message}`);
        res.status(500).json({ error: 'Error uploading PGN file' });
    }
});

module.exports = router;
