const parsePGN = (pgnContent) => {
    const games = [];
    let currentHeaders = {};
    let currentMoves = '';
    
    // Function to save current game and reset state
    const saveCurrentGame = () => {
        if (Object.keys(currentHeaders).length > 0) {
            // Reconstruct PGN with original case
            const headerLines = Object.values(currentHeaders)
                .map(({ value, originalKey }) => `[${originalKey} "${value}"]`)
                .join('\n');
                
            const game = {
                ...Object.entries(currentHeaders).reduce((acc, [key, { value }]) => {
                    acc[key] = value;
                    return acc;
                }, {}),
                moves: currentMoves || '',
                pgn: headerLines + (currentMoves ? '\n\n' + currentMoves : '')
            };
            games.push(game);
            
            // Reset state
            currentHeaders = {};
            currentMoves = '';
        }
    };
    
    // Split the PGN content into lines
    const lines = pgnContent.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Parse headers
        if (line.startsWith('[')) {
            // If we find a header and already have moves, this is a new game
            if (currentMoves && Object.keys(currentHeaders).length > 0) {
                saveCurrentGame();
            }
            
            const match = line.match(/\[(\w+)\s+"(.+)"\]/);
            if (match) {
                const [_, key, value] = match;
                // Store original case for header key
                const originalKey = key;
                currentHeaders[key.toLowerCase()] = {
                    value,
                    originalKey
                };
            }
        }
        // If we hit moves (line doesn't start with [ and isn't empty)
        else if (line.length > 0) {
            if (currentMoves) {
                currentMoves += ' ' + line;
            } else {
                currentMoves = line;
            }
        }
    }
    
    // Add the last game
    saveCurrentGame();
    
    return games;
};

module.exports = { parsePGN };
