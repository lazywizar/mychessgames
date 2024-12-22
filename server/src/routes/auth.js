const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// Register route
router.post('/register', async (req, res) => {
    logger.info({
        message: 'Registration attempt',
        body: req.body,
        timestamp: new Date().toISOString()
    });

    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            logger.warn({
                message: 'Registration failed - Missing required fields',
                providedFields: Object.keys(req.body),
                timestamp: new Date().toISOString()
            });
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
            logger.warn({
                message: 'Registration failed - User exists',
                username,
                email,
                timestamp: new Date().toISOString()
            });
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
        logger.info({
            message: 'User registered successfully',
            userId: user._id,
            username,
            timestamp: new Date().toISOString()
        });

        // Create JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
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
        logger.error({
            message: 'Registration error',
            error: error.message,
            stack: error.stack,
            body: req.body,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ 
            message: 'Error creating user', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    logger.info({
        message: 'Login attempt',
        body: req.body,
        timestamp: new Date().toISOString()
    });

    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            logger.warn({
                message: 'Login failed - Missing required fields',
                providedFields: Object.keys(req.body),
                timestamp: new Date().toISOString()
            });
            return res.status(400).json({ 
                message: 'Username and password are required',
                missingFields: {
                    username: !username,
                    password: !password
                }
            });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            logger.warn({
                message: 'Login failed - User not found',
                username,
                timestamp: new Date().toISOString()
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logger.warn({
                message: 'Login failed - Invalid password',
                username,
                timestamp: new Date().toISOString()
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        logger.info({
            message: 'User logged in successfully',
            userId: user._id,
            username,
            timestamp: new Date().toISOString()
        });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        logger.error({
            message: 'Login error',
            error: error.message,
            stack: error.stack,
            body: req.body,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ 
            message: 'Error logging in', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
