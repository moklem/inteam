const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect, coach } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'volleyballapp123', {
    expiresIn: '30d',
  });
};

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, birthDate, phoneNumber, position } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      birthDate,
      phoneNumber,
      position,
      teams: []
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teams: user.teams,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });
    
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teams: user.teams,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('teams', 'name type');
    
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        birthDate: user.birthDate,
        phoneNumber: user.phoneNumber,
        position: user.position,
        teams: user.teams
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      user.position = req.body.position || user.position;
      
      // Only update password if provided
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        teams: updatedUser.teams,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Coach
router.get('/', protect, coach, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').populate('teams', 'name type');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/team/:teamId
// @desc    Get users by team
// @access  Private/Coach
router.get('/team/:teamId', protect, coach, async (req, res) => {
  try {
    const users = await User.find({ teams: req.params.teamId })
      .select('-password')
      .populate('teams', 'name type');
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/youth
// @desc    Get all youth players
// @access  Private/Coach
router.get('/youth', protect, coach, async (req, res) => {
  try {
    const users = await User.find({ role: 'Jugendspieler' })
      .select('-password')
      .populate('teams', 'name type');
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/create-player
// @desc    Create a new player (Coach only)
// @access  Private/Coach
router.post('/create-player', protect, coach, async (req, res) => {
  try {
    const { name, email, password, role, birthDate, phoneNumber, position } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Bitte füllen Sie alle Pflichtfelder aus' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      birthDate,
      phoneNumber,
      position,
      teams: [],
      createdBy: req.user._id // Track which coach created this player
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        phoneNumber: user.phoneNumber,
        birthDate: user.birthDate,
        teams: user.teams,
        message: 'Spieler wurde erfolgreich erstellt'
      });
    } else {
      res.status(400).json({ message: 'Ungültige Benutzerdaten' });
    }
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Spielers' });
  }
});

module.exports = router;