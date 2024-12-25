const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Game = require('../models/game');
const logger = require('../utils/logger');
const { Chess } = require('chess.js');
const { processPgnFile } = require('../utils/pgnProcessor');

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

        // Add detailed logging of game data
        logger.info('Game data retrieved:', {
            id: game._id,
            pgn: game.pgn,
            moves: game.moves,
            isBlackMove: game.isBlackMove,
            annotations: game.annotations
        });

        res.json(game.toAPI());
    } catch (error) {
        logger.error(`Error fetching game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error fetching game' });
    }
});

// Delete a game
router.delete('/:id', auth, async (req, res) => {
    try {
        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            logger.error(`Invalid game ID format: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid game ID format' });
        }

        logger.info(`Attempting to delete game ${req.params.id} for user ${req.user.username}`);

        const result = await Game.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!result) {
            logger.warn(`Game not found or unauthorized: ${req.params.id}`);
            return res.status(404).json({ error: 'Game not found or unauthorized' });
        }

        logger.info(`Successfully deleted game ${req.params.id}`);
        res.status(200).json({ message: 'Game deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error deleting game' });
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
        if (!Array.isArray(annotations)) {
            logger.error('Invalid annotations format: not an array');
            return res.status(400).json({ error: 'Annotations must be an array' });
        }

        logger.info(`Updating annotations for game ${req.params.id}`);

        const game = await Game.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!game) {
            logger.warn(`Game not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Game not found' });
        }

        // Process each annotation to ensure it has required fields
        const processedAnnotations = annotations.map(ann => {
            // If the annotation already has all required fields, use it as is
            if (ann.move && ann.moveNumber !== undefined && ann.isBlackMove !== undefined) {
                return ann;
            }

            // Get the move from the game's moves array
            const moves = game.moves.split(' ').filter(m => m.trim());
            const move = moves[ann.moveNumber] || 'Unknown';

            return {
                ...ann,
                move,
                moveNumber: ann.moveNumber,
                comment: ann.comment || '',
                nags: ann.nags || [],
                variations: ann.variations || [],
                isBlackMove: ann.isBlackMove
            };
        });

        game.annotations = processedAnnotations;
        await game.save();

        logger.info(`Successfully updated annotations for game ${req.params.id}`, {
            annotationCount: processedAnnotations.length,
            annotations: processedAnnotations
        });

        res.json(game.toAPI());
    } catch (error) {
        logger.error(`Error updating annotations for game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error updating annotations' });
    }
});

// Download game PGN
router.get('/:id/pgn', auth, async (req, res) => {
    try {
        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            logger.error(`Invalid game ID format: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid game ID format' });
        }

        logger.info(`Fetching PGN for game ${req.params.id}`);

        const game = await Game.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!game) {
            logger.warn(`Game not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Game not found' });
        }

        // Generate current date for PGN header
        const currentDate = new Date().toISOString().split('T')[0];

        // Use the stored PGN directly
        let pgn = game.pgn;

        // Set headers for file download
        res.setHeader('Content-Type', 'application/x-chess-pgn');
        res.setHeader('Content-Disposition', `attachment; filename="${game.white}_vs_${game.black}_${currentDate}.pgn"`);

        logger.info(`Successfully generated PGN for game ${req.params.id}`);
        res.send(pgn);
    } catch (error) {
        logger.error(`Error generating PGN for game ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: 'Error generating PGN' });
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
        logger.info(`Processing PGN upload for user ${req.user.username}`);

        const { processedGames, errors, summary } = processPgnFile(pgnContent);

        if (processedGames.length === 0) {
            logger.error('PGN upload failed - No valid games found', summary);
            return res.status(400).json({
                error: 'No valid games found in PGN file',
                details: errors
            });
        }

        // Save processed games to database
        const savedGames = [];
        for (const gameData of processedGames) {
            try {
                const game = new Game({
                    user: req.user._id,
                    ...gameData
                });
                await game.save();
                savedGames.push(game.toAPI());
                logger.info(`Successfully saved game to database (ID: ${game._id})`);
            } catch (error) {
                logger.error(`Error saving game to database: ${error.message}`, {
                    error: error.stack
                });
                errors.push(`Database error: ${error.message}`);
            }
        }

        logger.info('PGN upload completed successfully', {
            ...summary,
            savedGames: savedGames.length,
            username: req.user.username
        });

        res.status(201).json({
            message: `Successfully uploaded ${savedGames.length} games${errors.length ? ` with ${errors.length} errors` : ''}`,
            games: savedGames,
            errors: errors.length ? errors : undefined,
            summary: {
                totalGames: summary.totalGames,
                savedGames: savedGames.length,
                failedGames: errors.length
            }
        });
    } catch (error) {
        logger.error(`Error uploading PGN: ${error.message}`, {
            error: error.stack,
            username: req.user.username
        });
        res.status(500).json({ error: 'Error uploading PGN file' });
    }
});

module.exports = router;
