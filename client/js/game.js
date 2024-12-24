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

// Move Tree implementation
class Node {
    constructor(move = null, ply = 0) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.move = move;  // The move in SAN notation
        this.ply = ply;    // Half-move number (0 for initial position)
        this.children = []; // Main line and variations
        this.comments = [];
        this.nags = [];    // Numeric Annotation Glyphs
        this.shapes = [];  // Arrow and circle drawings
    }

    addChild(move) {
        const child = new Node(move, this.ply + 1);
        this.children.push(child);
        return child;
    }

    addVariation(moves) {
        if (!moves.length) return null;
        const child = new Node(moves[0], this.ply + 1);
        this.children.push(child);

        let current = child;
        for (let i = 1; i < moves.length; i++) {
            current = current.addChild(moves[i]);
        }
        return child;
    }
}

class MoveTree {
    constructor() {
        this.root = new Node();
        this.currentNode = this.root;
    }

    addMove(moveObj) {
        // If moveObj is a string, convert it to an object with from/to properties
        let move;
        if (typeof moveObj === 'string') {
            const tempChess = new Chess(game.fen());
            move = tempChess.move(moveObj);
        } else {
            move = moveObj;
        }

        if (!move) return null;

        const newNode = new Node(move.san, this.currentNode.ply + 1);
        newNode.from = move.from;
        newNode.to = move.to;
        this.currentNode.children.push(newNode);
        this.currentNode = newNode;
        return newNode;
    }

    addVariation(moves, startPly) {
        let parentNode = this.findNodeByPly(startPly);
        if (!parentNode) return null;

        // Save current position
        const currentFen = game.fen();

        // Set up position at variation start
        const tempChess = new Chess();
        const path = this.getPathToNode(parentNode);
        path.forEach(node => {
            if (node.move) tempChess.move(node.move);
        });

        // Create variation
        let currentNode = parentNode;
        moves.forEach(move => {
            try {
                const moveObj = tempChess.move(move);
                if (moveObj) {
                    const newNode = new Node(moveObj.san, currentNode.ply + 1);
                    newNode.from = moveObj.from;
                    newNode.to = moveObj.to;
                    currentNode.children.push(newNode);
                    currentNode = newNode;
                }
            } catch (error) {
                console.error('Error adding variation move:', move, error);
            }
        });

        // Restore original position
        game.load(currentFen);

        return parentNode.children[parentNode.children.length - 1];
    }

    getPathToNode(targetNode) {
        const path = [];
        let node = targetNode;
        while (node && node !== this.root) {
            path.unshift(node);
            node = this.findParent(node);
        }
        return path;
    }

    findNodeByPly(ply) {
        const traverse = (node) => {
            if (node.ply === ply) return node;
            for (const child of node.children) {
                const found = traverse(child);
                if (found) return found;
            }
            return null;
        };
        return traverse(this.root);
    }

    getMainLine() {
        const moves = [];
        let node = this.currentNode;
        while (node.move) {
            moves.unshift(node.move);
            node = this.findParent(node);
        }
        return moves;
    }

    findParent(targetNode) {
        const traverse = (node) => {
            for (const child of node.children) {
                if (child === targetNode) return node;
                const found = traverse(child);
                if (found) return found;
            }
            return null;
        };
        return traverse(this.root);
    }
}

// Initialize moveTree
let moveTree = new MoveTree();
let currentNode = null;

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

        // Fetch game data
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load game');
        }

        gameData = await response.json();
        console.log('Game data received:', gameData); // Debug log

        // Load PGN and parse moves
        if (gameData.pgn && !game.load_pgn(gameData.pgn)) {
            throw new Error('Invalid PGN format');
        }

        // Build move tree from PGN
        moveTree = new MoveTree();
        currentNode = moveTree.root;

        // Process main line moves
        const mainLine = game.history({ verbose: true }); // Get detailed move objects
        console.log('Main line moves:', mainLine);

        mainLine.forEach(move => {
            currentNode = moveTree.addMove(move);
        });

        // Process variations from annotations
        if (gameData.annotations) {
            console.log('Processing annotations:', gameData.annotations);

            gameData.annotations.forEach(ann => {
                if (ann.variation) {
                    console.log(`Adding variation at move ${ann.moveNumber}:`, ann.variation);
                    const variationMoves = ann.variation.split(' ')
                        .filter(m => m.trim() && !m.match(/^\d+\./));
                    moveTree.addVariation(variationMoves, ann.moveNumber);
                }
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
        console.error('Error initializing game:', error);
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
    if (!movesDiv || !moveTree) return;

    movesDiv.innerHTML = '';

    function renderNode(node, isVariation = false, parentNode = null, isFirstMove = false) {
        if (!node.move) return '';

        const ply = node.ply;
        const moveNumber = Math.floor((ply + 1) / 2);
        const isWhite = ply % 2 === 1;

        let html = '';

        // Start new line for main line moves
        if (!isVariation && isWhite) {
            html += '<div class="move-line">';
        }

        // Start variation
        if (isVariation && isFirstMove) {
            html += '<div class="variation">(';
        }

        // Add move number
        if (isWhite || isVariation) {
            html += `<span class="move-number">${moveNumber}${isWhite ? '.' : '...'}</span>`;
        }

        // Add the move
        html += `<span class="move ${node === currentNode ? 'current' : ''}"
                       data-node-id="${node.id}">
                    ${node.move}
                </span>`;

        // Add space after move
        html += ' ';

        // Handle variations and main line
        if (node.children.length > 0) {
            // Show variations first
            if (node.children.length > 1) {
                // Process all variations (non-main line moves)
                for (let i = 1; i < node.children.length; i++) {
                    html += renderNode(node.children[i], true, node, true);
                }
            }

            // Continue with main line
            html += renderNode(node.children[0], isVariation, node, false);
        }

        // Close variation
        if (isVariation && isFirstMove) {
            html += ')</div>';
        }

        // Close main line move pair
        if (!isVariation && isWhite && !node.children.length) {
            html += '</div>';
        }

        return html;
    }

    // Start rendering from the first move
    if (moveTree.root.children.length > 0) {
        movesDiv.innerHTML = renderNode(moveTree.root.children[0]);
    }

    // Add click handlers
    movesDiv.querySelectorAll('.move').forEach(moveEl => {
        moveEl.addEventListener('click', () => {
            const nodeId = moveEl.dataset.nodeId;
            currentNode = findNodeById(nodeId);
            updatePosition();
            displayMoves();
        });
    });
}

// Add this helper function to find nodes by ID
function findNodeById(nodeId) {
    function traverse(node) {
        if (node.id === nodeId) return node;
        for (const child of node.children) {
            const found = traverse(child);
            if (found) return found;
        }
        return null;
    }
    return traverse(moveTree.root);
}

function updatePosition() {
    // Reset to initial position
    game.reset();

    if (currentNode && currentNode.ply > 0) {
        // Get the path from root to current node
        const path = [];
        let node = currentNode;

        while (node && node !== moveTree.root) {
            path.unshift(node);
            node = findParentNode(node);
        }

        // Apply all moves in the path
        path.forEach(node => {
            try {
                if (node.move) {
                    const move = game.move(node.move);
                    if (move) {
                        node.from = move.from;
                        node.to = move.to;
                    }
                }
            } catch (error) {
                console.error('Error applying move:', node.move, error);
            }
        });
    }

    // Update Chessground
    const config = {
        fen: game.fen(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
        movable: {
            color: 'both',
            dests: getValidMoves()
        }
    };

    if (currentNode && currentNode.from && currentNode.to) {
        config.lastMove = [currentNode.from, currentNode.to];
    }

    ground.set(config);

    // Update shapes and comments
    if (currentNode) {
        ground.setShapes(currentNode.shapes || []);
        const commentInput = document.getElementById('moveComment');
        if (commentInput) {
            commentInput.value = currentNode.comments.join('\n') || '';
        }
    }

    updateControls();
}

// Helper function to find parent node
function findParentNode(targetNode) {
    function traverse(node) {
        for (const child of node.children) {
            if (child === targetNode) return node;
            const found = traverse(child);
            if (found) return found;
        }
        return null;
    }
    return traverse(moveTree.root);
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