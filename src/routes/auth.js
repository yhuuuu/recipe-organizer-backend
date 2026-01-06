const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Register a new user
router.post(
  '/register',
  body('username').isLength({ min: 3, max: 30 }).trim().toLowerCase(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username or email already exists',
        });
      }

      // Create new user
      const user = new User({ username, email, password });
      await user.save();

      // Generate token
      const token = generateToken(user._id, user.username);

      console.log(`✅ User registered: ${username}`);
      res.status(201).json({
        id: user._id,
        username: user.username,
        email: user.email,
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  }
);

// POST /api/auth/login - Login user
router.post(
  '/login',
  body('username').notEmpty(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user and include password field
      const user = await User.findOne({ username }).select('+password');

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Compare passwords
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate token
      const token = generateToken(user._id, user.username);

      console.log(`✅ User logged in: ${username}`);
      res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }
);

module.exports = router;
