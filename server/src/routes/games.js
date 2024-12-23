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
            if (ann.move && ann.moveNumber !== undefined) {
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
                variations: ann.variations || []
            };
        });

        game.annotations = processedAnnotations;
        await game.save();

        logger.info(`Successfully updated annotations for game ${req.params.id}`);
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

        // Construct PGN with updated headers and annotations
        let pgn = `[Event "${game.event}"]\n`;
        pgn += `[Site "${game.site}"]\n`;
        pgn += `[Date "${game.date ? game.date.toISOString().split('T')[0] : '????-??-??'}"]\n`;
        pgn += `[Round "${game.round}"]\n`;
        pgn += `[White "${game.white}"]\n`;
        pgn += `[Black "${game.black}"]\n`;
        pgn += `[Result "${game.result}"]\n`;
        if (game.eco) pgn += `[ECO "${game.eco}"]\n`;
        if (game.whiteElo) pgn += `[WhiteElo "${game.whiteElo}"]\n`;
        if (game.blackElo) pgn += `[BlackElo "${game.blackElo}"]\n`;
        if (game.timeControl) pgn += `[TimeControl "${game.timeControl}"]\n`;
        if (game.termination) pgn += `[Termination "${game.termination}"]\n`;
        pgn += '\n';

        // Add moves with annotations
        const moves = game.moves.split(' ');
        const annotations = game.annotations || [];
        let moveNumber = 1;
        let isWhiteMove = true;

        for (let i = 0; i < moves.length; i++) {
            const annotation = annotations.find(a => a.moveNumber === i);
            
            if (isWhiteMove) {
                pgn += `${moveNumber}. `;
            }
            
            pgn += moves[i];
            
            if (annotation) {
                if (annotation.nags && annotation.nags.length > 0) {
                    pgn += annotation.nags.join('');
                }
                if (annotation.comment) {
                    pgn += ` {${annotation.comment}}`;
                }
                if (annotation.variations && annotation.variations.length > 0) {
                    annotation.variations.forEach(variation => {
                        pgn += ` (${variation})`;
                    });
                }
            }
            
            pgn += ' ';
            
            if (!isWhiteMove) {
                moveNumber++;
            }
            isWhiteMove = !isWhiteMove;
        }

        pgn += game.result;

        // Add general comments at the end if they exist
        if (game.generalComments) {
            pgn += `\n\n{${game.generalComments}}`;
        }

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
