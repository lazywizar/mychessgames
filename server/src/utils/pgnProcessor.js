const { Chess } = require('chess.js');
const logger = require('./logger');

/**
 * Process and validate a PGN game string
 * @param {string} gamePgn - The PGN content for a single game
 * @param {number} gameIndex - The index of the game (for logging)
 * @returns {Object} The processed game data
 * @throws {Error} If the PGN is invalid
 */
const processGame = (gamePgn, gameIndex) => {
    if (!gamePgn.trim()) {
        throw new Error('Empty game content');
    }

    logger.debug(`Processing game ${gameIndex + 1} PGN content:\n${gamePgn.trim()}`);

    // Ensure PGN has required headers
    if (!gamePgn.includes('[Event "')) {
        throw new Error('Invalid PGN format: Missing Event header');
    }

    // Fix PGN format - ensure proper line breaks between headers and moves
    const lines = gamePgn.trim().split('\n');
    const headers = [];
    let movesSection = '';
    let isInMoves = false;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('[')) {
            if (isInMoves) {
                throw new Error('Invalid PGN format: Headers found after moves');
            }
            headers.push(trimmedLine);
        } else {
            isInMoves = true;
            movesSection += (movesSection ? ' ' : '') + trimmedLine;
        }
    }

    if (!movesSection) {
        throw new Error('Invalid PGN format: No moves found');
    }

    // Reconstruct PGN with proper formatting
    const processedPgn = headers.join('\n') + '\n\n' + movesSection;

    const chess = new Chess();
    try {
        chess.loadPgn(processedPgn);
    } catch (error) {
        logger.error(`Chess.js error loading PGN: ${error.message}`, {
            processedPgn,
            originalPgn: gamePgn
        });
        throw new Error(`Invalid PGN format: ${error.message}`);
    }

    // Get headers directly from chess.js
    const parsedHeaders = chess.header();

    return {
        event: parsedHeaders.Event || 'Casual Game',
        site: parsedHeaders.Site || 'Unknown',
        date: parsedHeaders.Date ? new Date(parsedHeaders.Date.replace(/\?/g, '01')) : null,
        round: parsedHeaders.Round || '-',
        white: parsedHeaders.White || 'Unknown',
        black: parsedHeaders.Black || 'Unknown',
        result: parsedHeaders.Result || '*',
        eco: parsedHeaders.ECO || null,
        whiteElo: parsedHeaders.WhiteElo ? parseInt(parsedHeaders.WhiteElo) : null,
        blackElo: parsedHeaders.BlackElo ? parseInt(parsedHeaders.BlackElo) : null,
        timeControl: parsedHeaders.TimeControl || null,
        termination: parsedHeaders.Termination || null,
        pgn: processedPgn,
        moves: movesSection // Store the original moves section with annotations
    };
};

/**
 * Process a PGN file content containing one or more games
 * @param {string} pgnContent - The full PGN file content
 * @returns {Object} Object containing processed games and any errors
 */
const processPgnFile = (pgnContent) => {
    if (!pgnContent.trim()) {
        throw new Error('PGN file is empty');
    }

    // Split PGN content into individual games (split on blank lines between games)
    const games = pgnContent.split(/\n\s*\n\s*\n(?=\[)/);
    logger.info(`Found ${games.length} potential games in PGN file`);

    const processedGames = [];
    const errors = [];

    for (let [index, gamePgn] of games.entries()) {
        try {
            const processedGame = processGame(gamePgn, index);
            processedGames.push(processedGame);
        } catch (error) {
            logger.error(`Error processing game ${index + 1}: ${error.message}`);
            errors.push(`Game ${index + 1}: ${error.message}`);
        }
    }

    return {
        processedGames,
        errors,
        summary: {
            totalGames: games.length,
            successfulGames: processedGames.length,
            failedGames: errors.length
        }
    };
};

module.exports = {
    processGame,
    processPgnFile
};
