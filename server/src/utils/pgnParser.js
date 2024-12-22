const parsePGN = (pgnContent) => {
    const games = [];
    let currentGame = {};
    let currentHeaders = {};
    
    // Split the PGN content into lines
    const lines = pgnContent.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Parse headers
        if (line.startsWith('[')) {
            const match = line.match(/\[(\w+)\s+"(.+)"\]/);
            if (match) {
                const [_, key, value] = match;
                currentHeaders[key.toLowerCase()] = value;
            }
        }
        // If we hit moves (line doesn't start with [ and isn't empty)
        else if (line.length > 0) {
            // Store the current game and start a new one
            if (Object.keys(currentHeaders).length > 0) {
                currentGame = {
                    ...currentHeaders,
                    moves: line,
                    pgn: `${Object.entries(currentHeaders)
                        .map(([key, value]) => `[${key} "${value}"]`)
                        .join('\n')}\n\n${line}`
                };
                games.push(currentGame);
                currentHeaders = {};
            }
        }
    }
    
    // Add the last game if there are headers
    if (Object.keys(currentHeaders).length > 0) {
        currentGame = {
            ...currentHeaders,
            moves: '',
            pgn: Object.entries(currentHeaders)
                .map(([key, value]) => `[${key} "${value}"]`)
                .join('\n')
        };
        games.push(currentGame);
    }
    
    return games;
};

module.exports = { parsePGN };
