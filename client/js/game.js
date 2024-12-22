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

    // Wait for Chessground to be available
    let retries = 0;
    while (typeof Chessground === 'undefined' && retries < 10) {
        console.log('Waiting for Chessground to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }

    if (typeof Chessground === 'undefined') {
        console.log('Chessground library not found');
        throw new Error('Failed to load Chessground library');
    }

    try {
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

        // Initialize chess.js
        game = new Chess();
        if (!game.load_pgn(gameData.pgn)) {
            throw new Error('Invalid PGN format');
        }

        // Store initial moves
        moves = game.history();

        // Process annotations and variations
        if (gameData.annotations) {
            gameData.annotations.forEach(ann => {
                const moveNumber = parseInt(ann.moveNumber);

                if (ann.variation && ann.variation.length > 0) {
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
                } else if (ann.comment || ann.nags?.length > 0) {
                    annotations[moveNumber] = {
                        comment: ann.comment || '',
                        nag: ann.nags?.[0] || ''
                    };
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
            eraseOnClick: false
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
    ground = Chessground.Chessground(el, config);  // Note the change here

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
    if (!isEditMode) return;

    const move = game.move({
        from: orig,
        to: dest,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) return;

    // If we're not at the end of the main line
    if (currentMove < moves.length - 1) {
        const variation = {
            moveNumber: currentMove + 1,
            move: moves[currentMove + 1],
            variation: [move.san],
            previousMoves: moves.slice(0, currentMove + 1)
        };

        if (!variations[currentMove + 1]) {
            variations[currentMove + 1] = [];
        }
        variations[currentMove + 1].push(variation);

        await saveVariation(variation);
    } else {
        moves.push(move.san);
        currentMove++;
    }

    updatePosition();
    displayMoves();
    updateControls();
}

function setupEventHandlers() {
    // Board controls
    document.getElementById('flipBtn').addEventListener('click', () => {
        ground.toggleOrientation();
    });

    document.getElementById('editBtn').addEventListener('click', () => {
        isEditMode = !isEditMode;
        document.getElementById('editBtn').classList.toggle('active');
        ground.set({
            movable: { free: false, events: { after: onMove }, dests: getValidMoves() },
            draggable: { enabled: isEditMode }
        });
    });

    // Navigation controls
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

    // Context menu handlers
    setupContextMenu();
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
                document.getElementById('editBtn').classList.add('active');
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

async function saveAnnotation(moveIndex, text) {
    try {
        // Prepare annotation data
        const annotation = {
            moveNumber: moveIndex,
            move: moves[moveIndex],
            comment: text,
            nags: []
        };

        // Save to server
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                annotations: [annotation]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save annotation');
        }

        // Update local state
        annotations[moveIndex] = {
            comment: text,
            nag: ''
        };

        // Refresh display
        displayMoves();

    } catch (error) {
        console.error('Error saving annotation:', error);
        alert('Failed to save annotation');
    }
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

    gameInfo.innerHTML = `
        <div class="game-header">
            <div class="game-title">${info.slice(0, 3).join(' • ')}</div>
            <div class="game-players">${info.slice(3).join(' • ')}</div>
        </div>
    `;
}

function displayMoves() {
    const moveList = document.getElementById('moveList');
    moveList.innerHTML = '';

    for (let i = 0; i < moves.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        const isWhite = i % 2 === 0;

        if (isWhite) {
            const li = document.createElement('li');
            li.className = 'move-item';

            const moveNumberSpan = document.createElement('span');
            moveNumberSpan.className = 'move-number';
            moveNumberSpan.textContent = `${moveNumber}.`;
            li.appendChild(moveNumberSpan);

            const whiteMove = createMoveElement(moves[i], i);
            li.appendChild(whiteMove);

            // Add annotations
            if (annotations[i]?.comment) {
                const comment = document.createElement('div');
                comment.className = 'move-comment';
                comment.textContent = annotations[i].comment;
                li.appendChild(comment);
            }

            // Add variations
            if (variations[i]) {
                variations[i].forEach(variation => {
                    const variationDiv = createVariationElement(variation, moveNumber);
                    li.appendChild(variationDiv);
                });
            }

            moveList.appendChild(li);
        } else {
            const li = moveList.lastElementChild;
            const blackMove = createMoveElement(moves[i], i);
            li.appendChild(blackMove);

            // Add annotations
            if (annotations[i]?.comment) {
                const comment = document.createElement('div');
                comment.className = 'move-comment';
                comment.textContent = annotations[i].comment;
                li.appendChild(comment);
            }

            // Add variations
            if (variations[i]) {
                variations[i].forEach(variation => {
                    const variationDiv = createVariationElement(variation, moveNumber);
                    li.appendChild(variationDiv);
                });
            }
        }
    }

    // Scroll active move into view
    const activeMove = moveList.querySelector('.move.active');
    if (activeMove) {
        activeMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function createMoveElement(move, index) {
    const span = document.createElement('span');
    span.className = `move${index === currentMove ? ' active' : ''}`;
    span.textContent = move;

    // Add NAG if exists
    if (annotations[index]?.nag) {
        span.textContent += ' ' + annotations[index].nag;
    }

    // Add click handler
    span.addEventListener('click', () => {
        currentMove = index;
        updatePosition();
        displayMoves();
    });

    // Add context menu
    span.addEventListener('contextmenu', (e) => {
        showContextMenu(e, index);
    });

    return span;
}

function createVariationElement(variation, moveNumber) {
    const variationDiv = document.createElement('div');
    variationDiv.className = 'move-tree';

    const marker = document.createElement('div');
    marker.className = 'variation-marker';
    variationDiv.appendChild(marker);

    // Show variation moves
    const variationMoves = document.createElement('div');
    variationMoves.className = 'variation-moves';

    // Add variation moves
    variation.variation.forEach((move, idx) => {
        // Add move number for white moves
        if (idx % 2 === 0) {
            const varMoveNumber = document.createElement('span');
            varMoveNumber.className = 'move-number';
            varMoveNumber.textContent = `${moveNumber + Math.floor(idx/2)}.`;
            variationMoves.appendChild(varMoveNumber);
        }

        const moveSpan = document.createElement('span');
        moveSpan.className = 'move';
        moveSpan.textContent = move;

        // Add click handler for variation moves
        moveSpan.addEventListener('click', () => {
            playVariation(variation, idx);
        });

        // Add context menu for variation moves
        moveSpan.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // TODO: Implement variation-specific context menu if needed
        });

        variationMoves.appendChild(moveSpan);
    });

    // Add comment if exists
    if (variation.comment) {
        const comment = document.createElement('div');
        comment.className = 'move-comment';
        comment.textContent = variation.comment;
        variationMoves.appendChild(comment);
    }

    variationDiv.appendChild(variationMoves);
    return variationDiv;
}

function playVariation(variation, moveIndex) {
    // Reset to initial position
    game.reset();

    // Play the moves leading up to the variation
    variation.previousMoves.forEach(move => {
        game.move(move);
    });

    // Play the variation moves up to the selected index
    for (let i = 0; i <= moveIndex; i++) {
        game.move(variation.variation[i]);
    }

    // Update the board
    ground.set({
        fen: game.fen(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
        movable: {
            color: game.turn() === 'w' ? 'white' : 'black',
            dests: getValidMoves()
        }
    });
}

function updatePosition() {
    // Reset to initial position
    game.reset();

    // Replay moves up to current position
    for (let i = 0; i <= currentMove; i++) {
        game.move(moves[i]);
    }

    // Get last move for highlighting
    let lastMove = null;
    if (currentMove >= 0 && moves[currentMove]) {
        const move = game.history({ verbose: true })[currentMove];
        lastMove = move ? [move.from, move.to] : null;
    }

    // Update Chessground
    ground.set({
        fen: game.fen(),
        turnColor: game.turn() === 'w' ? 'white' : 'black',
        movable: {
            color: isEditMode ? (game.turn() === 'w' ? 'white' : 'black') : 'none',
            dests: isEditMode ? getValidMoves() : new Map()
        },
        lastMove: lastMove
    });

    // Update controls
    updateControls();
}

function updateControls() {
    document.getElementById('startBtn').disabled = currentMove < 0;
    document.getElementById('prevBtn').disabled = currentMove < 0;
    document.getElementById('nextBtn').disabled = currentMove >= moves.length - 1;
    document.getElementById('endBtn').disabled = currentMove >= moves.length - 1;
}