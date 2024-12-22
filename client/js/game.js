// Initialize game state
let ground = null;
let game = null;
let currentMove = -1;
let moves = [];
let gameData = null;
let annotations = {};
let variations = {};
let isEditMode = true;
let currentPath = [];
let selectedMove = null;
let isDrawing = false;
let shapes = [];

// Get game ID from URL
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) {
        window.location.replace('index.html');
        return;
    }

    if (!gameId) {
        console.error('No game ID provided');
        window.location.assign('/dashboard.html');
        return;
    }

    try {
        await initGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Error loading game: ' + error.message);

        if (error.message === 'Game not found' ||
            error.message === 'Unauthorized' ||
            error.message === 'Invalid game ID format') {
            window.location.assign('/dashboard.html');
        }
    }
});

async function initGame() {
    const token = getToken();
    if (!token) {
        throw new Error('Unauthorized');
    }

    try {
        // Initialize chess.js first
        game = new Chess();
        moves = [];  // Initialize moves array

        // Fetch game data
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(response.status === 404 ? 'Game not found' :
                          response.status === 401 ? 'Unauthorized' :
                          'Failed to load game');
        }

        gameData = await response.json();

        // Load PGN and parse moves
        if (gameData.pgn && !game.load_pgn(gameData.pgn)) {
            throw new Error('Invalid PGN format');
        }

        // Set moves from either gameData or chess.js history
        moves = gameData.moves ? 
            gameData.moves.split(' ').filter(move => move.trim()) : 
            game.history({ verbose: true });

        console.log('Moves initialized:', moves);

        // Process annotations into a more usable format
        annotations = {};
        if (gameData.annotations && Array.isArray(gameData.annotations)) {
            gameData.annotations.forEach(ann => {
                annotations[ann.moveNumber] = {
                    comment: ann.comment || '',
                    nag: ann.nags && ann.nags.length > 0 ? ann.nags[0] : '',
                    shapes: ann.shapes || []
                };
            });
        }

        // Initialize Chessground
        initializeChessground();

        // Setup event handlers
        setupEventHandlers();

        // Initial display
        displayGameInfo();
        displayMoves();
        updateControls();

        // Start at beginning position
        currentMove = -1;
        updatePosition();

    } catch (error) {
        console.error('Error setting up game:', error);
        throw error;
    }
}

function initializeChessground() {
    if (typeof Chessground === 'undefined') {
        throw new Error('Chessground is not available');
    }

    const config = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        orientation: 'white',
        movable: {
            free: false,
            color: 'both',
            dests: getValidMoves(),
            events: {
                after: onMove
            }
        },
        draggable: {
            enabled: true,
            showGhost: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        highlight: {
            lastMove: true,
            check: true
        },
        premovable: {
            enabled: false
        },
        drawable: {
            enabled: true,
            visible: true,
            defaultSnapToValidMove: true,
            eraseOnClick: false,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 }
            }
        },
        coordinates: true,
        autoCastle: true,
        viewOnly: false
    };

    const el = document.getElementById('chessground');
    if (!el) {
        throw new Error('Chessground element not found');
    }

    // Clear the element
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }

    // Initialize Chessground
    ground = Chessground.Chessground(el, config);  

    if (!ground) {
        throw new Error('Failed to initialize Chessground');
    }

    console.log('Chessground initialized successfully');
}

function getValidMoves() {
    const dests = new Map();
    const moves = game.moves({ verbose: true });

    moves.forEach(move => {
        const from = move.from;
        if (!dests.has(from)) {
            dests.set(from, []);
        }
        dests.get(from).push(move.to);
    });

    return dests;
}

async function onMove(orig, dest) {
    // Make the move in chess.js
    const move = game.move({
        from: orig,
        to: dest,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (!move) return false;

    console.log('Move made:', move); // Debug log

    // If we're not at the end of the main line, create a variation
    if (currentMove < moves.length - 1) {
        const variation = {
            moveNumber: Math.floor(currentMove / 2) + 1,
            variation: [move.san],
            previousMoves: moves.slice(0, currentMove + 1)
        };

        if (!variations[currentMove + 1]) {
            variations[currentMove + 1] = [];
        }
        variations[currentMove + 1].push(variation);

        // Save the variation
        saveVariation(variation);
    } else {
        // Adding a new move at the end
        moves.push(move.san);
        currentMove++;
    }

    // Update the position
    ground.set({
        fen: game.fen(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
        movable: {
            color: game.turn() === 'w' ? 'white' : 'black',
            dests: getValidMoves()
        }
    });

    // Update display
    displayMoves();
    updateControls();
}

function setupEventHandlers() {
    // Board controls
    const flipBtn = document.getElementById('flipBtn');
    if (flipBtn) {
        flipBtn.addEventListener('click', () => {
            ground.toggleOrientation();
        });
    }

    // Drawing mode
    const drawBtn = document.getElementById('drawBtn');
    if (drawBtn) {
        drawBtn.addEventListener('click', () => {
            isDrawing = !isDrawing;
            drawBtn.classList.toggle('active');
            ground.set({
                drawable: {
                    enabled: isDrawing
                }
            });
        });
    }

    // Navigation controls
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            currentMove = -1;
            updatePosition();
            displayMoves();
        });
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentMove >= 0) {
                currentMove--;
                updatePosition();
                displayMoves();
            }
        });
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentMove < moves.length - 1) {
                currentMove++;
                updatePosition();
                displayMoves();
            }
        });
    }

    const endBtn = document.getElementById('endBtn');
    if (endBtn) {
        endBtn.addEventListener('click', () => {
            currentMove = moves.length - 1;
            updatePosition();
            displayMoves();
        });
    }

    // Annotation handlers
    const moveComment = document.getElementById('moveComment');
    if (moveComment) {
        moveComment.addEventListener('change', () => {
            if (currentMove >= 0) {
                const comment = moveComment.value.trim();
                if (comment) {
                    if (!annotations[currentMove]) {
                        annotations[currentMove] = {};
                    }
                    annotations[currentMove].comment = comment;
                    saveAnnotation(currentMove, { comment });
                }
            }
        });
    }

    // NAG buttons
    const nagButtons = document.querySelectorAll('.nag-buttons .button');
    nagButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentMove >= 0) {
                const symbol = button.dataset.symbol;
                if (!annotations[currentMove]) {
                    annotations[currentMove] = {};
                }
                annotations[currentMove].nag = symbol;
                saveAnnotation(currentMove, { nag: symbol });
                displayMoves();
            }
        });
    });

    // Drawing handlers
    ground.set({
        drawable: {
            onChange: (shapes) => {
                if (currentMove >= 0) {
                    if (!annotations[currentMove]) {
                        annotations[currentMove] = {};
                    }
                    annotations[currentMove].shapes = shapes;
                    saveAnnotation(currentMove, { shapes });
                }
            }
        }
    });
}

function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const annotationDialog = document.getElementById('annotationDialog');

    // Close context menu when clicking outside
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // Prevent closing when clicking inside the menu
    contextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle context menu actions
    contextMenu.addEventListener('click', (e) => {
        const action = e.target.closest('.context-menu-item')?.dataset.action;
        if (!action || !selectedMove) return;

        switch (action) {
            case 'annotate':
                showAnnotationDialog(selectedMove);
                break;
            case 'addVariation':
                currentMove = selectedMove;
                updatePosition();
                isEditMode = true;
                ground.set({
                    movable: { free: false, events: { after: onMove }, dests: getValidMoves() },
                    draggable: { enabled: true }
                });
                break;
        }

        contextMenu.style.display = 'none';
    });

    // Handle annotation dialog
    document.getElementById('cancelAnnotation').addEventListener('click', () => {
        annotationDialog.style.display = 'none';
    });

    document.getElementById('saveAnnotation').addEventListener('click', async () => {
        const text = document.getElementById('annotationText').value;
        await saveAnnotation(selectedMove, text);
        annotationDialog.style.display = 'none';
    });
}

function showContextMenu(e, moveIndex) {
    e.preventDefault();
    const contextMenu = document.getElementById('contextMenu');
    selectedMove = moveIndex;

    // Position the menu at the cursor
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.display = 'block';
}

function showAnnotationDialog(moveIndex) {
    const dialog = document.getElementById('annotationDialog');
    const textarea = document.getElementById('annotationText');

    // Load existing annotation if any
    textarea.value = annotations[moveIndex]?.comment || '';

    dialog.style.display = 'block';
}

async function saveAnnotation(moveIndex, annotationData) {
    if (!gameId || !moves || moveIndex >= moves.length) return;

    // Get existing annotations
    const currentAnnotations = gameData.annotations || [];
    
    // Create the annotation object with required fields
    const annotation = {
        moveNumber: moveIndex,
        move: moves[moveIndex].san || moves[moveIndex],
        ...annotationData,
        nags: annotationData.nag ? [annotationData.nag] : [],
        variations: annotationData.variations || [],
        shapes: annotationData.shapes || []  // Ensure shapes are included
    };
    
    // Update local annotations object for immediate use
    annotations[moveIndex] = {
        comment: annotation.comment || '',
        nag: annotation.nags && annotation.nags.length > 0 ? annotation.nags[0] : '',
        shapes: annotation.shapes || []
    };
    
    // Update or add the annotation in the gameData
    const existingIndex = currentAnnotations.findIndex(a => a.moveNumber === moveIndex);
    if (existingIndex !== -1) {
        currentAnnotations[existingIndex] = {
            ...currentAnnotations[existingIndex],
            ...annotation
        };
    } else {
        currentAnnotations.push(annotation);
    }
    
    // Update local state
    gameData.annotations = currentAnnotations;
    
    // Send to server
    fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            annotations: currentAnnotations
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Annotation saved:', data);
        // Update local game data with server response
        gameData = data;
        
        // Update local annotations from the response
        if (data.annotations) {
            data.annotations.forEach(ann => {
                annotations[ann.moveNumber] = {
                    comment: ann.comment || '',
                    nag: ann.nags && ann.nags.length > 0 ? ann.nags[0] : '',
                    shapes: ann.shapes || []
                };
            });
        }
        
        // Refresh the display
        displayMoves();
    })
    .catch(error => {
        console.error('Error saving annotation:', error);
        // Revert local state on error
        gameData.annotations = [...currentAnnotations];
    });
}

async function saveVariation(variation) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                annotations: [{
                    moveNumber: variation.moveNumber,
                    move: variation.move,
                    variation: variation.variation,
                    previousMoves: variation.previousMoves,
                    comment: variation.comment || '',
                    nags: variation.nags || []
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save variation');
        }

        // Update will happen through displayMoves()

    } catch (error) {
        console.error('Error saving variation:', error);
        alert('Failed to save variation');
    }
}

function displayGameInfo() {
    if (!gameData) return;

    // Update player info
    const whitePlayerEl = document.getElementById('whitePlayer');
    const whiteRatingEl = document.getElementById('whiteRating');
    const blackPlayerEl = document.getElementById('blackPlayer');
    const blackRatingEl = document.getElementById('blackRating');
    const gameEventEl = document.getElementById('gameEvent');
    const gameDateEl = document.getElementById('gameDate');

    if (whitePlayerEl) whitePlayerEl.textContent = gameData.white || 'White';
    if (whiteRatingEl) whiteRatingEl.textContent = gameData.whiteElo ? `(${gameData.whiteElo})` : '';
    if (blackPlayerEl) blackPlayerEl.textContent = gameData.black || 'Black';
    if (blackRatingEl) blackRatingEl.textContent = gameData.blackElo ? `(${gameData.blackElo})` : '';
    
    // Update game metadata
    const event = gameData.event || 'Game';
    const timeControl = gameData.timeControl || 'Standard';
    if (gameEventEl) gameEventEl.textContent = `${event} • ${timeControl}`;
    if (gameDateEl) gameDateEl.textContent = gameData.date || '';
}

function displayMoves() {
    const movesDiv = document.getElementById('moves');
    if (!movesDiv || !moves) return;

    movesDiv.innerHTML = '';
    let currentIndex = 0;
    let moveNumber = 1;

    // If no moves, display initial position
    if (!moves.length) {
        const moveContainer = document.createElement('div');
        moveContainer.className = 'move-row';
        moveContainer.textContent = 'Initial position';
        movesDiv.appendChild(moveContainer);
        return;
    }

    while (currentIndex < moves.length) {
        const moveContainer = document.createElement('div');
        moveContainer.className = 'move-row';

        // Move number
        const numberSpan = document.createElement('span');
        numberSpan.className = 'move-number';
        numberSpan.textContent = `${moveNumber}.`;
        moveContainer.appendChild(numberSpan);

        // White's move
        if (currentIndex < moves.length) {
            try {
                const whiteMove = createMoveElement(moves[currentIndex], currentIndex, true);
                moveContainer.appendChild(whiteMove);
                currentIndex++;
            } catch (error) {
                console.error('Error creating white move:', error);
            }
        }

        // Black's move
        if (currentIndex < moves.length) {
            try {
                const blackMove = createMoveElement(moves[currentIndex], currentIndex, false);
                moveContainer.appendChild(blackMove);
                currentIndex++;
            } catch (error) {
                console.error('Error creating black move:', error);
            }
        }

        // Display variations if any
        if (variations[moveNumber]) {
            variations[moveNumber].forEach(variation => {
                try {
                    const variationDiv = document.createElement('div');
                    variationDiv.className = 'variation';
                    variation.moves.forEach((move, i) => {
                        const moveEl = createMoveElement(move, `${moveNumber}-${i}`, i % 2 === 0);
                        variationDiv.appendChild(moveEl);
                    });
                    moveContainer.appendChild(variationDiv);
                } catch (error) {
                    console.error('Error creating variation:', error);
                }
            });
        }

        movesDiv.appendChild(moveContainer);
        moveNumber++;
    }

    // Highlight current move
    const moveElements = movesDiv.querySelectorAll('.move');
    moveElements.forEach((move, index) => {
        move.classList.toggle('current', index === currentMove);
    });

    // Scroll to current move
    if (currentMove >= 0) {
        const currentMoveEl = moveElements[currentMove];
        if (currentMoveEl) {
            currentMoveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function createMoveElement(move, index, isWhite) {
    const moveSpan = document.createElement('span');
    moveSpan.className = `move ${isWhite ? 'white' : 'black'}`;
    
    let moveText = move.san;
    
    // Add NAG symbol if exists
    if (annotations[index] && annotations[index].nag) {
        moveText += annotations[index].nag;
    }
    
    moveSpan.textContent = moveText;
    
    // Add comment indicator if exists
    if (annotations[index] && annotations[index].comment) {
        const commentIcon = document.createElement('span');
        commentIcon.className = 'comment-icon';
        commentIcon.textContent = '💭';
        commentIcon.title = annotations[index].comment;
        moveSpan.appendChild(commentIcon);
    }
    
    // Add shape indicator if exists
    if (annotations[index] && annotations[index].shapes && annotations[index].shapes.length > 0) {
        const shapeIcon = document.createElement('span');
        shapeIcon.className = 'shape-icon';
        shapeIcon.textContent = '✏️';
        moveSpan.appendChild(shapeIcon);
    }
    
    moveSpan.addEventListener('click', () => {
        currentMove = typeof index === 'string' ? parseInt(index.split('-')[1]) : index;
        updatePosition();
        displayMoves();
    });
    
    return moveSpan;
}

function updatePosition() {
    if (currentMove === -1) {
        game.reset();
    } else {
        game.reset();
        for (let i = 0; i <= currentMove; i++) {
            game.move(moves[i]);
        }
    }
    
    ground.set({
        fen: game.fen(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
        movable: {
            color: 'both',
            dests: getValidMoves()
        }
    });
    
    // Update shapes and comments
    if (annotations[currentMove]) {
        const annotation = annotations[currentMove];
        
        // Update shapes
        if (annotation.shapes && Array.isArray(annotation.shapes)) {
            ground.setShapes(annotation.shapes);
        } else {
            ground.setShapes([]);
        }
        
        // Update comment
        const commentInput = document.getElementById('moveComment');
        if (commentInput) {
            commentInput.value = annotation.comment || '';
        }
    } else {
        ground.setShapes([]);
        const commentInput = document.getElementById('moveComment');
        if (commentInput) {
            commentInput.value = '';
        }
    }
}

function updateControls() {
    // Update navigation buttons state
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');

    if (startBtn) startBtn.disabled = currentMove <= -1;
    if (prevBtn) prevBtn.disabled = currentMove <= -1;
    if (nextBtn) nextBtn.disabled = currentMove >= moves.length - 1;
    if (endBtn) endBtn.disabled = currentMove >= moves.length - 1;
}