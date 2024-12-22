document.addEventListener('DOMContentLoaded', () => {
    const uploadModal = document.getElementById('uploadModal');
    const closeModal = document.getElementById('closeModal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const gamesContainer = document.getElementById('gamesContainer');

    // Function to show empty state
    function showEmptyState() {
        gamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chess empty-state-icon"></i>
                <h2>No Games Yet</h2>
                <p class="empty-state-text">Upload your PGN files to start building your chess game collection</p>
                <button class="btn-primary" onclick="document.querySelector('.add-games-button').click()">
                    <i class="fas fa-plus"></i>
                    Add Games
                </button>
            </div>
        `;
    }

    // Function to show games table
    function showGamesTable(games) {
        const tableHTML = `
            <table class="games-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>White</th>
                        <th>Black</th>
                        <th>Result</th>
                        <th>Event</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map(game => `
                        <tr>
                            <td>${game.date || 'N/A'}</td>
                            <td>${game.white || 'N/A'}</td>
                            <td>${game.black || 'N/A'}</td>
                            <td>${game.result || 'N/A'}</td>
                            <td>${game.event || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        gamesContainer.innerHTML = tableHTML;
    }

    // Load games from the server
    async function loadGames() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/games`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load games');
            }

            const games = await response.json();
            if (games.length === 0) {
                showEmptyState();
            } else {
                showGamesTable(games);
            }
        } catch (error) {
            console.error('Error loading games:', error);
            showEmptyState();
        }
    }

    // Upload PGN file
    async function uploadPGN(file) {
        try {
            const formData = new FormData();
            formData.append('pgn', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/games/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload PGN');
            }

            // Reload games after successful upload
            loadGames();
            uploadModal.classList.remove('active');
        } catch (error) {
            console.error('Error uploading PGN:', error);
            alert('Failed to upload PGN file. Please try again.');
        }
    }

    // Event Listeners
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-games-button')) {
            uploadModal.classList.add('active');
        }
    });

    closeModal.addEventListener('click', () => {
        uploadModal.classList.remove('active');
    });

    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
        }
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadPGN(file);
        }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.pgn')) {
            uploadPGN(file);
        } else {
            alert('Please upload a PGN file.');
        }
    });

    // Click handler for the file upload area
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Initial load of games
    loadGames();
});
