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
            //console.log('Processing game:', game);
            const gameId = game.id || game._id;  // Try both id formats
            console.log('Game ID used for link:', gameId);

            return `
                <tr class="game-row" data-id="${gameId}" onclick="handleGameClick(event, '${gameId}')">
                    <td>${game.date || '-'}</td>
                    <td>${game.white || '-'}${game.whiteElo ? ` (${game.whiteElo})` : ''}</td>
                    <td>${game.black || '-'}${game.blackElo ? ` (${game.blackElo})` : ''}</td>
                    <td>${game.result || '-'}</td>
                    <td>${game.event || '-'}</td>
                    <td>${game.eco || '-'}</td>
                </tr>
            `;
        }).join('');

        // Add direct click handlers to each row
        const rows = gamesTableBody.querySelectorAll('.game-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                console.log('Row clicked directly');
                console.log('Row dataset:', row.dataset);
                console.log('Row data-id:', row.getAttribute('data-id'));
                const gameId = row.getAttribute('data-id');
                handleGameClick(e, gameId);
            });
        });
    }

    // Handle game clicks
    window.handleGameClick = function(event, gameId) {
        event.preventDefault();
        console.log('handleGameClick called');
        console.log('Event:', event);
        console.log('Game ID:', gameId);
        console.log('Current URL:', window.location.href);
        console.log('Navigating to:', `game.html?id=${gameId}`);

        // Add a small delay to ensure logs are visible
        setTimeout(() => {
            window.location.href = `game.html?id=${gameId}`;
        }, 100);
    };

    async function handleFileDrop(e) {
        e.preventDefault();
        if (dropZone) dropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    }

    async function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    }

    async function uploadFile(file) {
        if (!file.name.endsWith('.pgn')) {
            alert('Please upload a PGN file');
            return;
        }

        const formData = new FormData();
        formData.append('pgnFile', file);

        try {
            console.log('Uploading file...');
            const response = await fetch(`${CONFIG.API_URL}/games/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            console.log('Upload result:', result);

            if (modal) modal.style.display = 'none';
            loadGames();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        }
    }

    // Load games on page load
    loadGames();
});
