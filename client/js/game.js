// Initialize game state
let board = null;
let game = null;
let currentMove = -1;
let moves = [];
let gameData = null;
let annotations = {};  // Store annotations by move number
let variations = {};  // Store variations by move number
let isEditMode = true;

// Debug current URL and search params
console.log('Current URL:', window.location.href);
console.log('Search params:', window.location.search);
console.log('Origin:', window.location.origin);

// Get game ID from URL
const urlParams = new URLSearchParams(window.location.search);
console.log('URL Params object:', urlParams);
console.log('All params:', Array.from(urlParams.entries()));

const gameId = urlParams.get('id');
console.log('Game ID from URL:', gameId);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing game page...');
    console.log('Current pathname:', window.location.pathname);
    console.log('Current URL:', window.location.href);
    console.log('Search string:', window.location.search);
    console.log('URL Params again:', new URLSearchParams(window.location.search));

    const baseUrl = window.location.origin;

    // Check authentication first
    if (!requireAuth()) {
        console.log('Not authenticated, redirecting to index');
        window.location.assign(`${baseUrl}/index.html`);
        return;
    }

    // Validate game ID
    if (!gameId) {
        console.error('No game ID provided');
        console.error('URL at error:', window.location.href);
        alert('No game ID provided');
        window.location.assign(`${baseUrl}/dashboard.html`);
        return;
    }

    // Validate game ID format (MongoDB ObjectId is 24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(gameId)) {
        console.error('Invalid game ID format:', gameId);
        alert('Invalid game ID format');
        window.location.assign(`${baseUrl}/dashboard.html`);
        return;
    }

    try {
        console.log('Starting game load for ID:', gameId);
        await initGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Error loading game: ' + error.message);

        // Only redirect on auth errors or if game is not found
        if (error.message === 'Game not found' ||
            error.message === 'Unauthorized' ||
            error.message === 'Invalid game ID format') {
            window.location.assign(`${baseUrl}/dashboard.html`);
        }
    }
});

async function initGame() {
    console.log('Current URL:', window.location.href);
    console.log('Search string:', window.location.search);
    console.log('URL Params again:', new URLSearchParams(window.location.search));

    const baseUrl = window.location.origin;

    // Check authentication first
    if (!requireAuth()) {
        console.log('Not authenticated, redirecting to index');
        window.location.assign(`${baseUrl}/index.html`);
        return;
    }

    // Validate game ID
    if (!gameId) {
        console.error('No game ID provided');
        window.location.assign(`${baseUrl}/dashboard.html`);
        return;
    }

    try {
        console.log('Starting game load for ID:', gameId);
        await initializeGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Error loading game: ' + error.message);

        // Only redirect on auth errors or if game is not found
        if (error.message === 'Game not found' ||
            error.message === 'Unauthorized' ||
            error.message === 'Invalid game ID format') {
            window.location.assign(`${baseUrl}/dashboard.html`);
        }
    }
}

async function initializeGame() {
    console.log('Fetching game data from API...');
    const token = getToken();

    if (!token) {
        throw new Error('Unauthorized');
    }

    const url = `${CONFIG.API_URL}/games/${gameId}`;
    console.log('Making API request to:', url);

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', response.status, errorData);
        throw new Error(response.status === 404 ? 'Game not found' : 
                       response.status === 401 ? 'Unauthorized' : 
                       'Failed to load game');
    }

    try {
        gameData = await response.json();
        console.log('Game data received:', gameData);

        // Initialize chess.js with the PGN first
        console.log('Initializing chess.js...');
        game = new Chess();

        if (!game.load_pgn(gameData.pgn)) {
            console.error('Failed to load PGN:', gameData.pgn);
            throw new Error('Invalid PGN format');
        }

        // Store initial moves
        moves = game.history();
        console.log('Loaded moves:', moves);

        // Convert annotations and variations
        annotations = {};
        variations = {};
        
        if (gameData.annotations) {
            console.log('Processing annotations:', gameData.annotations);
            
            gameData.annotations.forEach(ann => {
                const moveNumber = parseInt(ann.moveNumber);
                
                if (ann.variation && ann.variation.length > 0) {
                    console.log('Found variation at move', moveNumber, ':', ann.variation);
                    if (!variations[moveNumber]) {
                        variations[moveNumber] = [];
                    }
                    variations[moveNumber].push({
                        moveNumber: moveNumber,
                        move: moves[moveNumber],
                        variation: ann.variation,
                        previousMoves: ann.previousMoves || moves.slice(0, moveNumber),
                        comment: ann.comment || '',
                        nags: ann.nags || []
                    });
                    console.log('Added variation:', variations[moveNumber]);
                } else if (ann.comment || ann.nags?.length > 0) {
                    annotations[moveNumber] = {
                        comment: ann.comment || '',
                        nag: ann.nags?.[0] || ''
                    };
                }
            });
        }

        console.log('Final processed variations:', variations);
        console.log('Final processed annotations:', annotations);

        // Initialize at the starting position
        currentMove = -1;

        // Initialize the board
        console.log('Initializing chessboard...');
        board = Chessboard('board', {
            position: 'start',  // Set to starting position
            draggable: true,
            onDrop: handleMove,
            onDragStart: onDragStart,
            pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg'
        });

        // Setup event handlers
        setupBoardTools();
        setupAnnotationHandlers();
        
        // Initial display
        displayGameInfo();
        displayMoves();
        updateControls();

        console.log('Game initialization complete');
    } catch (error) {
        console.error('Error setting up game:', error);
        throw error;
    }
}

async function saveVariation(variation) {
    try {
        // Keep a copy of current variations
        const currentVariations = JSON.parse(JSON.stringify(variations));

        // Convert current annotations to array format
        const annotationsArray = [];

        // Add regular annotations
        Object.entries(annotations).forEach(([moveNumber, annotation]) => {
            if (annotation.comment || annotation.nag) {
                annotationsArray.push({
                    moveNumber: parseInt(moveNumber),
                    move: moves[moveNumber],
                    comment: annotation.comment || '',
                    nags: annotation.nag ? [annotation.nag] : []
                });
            }
        });

        // Add all existing variations
        Object.entries(variations).forEach(([moveNumber, moveVariations]) => {
            moveVariations.forEach(existingVar => {
                annotationsArray.push({
                    moveNumber: parseInt(moveNumber),
                    move: moves[moveNumber],
                    variation: existingVar.variation,
                    previousMoves: existingVar.previousMoves,
                    comment: existingVar.comment || '',
                    nags: existingVar.nags || []
                });
            });
        });

        // Add the new variation
        annotationsArray.push({
            moveNumber: variation.moveNumber,
            move: moves[variation.moveNumber],
            variation: variation.variation,
            previousMoves: variation.previousMoves,
            comment: variation.comment || '',
            nags: variation.nags || []
        });

        console.log('Saving annotations with variations:', {
            annotations: annotationsArray
        });

        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                annotations: annotationsArray
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error('Failed to save variation: ' + (errorData.message || 'Unknown error'));
        }

        const result = await response.json();
        console.log('Variation saved successfully:', result);
        console.log('Server response annotations:', result.annotations);
        
        // Process server response
        if (result.annotations) {
            // Start fresh
            variations = {};
            annotations = {};
            
            // Process each annotation from server
            result.annotations.forEach(ann => {
                console.log('Processing server annotation:', ann);
                const moveNumber = parseInt(ann.moveNumber);
                
                if (ann.variation && ann.variation.length > 0) {
                    console.log('Found variation in server response at move', moveNumber, ':', ann.variation);
                    if (!variations[moveNumber]) {
                        variations[moveNumber] = [];
                    }
                    variations[moveNumber].push({
                        moveNumber: moveNumber,
                        move: moves[moveNumber],
                        variation: ann.variation,
                        previousMoves: ann.previousMoves || moves.slice(0, moveNumber),
                        comment: ann.comment || '',
                        nags: ann.nags || []
                    });
                    console.log('Updated variations object:', variations);
                } else if (ann.comment || ann.nags?.length > 0) {
                    annotations[moveNumber] = {
                        comment: ann.comment || '',
                        nag: ann.nags?.[0] || ''
                    };
                }
            });
            
            console.log('Final variations after server update:', variations);
        } else {
            // If no annotations in response, keep the current state
            variations = currentVariations;
            if (!variations[variation.moveNumber]) {
                variations[variation.moveNumber] = [];
            }
            variations[variation.moveNumber].push(variation);
            console.log('Using local variations:', variations);
        }
        
        // Update display
        displayMoves();
    } catch (error) {
        console.error('Error saving variation:', error);
        alert('Failed to save variation. The move will be shown but not saved.');
        
        // On error, restore the previous state
        variations = currentVariations;
        if (!variations[variation.moveNumber]) {
            variations[variation.moveNumber] = [];
        }
        variations[variation.moveNumber].push(variation);
        displayMoves();
    }
}

function setupBoardTools() {
    const flipBtn = document.getElementById('flipBtn');
    const analysisBtn = document.getElementById('analysisBtn');
    const editBtn = document.getElementById('editBtn');

    flipBtn.addEventListener('click', () => {
        board.flip();
    });

    editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        editBtn.classList.toggle('active');
        board.draggable = isEditMode;
    });
}

function onDragStart(source, piece) {
    if (!isEditMode) return false;
    
    // Allow moves only from current position
    const moves = game.moves({ verbose: true });
    const validSquares = moves.map(m => m.from);
    return validSquares.includes(source);
}

async function handleMove(source, target) {
    if (!isEditMode) return 'snapback';

    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) return 'snapback';

    console.log('Current move:', currentMove, 'Total moves:', moves.length);

    // If we're not at the end of the game, create a variation
    if (currentMove < moves.length - 1) {
        console.log('Creating variation at move:', currentMove + 1);
        
        // Get the current position's moves up to this point
        const mainLine = moves.slice(0, currentMove + 1);
        
        // Create a new variation
        const variation = {
            moveNumber: currentMove + 1,
            move: moves[currentMove + 1], // The move being varied from
            variation: [move.san],  // Start new variation with this move
            previousMoves: mainLine
        };

        console.log('New variation:', variation);

        // Store locally
        if (!variations[currentMove + 1]) {
            variations[currentMove + 1] = [];
        }
        variations[currentMove + 1].push(variation);

        console.log('All variations:', variations);

        // Save to server
        await saveVariation(variation);
        
        // Update display
        displayMoves();
    } else {
        // Regular move at the end of the game
        moves.push(move.san);
        currentMove++;
        displayMoves();
        updateControls();
    }
}

function setupAnnotationHandlers() {
    const annotationInput = document.getElementById('moveAnnotation');
    const symbolBtns = document.querySelectorAll('.symbol-btn');
    let saveTimeout;

    // Function to save annotations
    async function saveAnnotation(newComment, newNag) {
        // Get existing annotation
        const existingAnnotation = annotations[currentMove] || {};
        
        // Merge new values with existing ones
        const mergedAnnotation = {
            comment: newComment ?? existingAnnotation.comment ?? '',
            nag: newNag ?? existingAnnotation.nag ?? ''
        };
        
        // Convert to array format for server
        const annotationsArray = Object.entries(annotations)
            .filter(([moveNumber]) => moveNumber !== currentMove.toString()) // Exclude current move
            .map(([moveNumber, annotation]) => ({
                moveNumber: parseInt(moveNumber),
                move: moves[moveNumber],
                comment: annotation.comment,
                nags: annotation.nag ? [annotation.nag] : []
            }));
        
        // Add current move's annotation if it has content
        if (mergedAnnotation.comment || mergedAnnotation.nag) {
            annotationsArray.push({
                moveNumber: currentMove,
                move: moves[currentMove],
                comment: mergedAnnotation.comment,
                nags: mergedAnnotation.nag ? [mergedAnnotation.nag] : []
            });
        }
        
        // Sort by move number
        annotationsArray.sort((a, b) => a.moveNumber - b.moveNumber);
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    annotations: annotationsArray
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save annotation');
            }
            
            // Update local annotations object
            if (mergedAnnotation.comment || mergedAnnotation.nag) {
                annotations[currentMove] = mergedAnnotation;
            } else {
                delete annotations[currentMove];
            }
            
            // Update display
            displayMoves();
            
        } catch (error) {
            console.error('Error saving annotation:', error);
            // Don't show alert for auto-save to avoid disrupting the user
        }
    }

    // Handle text annotation input with debounce
    annotationInput.addEventListener('input', () => {
        // Clear any pending save
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // Set new timeout to save after typing stops
        saveTimeout = setTimeout(() => {
            const newComment = annotationInput.value.trim();
            if (newComment !== (annotations[currentMove]?.comment || '')) {
                saveAnnotation(newComment, null);
            }
        }, 1000); // Wait 1 second after typing stops
    });
    
    // Handle quick symbol buttons
    symbolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const symbol = btn.dataset.symbol;
            
            // Toggle symbol
            const currentNag = annotations[currentMove]?.nag || '';
            const newNag = currentNag === symbol ? '' : symbol;
            
            // Update button states
            symbolBtns.forEach(b => {
                b.dataset.selected = b.dataset.symbol === newNag ? 'true' : 'false';
            });
            
            // Save immediately
            saveAnnotation(null, newNag);
        });
    });
}

// Add keyboard navigation
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowRight':
            // Next move
            if (currentMove < moves.length - 1) {
                currentMove++;
                updatePosition();
                displayMoves();
            }
            break;
        case 'ArrowLeft':
            // Previous move
            if (currentMove >= 0) {
                currentMove--;
                updatePosition();
                displayMoves();
            }
            break;
        case 'Home':
            // Go to start
            currentMove = -1;
            updatePosition();
            displayMoves();
            break;
        case 'End':
            // Go to end
            currentMove = moves.length - 1;
            updatePosition();
            displayMoves();
            break;
    }
});

function displayGameInfo() {
    const gameInfo = document.getElementById('gameInfo');
    if (!gameInfo || !gameData) return;

    const info = [];
    if (gameData.event && gameData.event !== 'Casual Game') info.push(`Event: ${gameData.event}`);
    if (gameData.site && gameData.site !== 'Unknown') info.push(`Site: ${gameData.site}`);
    if (gameData.date && gameData.date !== 'Unknown Date') info.push(`Date: ${gameData.date}`);
    if (gameData.white && gameData.white !== 'Unknown') info.push(`White: ${gameData.white}`);
    if (gameData.black && gameData.black !== 'Unknown') info.push(`Black: ${gameData.black}`);
    if (gameData.result) info.push(`Result: ${gameData.result}`);
    if (gameData.eco) info.push(`ECO: ${gameData.eco}`);
    if (gameData.whiteElo) info.push(`White Elo: ${gameData.whiteElo}`);
    if (gameData.blackElo) info.push(`Black Elo: ${gameData.blackElo}`);
    if (gameData.timeControl) info.push(`Time Control: ${gameData.timeControl}`);

    gameInfo.innerHTML = `
        <div class="game-header">
            <div class="game-title">${info.slice(0, 3).join(' • ')}</div>
            <div class="game-players">${info.slice(3).join(' • ')}</div>
        </div>
    `;
}

function displayMoves() {
    console.log('Displaying moves. Current variations:', variations);
    
    const moveList = document.getElementById('moveList');
    moveList.innerHTML = '';

    // Update symbol button states for current move
    const symbolBtns = document.querySelectorAll('.symbol-btn');
    const currentAnnotation = annotations[currentMove];
    symbolBtns.forEach(btn => {
        btn.dataset.selected = (currentAnnotation?.nag === btn.dataset.symbol) ? 'true' : 'false';
    });

    let currentLine = null;

    for (let i = 0; i < moves.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        const isWhite = i % 2 === 0;
        
        if (isWhite) {
            // Create new line for each pair of moves
            currentLine = document.createElement('div');
            currentLine.className = 'move-line';
            
            // Add move number
            const moveNumberCell = document.createElement('div');
            moveNumberCell.className = 'move-number';
            moveNumberCell.textContent = `${moveNumber}.`;
            currentLine.appendChild(moveNumberCell);
            
            // Add white move cell
            const whiteMoveCell = document.createElement('div');
            whiteMoveCell.className = 'move-cell white';
            const whiteMove = createMoveElement(moves[i], i, false);
            whiteMoveCell.appendChild(whiteMove);
            
            // Add comment if exists
            if (annotations[i]?.comment) {
                const comment = document.createElement('span');
                comment.className = 'move-comment';
                comment.textContent = annotations[i].comment;
                whiteMoveCell.appendChild(comment);
            }
            
            currentLine.appendChild(whiteMoveCell);
            
            // Create empty black move cell
            const blackMoveCell = document.createElement('div');
            blackMoveCell.className = 'move-cell black';
            currentLine.appendChild(blackMoveCell);
            
            moveList.appendChild(currentLine);
        } else {
            // Add black move to the current line
            if (currentLine) {
                const blackMoveCell = currentLine.querySelector('.move-cell.black');
                const blackMove = createMoveElement(moves[i], i, false);
                blackMoveCell.appendChild(blackMove);
                
                // Add comment if exists
                if (annotations[i]?.comment) {
                    const comment = document.createElement('span');
                    comment.className = 'move-comment';
                    comment.textContent = annotations[i].comment;
                    blackMoveCell.appendChild(comment);
                }
            }
        }

        // Add variations if they exist
        if (variations[i]) {
            variations[i].forEach(variation => {
                const variationDiv = document.createElement('div');
                variationDiv.className = 'move-tree';
                
                // Create a line for the variation
                const variationLine = document.createElement('div');
                variationLine.className = 'variation-line';
                
                if (variation.variation && variation.variation.length > 0) {
                    let varCurrentLine = null;
                    
                    variation.variation.forEach((move, idx) => {
                        const varMoveNumber = Math.floor((i + idx) / 2) + 1;
                        const isVarWhite = (i + idx) % 2 === 0;
                        
                        if (isVarWhite) {
                            varCurrentLine = document.createElement('div');
                            varCurrentLine.className = 'move-line';
                            
                            // Add variation move number
                            const varNumberCell = document.createElement('div');
                            varNumberCell.className = 'move-number';
                            varNumberCell.textContent = `${varMoveNumber}.`;
                            varCurrentLine.appendChild(varNumberCell);
                            
                            // Add white move
                            const varWhiteCell = document.createElement('div');
                            varWhiteCell.className = 'move-cell white';
                            const varWhiteMove = createMoveElement(move, i, true);
                            varWhiteCell.appendChild(varWhiteMove);
                            varCurrentLine.appendChild(varWhiteCell);
                            
                            // Add empty black cell
                            const varBlackCell = document.createElement('div');
                            varBlackCell.className = 'move-cell black';
                            varCurrentLine.appendChild(varBlackCell);
                            
                            variationLine.appendChild(varCurrentLine);
                        } else if (varCurrentLine) {
                            // Add black move to current variation line
                            const varBlackCell = varCurrentLine.querySelector('.move-cell.black');
                            const varBlackMove = createMoveElement(move, i, true);
                            varBlackCell.appendChild(varBlackMove);
                        }
                    });
                }

                variationDiv.appendChild(variationLine);
                moveList.appendChild(variationDiv);
            });
        }
    }

    // Scroll active move into view
    const activeMove = moveList.querySelector('.move.active');
    if (activeMove) {
        activeMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function createMoveElement(move, index, isVariation = false) {
    const moveElement = document.createElement('span');
    moveElement.classList.add('move');
    if (index === currentMove) {
        moveElement.classList.add('active');
    }
    
    moveElement.textContent = move;

    // Add annotation if exists
    if (annotations[index]) {
        if (annotations[index].nag) {
            const nag = document.createElement('span');
            nag.classList.add('move-nag');
            nag.textContent = ' ' + annotations[index].nag;
            moveElement.appendChild(nag);
        }
    }

    moveElement.addEventListener('click', () => {
        currentMove = index;
        updatePosition();
        displayMoves();
    });

    return moveElement;
}

function updatePosition() {
    // Reset to initial position
    game.reset();
    
    // Replay moves up to current position
    for (let i = 0; i <= currentMove; i++) {
        game.move(moves[i]);
    }
    
    // Update board
    board.position(game.fen());
    
    // Update controls
    updateControls();
}

function updateControls() {
    document.getElementById('startBtn').disabled = currentMove < 0;
    document.getElementById('prevBtn').disabled = currentMove < 0;
    document.getElementById('nextBtn').disabled = currentMove >= moves.length - 1;
    document.getElementById('endBtn').disabled = currentMove >= moves.length - 1;
}

// Add navigation controls
document.getElementById('startBtn').addEventListener('click', () => {
    currentMove = -1;
    updatePosition();
    displayMoves();
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentMove >= 0) {
        currentMove--;
        updatePosition();
        displayMoves();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentMove < moves.length - 1) {
        currentMove++;
        updatePosition();
        displayMoves();
    }
});

document.getElementById('endBtn').addEventListener('click', () => {
    currentMove = moves.length - 1;
    updatePosition();
    displayMoves();
});

// Add some CSS for better variation display
const style = document.createElement('style');
style.textContent = `
.move-tree {
    margin-left: 1.5em;
    position: relative;
    margin-top: 0.5em;
    margin-bottom: 0.5em;
}

.variation-marker {
    position: absolute;
    left: -1em;
    top: 0.5em;
    width: 0.5em;
    height: 0.5em;
    border: 1px solid #333;
    border-radius: 50%;
    background-color: #ddd;
}

.variation-line {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5em;
    color: #333;  /* Darker color for better visibility */
}

.variation-line .move-number {
    color: #666;  /* Darker color for move numbers */
}

.variation-line .move {
    color: #444;  /* Even darker for the actual moves */
    cursor: pointer;
}

.variation-line .move:hover {
    color: #000;
    background-color: #f0f0f0;
    border-radius: 3px;
}

.move.active {
    background: #e0e0e0;  /* Darker background for active move */
    border-radius: 3px;
    padding: 2px 4px;
    margin: -2px -4px;
    color: #000;
}
`;
document.head.appendChild(style);
