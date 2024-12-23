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
                    <td class="actions">
                        <button class="download-btn" data-id="${gameId}" title="Download PGN">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                    <td class="actions">
                        <button class="delete-btn" data-id="${gameId}" title="Delete game">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add click handlers to each row
        const rows = gamesTableBody.querySelectorAll('.game-row');
        rows.forEach(row => {
            row.addEventListener('click', async (e) => {
                // Don't navigate if clicking the delete or download button
                if (e.target.closest('.delete-btn') || e.target.closest('.download-btn')) {
                    return;
                }

                const gameId = row.getAttribute('data-id');
                window.location.href = `/game.html?id=${gameId}`;
            });
        });

        // Add download button handlers
        const downloadButtons = gamesTableBody.querySelectorAll('.download-btn');
        downloadButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent row click
                const gameId = button.getAttribute('data-id');

                try {
                    const token = getToken();
                    const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/pgn`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    
                    // Get filename from Content-Disposition header or use default
                    const contentDisposition = response.headers.get('content-disposition');
                    const filename = contentDisposition
                        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                        : 'game.pgn';
                    
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                } catch (error) {
                    console.error('Error downloading PGN:', error);
                    alert('Error downloading PGN');
                }
            });
        });

        // Add delete button handlers
        const deleteButtons = gamesTableBody.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent row click
                const gameId = button.getAttribute('data-id');

                if (confirm('Are you sure you want to delete this game?')) {
                    try {
                        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${getToken()}`
                            }
                        });

                        if (!response.ok) throw new Error('Failed to delete game');

                        // Remove the row from the table
                        const row = button.closest('.game-row');
                        row.remove();

                        // Check if table is empty
                        if (gamesTableBody.children.length === 0) {
                            if (emptyState) emptyState.style.display = 'block';
                            if (gamesTable) gamesTable.style.display = 'none';
                        }
                    } catch (error) {
                        console.error('Error deleting game:', error);
                        alert('Error deleting game');
                    }
                }
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

        // Show loading state
        const dropZoneText = document.querySelector('.file-upload-text');
        const originalText = dropZoneText.textContent;
        dropZoneText.textContent = 'Uploading...';
        
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
                // Success case
                const successMessage = `Successfully uploaded ${data.summary.savedGames} game${data.summary.savedGames !== 1 ? 's' : ''}`;
                let message = successMessage;
                
                // Add error information if any
                if (data.summary.failedGames > 0) {
                    message += `\n\nWarning: ${data.summary.failedGames} game${data.summary.failedGames !== 1 ? 's' : ''} failed to upload.`;
                    if (data.errors) {
                        message += '\n\nErrors:\n' + data.errors.join('\n');
                    }
                }

                alert(message);
                modal.style.display = 'none';
                loadGames();  // Reload games list
            } else {
                // Error case
                let errorMessage = 'Upload failed: ';
                if (data.error) {
                    errorMessage += data.error;
                    if (data.details && data.details.length > 0) {
                        errorMessage += '\n\nDetails:\n' + data.details.join('\n');
                    }
                } else {
                    errorMessage += 'Unknown error occurred';
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert(error.message || 'Error uploading file. Please ensure the file is a valid PGN format.');
        } finally {
            // Reset the upload text
            if (dropZoneText) {
                dropZoneText.textContent = originalText;
            }
        }
    }

    // Load games on page load
    loadGames();
});
