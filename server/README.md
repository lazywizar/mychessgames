# MyChessGames Server

Backend server for the MyChessGames platform, providing API endpoints for user authentication and chess game management.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
CLIENT_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/mychessgames
JWT_SECRET=your-secret-key-change-this-in-production
```

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Health Check
- GET `/health` - Check server status

## Environment Variables

- `PORT` - Server port (default: 3000)
- `CLIENT_URL` - Frontend client URL for CORS
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token generation
