# MyChessGames

An online service to store and analyze your chess games from various platforms like chess.com and lichess.org.

## Project Structure

```
mychessgames/
├── client/           # Frontend application
│   ├── css/         # Stylesheets
│   │   ├── styles.css  # Custom styles
│   │   └── template.css # Base template styles
│   ├── js/          # JavaScript files
│   ├── index.html   # Main HTML file
│   └── README.md    # Client documentation
├── server/          # Backend application
│   ├── src/         # Source code
│   │   ├── models/  # Database models
│   │   ├── routes/  # API routes
│   │   └── app.js   # Main server file
│   └── README.md    # Server documentation
└── README.md       # This file
```

## Development Setup

1. Start the backend server:
```bash
cd server
npm install
npm run dev  # Runs on http://localhost:3000
```

2. Start the frontend client:
```bash
cd client
npm install
npm run dev  # Runs on http://localhost:5000
```

## Features

- Secure user authentication
- Upload and manage PGN files
- Analyze and review chess games
- Search and filter games
- Interactive chess board for game review
- Game database with tags and notes
- Opening repertoire analysis

## Tech Stack

- Backend: Node.js, Express, MongoDB
- Frontend: Vanilla JavaScript
- Authentication: JWT
- Chess Logic: chess.js, chessboard.js
