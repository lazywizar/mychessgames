// Initialize game state
let board = null;
let game = null;
let currentMove = 0;
let moves = [];
let gameData = null;

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
        
        console.log('Game initialization complete');
    } catch (error) {
        console.error('Error setting up game:', error);
        throw new Error('Failed to set up game: ' + error.message);
    }
}

function displayGameInfo() {
    const gameInfo = document.getElementById('gameInfo');
    if (!gameInfo || !gameData) return;

    const { white, black, date, event, result } = gameData;
    const whiteElo = gameData.whiteElo ? ` (${gameData.whiteElo})` : '';
    const blackElo = gameData.blackElo ? ` (${gameData.blackElo})` : '';

    gameInfo.innerHTML = `
        <div style="margin-bottom: 1rem; color: #fff;">
            <div>${white}${whiteElo} vs ${black}${blackElo}</div>
            <div>${event || 'Unknown Event'}, ${date || 'Unknown Date'}</div>
            <div>Result: ${result || '*'}</div>
        </div>
    `;
}

function displayMoves() {
    const moveList = document.getElementById('moveList');
    if (!moveList || !game) return;

    // Get moves from chess.js
    moves = [];
    const history = game.history({ verbose: true });
    
    let currentPosition = new Chess();
    let moveNumber = 1;
    let html = '';

    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const san = move.san;
        
        // Store position after this move
        currentPosition.move(move);
        const fen = currentPosition.fen();
        moves.push({ san, fen });

        if (i % 2 === 0) {
            html += `<li class="move-item" data-move="${i}">`;
            html += `<span class="move-number">${moveNumber}.</span>`;
            html += `<span class="move" data-move="${i}">${san}</span>`;
        } else {
            html += `<span class="move" data-move="${i}">${san}</span>`;
            moveNumber++;
            html += '</li>';
        }
    }

    // Close the last li if we have an odd number of moves
    if (history.length % 2 !== 0) {
        html += '</li>';
    }

    moveList.innerHTML = html;

    // Add click handlers to moves
    const moveElements = moveList.querySelectorAll('.move');
    moveElements.forEach(moveEl => {
        moveEl.addEventListener('click', () => {
            const moveIndex = parseInt(moveEl.dataset.move);
            goToMove(moveIndex);
        });
    });
}

function goToMove(moveIndex) {
    if (!board || !game || moveIndex < 0 || moveIndex >= moves.length) return;

    currentMove = moveIndex;
    board.position(moves[moveIndex].fen);

    // Update active move highlight
    document.querySelectorAll('.move').forEach(m => m.classList.remove('active'));
    document.querySelector(`.move[data-move="${moveIndex}"]`).classList.add('active');

    updateControls();
    loadCurrentMoveAnnotation();
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

function loadCurrentMoveAnnotation() {
    if (!gameData || !gameData.annotations) return;

    const moveComment = document.getElementById('moveComment');
    const moveNag = document.getElementById('moveNag');
    
    const annotation = gameData.annotations[currentMove];
    
    if (moveComment) moveComment.value = annotation?.comment || '';
    if (moveNag) moveNag.value = annotation?.nag || '';
}

async function saveAnnotation() {
    const moveComment = document.getElementById('moveComment');
    const moveNag = document.getElementById('moveNag');
    
    if (!moveComment || !moveNag || !gameData) return;

    const annotation = {
        comment: moveComment.value.trim(),
        nag: moveNag.value
    };

    try {
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations/${currentMove}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(annotation)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save annotation');
        }

        // Update local game data
        if (!gameData.annotations) gameData.annotations = {};
        gameData.annotations[currentMove] = annotation;

        // Update display
        displayMoves();
        goToMove(currentMove);

        alert('Annotation saved successfully');
    } catch (error) {
        console.error('Error saving annotation:', error);
        alert('Error saving annotation: ' + error.message);
    }
}

// Event listeners for controls
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');
    const saveBtn = document.getElementById('saveAnnotation');

    if (startBtn) startBtn.addEventListener('click', () => goToMove(0));
    if (prevBtn) prevBtn.addEventListener('click', () => goToMove(currentMove - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToMove(currentMove + 1));
    if (endBtn) endBtn.addEventListener('click', () => goToMove(moves.length - 1));
    if (saveBtn) saveBtn.addEventListener('click', saveAnnotation);
});
