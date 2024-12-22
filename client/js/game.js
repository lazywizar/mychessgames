// Initialize game state
let board = null;
let game = null;
let currentMove = 0;
let moves = [];
let gameData = null;

// Get game ID from URL
const gameId = new URLSearchParams(window.location.search).get('id');
console.log('Game ID from URL:', gameId);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing game page...');
    console.log('Current pathname:', window.location.pathname);
    console.log('Current URL:', window.location.href);
    
    // Check authentication first
    console.log('Checking authentication...');
    const isAuth = requireAuth();
    console.log('Authentication status:', isAuth);
    
    if (!isAuth) {
        console.log('Authentication failed, redirecting to index');
        window.location.href = 'index.html';
        return;
    }
    
    // Validate game ID
    if (!gameId) {
        console.log('No game ID found, redirecting to dashboard');
        window.location.href = 'dashboard.html';
        return;
    }
    
    try {
        console.log('Starting game load for ID:', gameId);
        await initializeGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Don't redirect on error, just show the error
        alert('Error loading game: ' + error.message);
    }
});

async function initializeGame() {
    console.log('Fetching game data from API...');
    try {
        const token = getToken();
        console.log('Using token for auth:', token ? 'Token exists' : 'No token');
        
        const url = `${CONFIG.API_URL}/games/${gameId}`;
        console.log('Making API request to:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('API response status:', response.status);
        
        if (!response.ok) {
            console.error('Error response:', response.status);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error data:', errorData);
            
            if (response.status === 404) {
                throw new Error('Game not found');
            }
            if (response.status === 401) {
                console.log('Unauthorized, redirecting to index');
                window.location.href = 'index.html';
                return;
            }
            throw new Error(errorData.error || 'Failed to load game');
        }

        gameData = await response.json();
        console.log('Game data received:', gameData);
        
        if (!gameData || !gameData.pgn) {
            console.error('Invalid game data:', gameData);
            throw new Error('Game data is invalid or missing PGN');
        }
        
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

        // Get all moves
        moves = [];
        let tempGame = new Chess();
        const history = game.history({ verbose: true });
        console.log('Move history:', history);
        
        history.forEach(move => {
            tempGame.move(move);
            moves.push({
                san: move.san,
                fen: tempGame.fen(),
                moveNumber: Math.floor((moves.length + 2) / 2)
            });
        });

        console.log('Displaying game info and moves...');
        displayGameInfo();
        displayMoves();
        loadCurrentMoveAnnotation();
        
        // Go to first position
        goToMove(0);
        
        console.log('Game initialization complete');
    } catch (error) {
        console.error('Error in initializeGame:', error);
        throw error;
    }
}

function displayGameInfo() {
    const info = document.getElementById('gameInfo');
    if (!info) {
        console.error('Game info element not found');
        return;
    }
    info.innerHTML = `
        <h2>${gameData.white || 'Unknown'} vs ${gameData.black || 'Unknown'}</h2>
        <p>${gameData.event || 'Game'} | ${gameData.date || 'Unknown date'}</p>
        <p>Result: ${gameData.result || '*'}</p>
        ${gameData.eco ? `<p>ECO: ${gameData.eco}</p>` : ''}
    `;
}

function displayMoves() {
    const moveList = document.getElementById('moveList');
    if (!moveList) {
        console.error('Move list element not found');
        return;
    }
    moveList.innerHTML = '';
    
    moves.forEach((move, index) => {
        if (index % 2 === 0) {
            const moveItem = document.createElement('li');
            moveItem.className = 'move-item';
            
            const moveNumber = document.createElement('span');
            moveNumber.className = 'move-number';
            moveNumber.textContent = `${Math.floor(index/2 + 1)}.`;
            
            const whiteMove = document.createElement('span');
            whiteMove.className = `move ${currentMove === index ? 'active' : ''}`;
            whiteMove.textContent = move.san;
            whiteMove.onclick = () => goToMove(index);
            
            moveItem.appendChild(moveNumber);
            moveItem.appendChild(whiteMove);
            
            if (moves[index + 1]) {
                const blackMove = document.createElement('span');
                blackMove.className = `move ${currentMove === index + 1 ? 'active' : ''}`;
                blackMove.textContent = moves[index + 1].san;
                blackMove.onclick = () => goToMove(index + 1);
                moveItem.appendChild(blackMove);
            }
            
            // Add annotations if they exist
            const annotation = gameData.annotations?.find(a => a.moveNumber === Math.floor(index/2 + 1));
            if (annotation) {
                if (annotation.nags?.length > 0) {
                    const nag = document.createElement('span');
                    nag.className = 'nag';
                    nag.textContent = annotation.nags.join(' ');
                    moveItem.appendChild(nag);
                }
                if (annotation.comment) {
                    const comment = document.createElement('div');
                    comment.className = 'comment';
                    comment.textContent = annotation.comment;
                    moveItem.appendChild(comment);
                }
            }
            
            moveList.appendChild(moveItem);
        }
    });
}

function goToMove(moveIndex) {
    if (!board) {
        console.error('Chessboard not initialized');
        return;
    }
    
    if (moveIndex < 0) moveIndex = 0;
    if (moveIndex > moves.length - 1) moveIndex = moves.length - 1;
    
    currentMove = moveIndex;
    board.position(moves[moveIndex].fen);
    displayMoves();
    updateControls();
    loadCurrentMoveAnnotation();
}

function updateControls() {
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');
    
    if (!startBtn || !prevBtn || !nextBtn || !endBtn) {
        console.error('Control buttons not found');
        return;
    }
    
    startBtn.disabled = currentMove === 0;
    prevBtn.disabled = currentMove === 0;
    nextBtn.disabled = currentMove === moves.length - 1;
    endBtn.disabled = currentMove === moves.length - 1;
}

function loadCurrentMoveAnnotation() {
    const moveComment = document.getElementById('moveComment');
    const moveNag = document.getElementById('moveNag');
    
    if (!moveComment || !moveNag) {
        console.error('Annotation elements not found');
        return;
    }
    
    const moveNumber = Math.floor(currentMove / 2) + 1;
    const annotation = gameData.annotations?.find(a => a.moveNumber === moveNumber);
    
    moveComment.value = annotation?.comment || '';
    moveNag.value = annotation?.nags?.[0] || '';
}

async function saveAnnotation() {
    try {
        const moveNumber = Math.floor(currentMove / 2) + 1;
        const comment = document.getElementById('moveComment')?.value || '';
        const nag = document.getElementById('moveNag')?.value || '';
        
        // Update or create annotation
        let annotations = gameData.annotations || [];
        let annotation = annotations.find(a => a.moveNumber === moveNumber);
        
        if (annotation) {
            annotation.comment = comment;
            annotation.nags = nag ? [nag] : [];
        } else {
            annotations.push({
                moveNumber,
                move: moves[currentMove].san,
                comment,
                nags: nag ? [nag] : [],
                variations: []
            });
        }
        
        console.log('Saving annotations:', annotations);
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/annotations`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ annotations })
        });

        if (!response.ok) {
            throw new Error('Failed to save annotation');
        }

        gameData = await response.json();
        displayMoves();
    } catch (error) {
        console.error('Error saving annotation:', error);
        alert('Error saving annotation');
    }
}

// Event listeners for controls
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');
    const saveAnnotationBtn = document.getElementById('saveAnnotation');
    
    if (startBtn) startBtn.addEventListener('click', () => goToMove(0));
    if (prevBtn) prevBtn.addEventListener('click', () => goToMove(currentMove - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToMove(currentMove + 1));
    if (endBtn) endBtn.addEventListener('click', () => goToMove(moves.length - 1));
    if (saveAnnotationBtn) saveAnnotationBtn.addEventListener('click', saveAnnotation);
});
