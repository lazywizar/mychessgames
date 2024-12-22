document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    // DOM Elements
    const modal = document.getElementById('uploadModal');
    const closeBtn = document.querySelector('.close-btn');
    const addGamesBtn = document.getElementById('addGamesBtn');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const emptyState = document.getElementById('emptyState');
    const gamesTable = document.getElementById('gamesTable');
    const gamesTableBody = document.getElementById('gamesTableBody');

    // Event Listeners - only add if elements exist
    if (addGamesBtn && modal) {
        addGamesBtn.addEventListener('click', () => modal.style.display = 'block');
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }

    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // File Upload Handling
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', handleFileDrop);
        fileInput.addEventListener('change', handleFileSelect);
    }

    async function loadGames() {
        try {
            console.log('Fetching games from API...');
            const response = await fetch(`${CONFIG.API_URL}/games`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch games');

            const games = await response.json();
            console.log('Games received:', games);

            if (!games || games.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                if (gamesTable) gamesTable.style.display = 'none';
            } else {
                if (emptyState) emptyState.style.display = 'none';
                if (gamesTable) gamesTable.style.display = 'block';
                if (gamesTableBody) displayGames(games);
            }
        } catch (error) {
            console.error('Error loading games:', error);
            alert('Error loading games');
        }
    }

    function displayGames(games) {
        if (!gamesTableBody) return;

        gamesTableBody.innerHTML = games.map(game => {
            const gameId = game.id || game._id;  // Try both id formats
            console.log('Game ID:', gameId);
            
            // Ensure the game has an ID before creating the row
            if (!gameId) {
                console.error('Game missing ID:', game);
                return '';
            }

            return `
                <tr class="game-row" data-id="${gameId}">
                    <td>${game.date || '-'}</td>
                    <td>${game.white || '-'}${game.whiteElo ? ` (${game.whiteElo})` : ''}</td>
                    <td>${game.black || '-'}${game.blackElo ? ` (${game.blackElo})` : ''}</td>
                    <td>${game.result || '-'}</td>
                    <td>${game.event || '-'}</td>
                    <td>${game.eco || '-'}</td>
                </tr>
            `;
        }).join('');

        // Add click handlers to each row
        const rows = gamesTableBody.querySelectorAll('.game-row');
        rows.forEach(row => {
            row.addEventListener('click', async (e) => {
                const gameId = row.getAttribute('data-id');
                console.log('Row clicked, game ID:', gameId);
                console.log('Row element:', row);
                console.log('Row dataset:', row.dataset);
                
                if (!gameId) {
                    console.error('No game ID found in row');
                    return;
                }

                console.log('Waiting 10 seconds before navigation...');
                const baseUrl = window.location.origin;
                const gameUrl = `${baseUrl}/game?id=${gameId}`;
                console.log('Will navigate to:', gameUrl);
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('Navigation starting now...');

                // Navigate to game page with the game ID using assign
                window.location.assign(gameUrl);
            });
        });
    }

    function handleFileDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) uploadFile(file);
    }

    async function uploadFile(file) {
        if (!file || !file.name.toLowerCase().endsWith('.pgn')) {
            alert('Please upload a PGN file');
            return;
        }

        const formData = new FormData();
        formData.append('pgn', file);

        try {
            const response = await fetch(`${CONFIG.API_URL}/games/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                modal.style.display = 'none';
                loadGames();  // Reload games list
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert(error.message || 'Error uploading file');
        }
    }

    // Load games on page load
    loadGames();
});
