const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes that require authentication
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'volleyballapp123');

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user is a coach
const coach = (req, res, next) => {
  if (req.user && req.user.role === 'Trainer') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a coach' });
  }
};

// Middleware to check if user is a player or youth player
const player = (req, res, next) => {
  if (req.user && (req.user.role === 'Spieler' || req.user.role === 'Jugendspieler')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a player' });
  }
};

module.exports = { protect, coach, player };