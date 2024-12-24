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

    // Save original moves section with annotations
    const originalMoves = movesSection;

    // Extract variations and comments using regex
    const variations = [];
    let currentMoveNumber = 0;

    // Remove comments temporarily to process moves
    const pgnWithoutComments = processedPgn.replace(/\{[^}]*\}/g, '');

    function findVariations(pgn) {
        let depth = 0;
        let variationStart = -1;
        const vars = [];
        let mainLineTokens = [];  // Keep track of main line moves

        // Helper to clean up move text
        const cleanMove = move => move.replace(/[()]/g, '').trim();

        // Split into tokens but preserve "..." in black moves
        const tokens = pgn.split(/(\s+|\(|\))/)
            .filter(t => t && !t.match(/^\s*$/))
            .map(t => t.trim());

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token === '(') {
                if (depth === 0) {
                    // Find the last black move in the main line
                    let lastMainMove = null;
                    let lastMoveNumber = 0;

                    for (let j = mainLineTokens.length - 1; j >= 0; j--) {
                        const t = mainLineTokens[j];
                        if (!t.match(/^[\d.()]+$/) && !t.includes('...')) {
                            // Found a move
                            if (lastMainMove === null) {
                                lastMainMove = cleanMove(t);
                                // Look back for the move number
                                for (let k = j; k >= 0; k--) {
                                    if (mainLineTokens[k].match(/^\d+\./)) {
                                        lastMoveNumber = parseInt(mainLineTokens[k]);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    variationStart = i;
                    vars.push({
                        moveNumber: lastMoveNumber,
                        move: lastMainMove,
                        startIndex: i
                    });
                }
                depth++;
            } else if (token === ')') {
                depth--;
                if (depth === 0 && variationStart !== -1) {
                    const varInfo = vars.find(v => v.startIndex === variationStart);
                    if (varInfo) {
                        const variationTokens = tokens.slice(variationStart + 1, i);
                        const content = variationTokens
                            .map(t => {
                                if (t.match(/^\d+\.\.\./)) {
                                    return t.replace(/^\d+\.\.\.\s*/, '');
                                }
                                return t;
                            })
                            .filter(t => {
                                if (t === '(' || t === ')') return false;
                                if (t === '...') return false;
                                return true;
                            })
                            .join(' ')
                            .trim();

                        varInfo.content = content;
                    }
                    variationStart = -1;
                }
            } else if (depth === 0 && !token.match(/^\s*$/)) {
                // Keep track of main line moves
                mainLineTokens.push(token);
            }
        }

        return vars.filter(v => v.content).map(v => ({
            moveNumber: v.moveNumber,
            content: v.content,
            move: v.move,
            isBlackMove: true
        }));
    }

    const foundVariations = findVariations(pgnWithoutComments);

    foundVariations.forEach(v => {
        // Clean up the variation but preserve the moves
        const cleanedVariation = v.content
            .replace(/\s+/g, ' ')
            .trim();

        variations.push({
            moveNumber: v.moveNumber,
            variation: cleanedVariation,
            move: v.move,
            isBlackMove: true
        });
    });

    // Process comments
    const comments = [];
    let commentMatch;
    const commentRegex = /\{([^}]*)\}/g;

    while ((commentMatch = commentRegex.exec(processedPgn)) !== null) {
        const beforeComment = processedPgn.slice(0, commentMatch.index);
        const moveCount = (beforeComment.match(/\d+\./g) || []).length;

        comments.push({
            moveNumber: moveCount,
            comment: commentMatch[1].trim()
        });
    }

    // Process NAGs (!, ?, !!, ??, !?, ?!, ⩲, etc.)
    const nags = [];
    const nagRegex = /\$\d+|\!+|\?+|\!\?|\?\!/g;
    let nagMatch;

    while ((nagMatch = nagRegex.exec(processedPgn)) !== null) {
        const beforeNag = processedPgn.slice(0, nagMatch.index);
        const moveCount = (beforeNag.match(/\d+\./g) || []).length;

        nags.push({
            moveNumber: moveCount,
            nag: nagMatch[0]
        });
    }

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
        // Use original moves section to preserve annotations and formatting
        moves: originalMoves.replace(/\s+/g, ' ').trim(),
        annotations: [
            ...variations.map(v => ({
                moveNumber: v.moveNumber,
                variation: v.variation,
                move: v.move,
                isBlackMove: v.isBlackMove
            })),
            ...comments.map(c => ({
                moveNumber: c.moveNumber,
                comment: c.comment
            })),
            ...nags.map(n => ({
                moveNumber: n.moveNumber,
                nag: n.nag
            }))
        ]
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
