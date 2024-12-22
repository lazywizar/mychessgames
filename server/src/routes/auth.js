const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Register route
router.post('/register', async (req, res) => {
    logger.info(`Registration attempt for user: ${req.body.username}`);

    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            logger.warn(`Registration failed - Missing required fields for user: ${username}`);
            return res.status(400).json({ 
                message: 'All fields are required',
                missingFields: {
                    username: !username,
                    email: !email,
                    password: !password
                }
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            logger.warn(`Registration failed - User exists: ${username}`);
            return res.status(400).json({ 
                message: 'User with this email or username already exists',
                field: existingUser.email === email ? 'email' : 'username'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();
        logger.info(`User registered successfully: ${username}`);

        // Create JWT token
        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        res.status(500).json({ 
            message: 'Error creating user', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    logger.info(`Login attempt for user: ${req.body.username}`);

    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            logger.warn('Login failed - Missing credentials');
            return res.status(400).json({ 
                message: 'Username and password are required' 
            });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            logger.warn(`Login failed - User not found: ${username}`);
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logger.warn(`Login failed - Invalid password for user: ${username}`);
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Create token
        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(`User logged in successfully: ${username}`);
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({ 
            message: 'Error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
