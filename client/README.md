# MyChessGames Client

Frontend client for the MyChessGames platform, providing a user interface for chess game management and analysis.

## Prerequisites

- Node.js (v14 or higher)
- serve (installed via npm)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the API URL in `js/config.js` if needed:
```javascript
const CONFIG = {
    API_URL: 'http://localhost:3000/api'
};
```

3. Start the client:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The client will be available at `http://localhost:5000`.

## Project Structure

```
client/
├── css/
│   └── styles.css
├── js/
│   ├── auth.js
│   └── config.js
├── index.html
├── package.json
└── README.md
```

## Features

- User authentication (login/register)
- Responsive design
- Integration with MyChessGames API

## Building chessground
### Set NODE path
export PATH="/opt/homebrew/bin:$PATH"

### Install pnpm globally
npm install -g pnpm

### Navigate to the chessground directory
cd /Users/varun/Personal/code/mychessgames/client/chessground

### Install dependencies
pnpm install

### Build chessground
pnpm run dist