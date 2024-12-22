// Initialize game state
let board = null;
let game = null;
let currentMove = 0;
let moves = [];
let gameData = null;
let annotations = {};  // Store annotations by move number

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
});

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

        if (response.status === 404) {
            throw new Error('Game not found');
        }
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        if (response.status === 400) {
            throw new Error('Invalid game ID format');
        }
        throw new Error(errorData.message || 'Failed to load game');
    }

    try {
        gameData = await response.json();
        console.log('Game data received:', gameData);

        // Convert annotations array to object format for easier access
        annotations = {};
        if (gameData.annotations) {
            gameData.annotations.forEach(annotation => {
                annotations[annotation.moveNumber] = {
                    comment: annotation.comment,
                    nag: annotation.nags?.[0] || ''
                };
            });
        }

    } catch (error) {
        console.error('Error parsing game data:', error);
        throw new Error('Invalid game data received');
    }

    if (!gameData || !gameData.pgn) {
        console.error('Invalid game data:', gameData);
        throw new Error('Game data is invalid or missing PGN');
    }

    try {
        // Initialize chess.js with the PGN
        console.log('Initializing chess.js...');
        game = new Chess();

        if (!game.load_pgn(gameData.pgn)) {
            console.error('Failed to load PGN:', gameData.pgn);
            throw new Error('Invalid PGN format');
        }

        // Initialize the board
        console.log('Initializing chessboard...');
        board = Chessboard('board', {
            position: 'start',
            pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg'
        });

        // Display game information and moves
        displayGameInfo();
        displayMoves();
        updateControls();

        // Add event listeners for annotations
        setupAnnotationHandlers();

        console.log('Game initialization complete');
    } catch (error) {
        console.error('Error setting up game:', error);
        throw new Error('Failed to set up game: ' + error.message);
    }
}

function setupAnnotationHandlers() {
    const annotationInput = document.getElementById('moveAnnotation');
    const saveBtn = document.getElementById('saveAnnotation');
    const symbolBtns = document.querySelectorAll('.symbol-btn');

    // Handle quick symbol buttons
    symbolBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const symbol = btn.dataset.symbol;

            // Get existing annotation
            const existingAnnotation = annotations[currentMove] || {};

            // Toggle symbol
            const currentNag = existingAnnotation.nag || '';
            const newNag = currentNag === symbol ? '' : symbol;

            // Update button states
            symbolBtns.forEach(b => {
                b.dataset.selected = b.dataset.symbol === newNag ? 'true' : 'false';
            });

            // Save annotation immediately
            const mergedAnnotation = {
                comment: existingAnnotation.comment || '',
                nag: newNag
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
                    body: JSON.stringify({ annotations: annotationsArray })
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
                alert('Failed to save annotation');
            }
        });
    });

    // Handle save button for text annotations
    saveBtn.addEventListener('click', async () => {
        const newComment = annotationInput.value.trim();

        // If no comment is provided, do nothing
        if (!newComment) return;

        // Get existing annotation
        const existingAnnotation = annotations[currentMove] || {};

        // Merge new comment with existing NAG
        const mergedAnnotation = {
            comment: newComment,
            nag: existingAnnotation.nag || ''
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

        // Add current move's annotation
        annotationsArray.push({
            moveNumber: currentMove,
            move: moves[currentMove],
            comment: mergedAnnotation.comment,
            nags: mergedAnnotation.nag ? [mergedAnnotation.nag] : []
        });

        // Sort by move number
        annotationsArray.sort((a, b) => a.moveNumber - b.moveNumber);

        try {
            const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ annotations: annotationsArray })
            });

            if (!response.ok) {
                throw new Error('Failed to save annotation');
            }

            // Update local annotations object
            annotations[currentMove] = mergedAnnotation;

            // Update display
            displayMoves();

            // Clear comment input
            annotationInput.value = '';

        } catch (error) {
            console.error('Error saving annotation:', error);
            alert('Failed to save annotation');
        }
    });
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
    const moveList = document.getElementById('moveList');
    moveList.innerHTML = '';

    const history = game.history();
    moves = history;

    // Update symbol button states for current move
    const symbolBtns = document.querySelectorAll('.symbol-btn');
    const currentAnnotation = annotations[currentMove];
    symbolBtns.forEach(btn => {
        btn.dataset.selected = (currentAnnotation?.nag === btn.dataset.symbol) ? 'true' : 'false';
    });

    for (let i = 0; i < history.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        const isWhite = i % 2 === 0;

        if (isWhite) {
            const li = document.createElement('li');
            li.className = 'move-item';

            const moveNumberSpan = document.createElement('span');
            moveNumberSpan.className = 'move-number';
            moveNumberSpan.textContent = `${moveNumber}.`;

            const whiteMove = document.createElement('span');
            whiteMove.className = `move${i === currentMove ? ' active' : ''}`;
            whiteMove.textContent = history[i];

            // Add NAG if exists
            if (annotations[i]?.nag) {
                whiteMove.textContent += annotations[i].nag;
            }

            li.appendChild(moveNumberSpan);
            li.appendChild(whiteMove);

            // Add comment if exists
            if (annotations[i]?.comment) {
                const comment = document.createElement('div');
                comment.className = 'move-comment';
                comment.textContent = annotations[i].comment;
                li.appendChild(comment);
            }

            moveList.appendChild(li);
        } else {
            const li = moveList.lastElementChild;

            const blackMove = document.createElement('span');
            blackMove.className = `move${i === currentMove ? ' active' : ''}`;
            blackMove.textContent = history[i];

            // Add NAG if exists
            if (annotations[i]?.nag) {
                blackMove.textContent += annotations[i].nag;
            }

            li.appendChild(blackMove);

            // Add comment if exists
            if (annotations[i]?.comment) {
                const comment = document.createElement('div');
                comment.className = 'move-comment';
                comment.textContent = annotations[i].comment;
                li.appendChild(comment);
            }
        }
    }

    // Add click handlers to moves
    const moveElements = moveList.querySelectorAll('.move');
    moveElements.forEach((moveElement, index) => {
        moveElement.addEventListener('click', () => {
            currentMove = index;
            updatePosition();
            displayMoves();
            updateControls();

            // Load annotation for this move
            const annotation = annotations[currentMove];
            if (annotation) {
                document.getElementById('moveAnnotation').value = annotation.comment || '';
                document.getElementById('moveNag').value = annotation.nag || '';
            } else {
                document.getElementById('moveAnnotation').value = '';
                document.getElementById('moveNag').value = '';
            }
        });
    });
}

function updatePosition() {
    const currentPosition = new Chess();
    for (let i = 0; i <= currentMove; i++) {
        currentPosition.move(moves[i]);
    }
    board.position(currentPosition.fen());
}

function updateControls() {
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');

    if (startBtn) startBtn.disabled = currentMove === 0;
    if (prevBtn) prevBtn.disabled = currentMove === 0;
    if (nextBtn) nextBtn.disabled = currentMove === moves.length - 1;
    if (endBtn) endBtn.disabled = currentMove === moves.length - 1;
}

// Event listeners for controls
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');
    const saveBtn = document.getElementById('saveAnnotation');

    if (startBtn) startBtn.addEventListener('click', () => {
        currentMove = 0;
        updatePosition();
        displayMoves();
        updateControls();
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentMove--;
        updatePosition();
        displayMoves();
        updateControls();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentMove++;
        updatePosition();
        displayMoves();
        updateControls();
    });
    if (endBtn) endBtn.addEventListener('click', () => {
        currentMove = moves.length - 1;
        updatePosition();
        displayMoves();
        updateControls();
    });
});
