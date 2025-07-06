const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect, coach } = require('../middleware/authMiddleware');
const User = require('../models/User');
const TeamInvite = require('../models/TeamInvite');
const Team = require('../models/Team');
const Event = require('../models/Event');
const PlayerAttribute = require('../models/PlayerAttribute');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'volleyballapp123', {
    expiresIn: '30d',
  });
};

// @route   POST /api/users/verify-coach-password
// @desc    Verify coach registration password
// @access  Public
router.post('/verify-coach-password', async (req, res) => {
  try {
    const { password } = req.body;
    const coachRegistrationPassword = process.env.COACH_REGISTRATION_PASSWORD;

    if (!coachRegistrationPassword) {
      return res.status(500).json({ 
        message: 'Coach registration is not configured. Please contact administrator.' 
      });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Simple string comparison - you could also use bcrypt here for extra security
    if (password === coachRegistrationPassword) {
      res.status(200).json({ 
        success: true, 
        message: 'Password verified' 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }
  } catch (error) {
    console.error('Coach password verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/register
// @desc    Register a new user (with optional invite code)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, birthDate, phoneNumber, position, inviteCode } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Default to 'Spieler' if no role is provided
    const userRole = role || 'Spieler';
    
    // Initialize teams array
    let userTeams = [];
    let inviteUsed = null;

    // Handle invite code if provided
    if (inviteCode) {
      const invite = await TeamInvite.findOne({ inviteCode }).populate('team');
      
      if (!invite) {
        return res.status(400).json({ message: 'Invalid invite code' });
      }
      
      if (!invite.isValid()) {
        return res.status(400).json({ message: 'Invite is no longer valid' });
      }
      
      // Add team to user's teams
      userTeams = [invite.team._id];
      inviteUsed = invite;
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      birthDate,
      phoneNumber,
      position,
      teams: userTeams
    });

    if (user) {
      // If invite was used, update the invite and team
      if (inviteUsed) {
        // Mark invite as used
        await inviteUsed.use(user._id);
        
        // Add user to team
        await Team.findByIdAndUpdate(
          inviteUsed.team._id,
          { $push: { players: user._id } }
        );
      }
      
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/register-coach
// @desc    Register a new coach (requires password verification)
// @access  Public
router.post('/register-coach', async (req, res) => {
  try {
    const { name, email, password, birthDate, phoneNumber, position } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new coach user
    const user = await User.create({
      name,
      email,
      password,
      role: 'Trainer', // Force role to be Trainer
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
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
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
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Coach
router.get('/:id', protect, coach, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teams', 'name type');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
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

// @route   GET /api/users/players
// @desc    Get all players (Spieler and Jugendspieler)
// @access  Private/Coach
router.get('/players', protect, coach, async (req, res) => {
  try {
    console.log('Fetching players for coach:', req.user._id);
    
    // First, try without populate to see if that's the issue
    const users = await User.find({ 
      role: { $in: ['Spieler', 'Jugendspieler'] } 
    })
      .select('-password');
    
    // Then try to populate teams separately with error handling
    let populatedUsers = users;
    try {
      populatedUsers = await User.populate(users, {
        path: 'teams',
        select: 'name type',
        // Add this to handle missing team references
        options: { strictPopulate: false }
      });
    } catch (populateError) {
      console.error('Error populating teams:', populateError);
      // Continue without populated teams rather than failing completely
    }
    
    console.log(`Found ${populatedUsers.length} players`);
    
    res.json(populatedUsers);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ 
      message: 'Server error fetching players',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      // Update fields if provided
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      user.position = req.body.position || user.position;
      
      // Update birthDate if provided
      if (req.body.birthDate) {
        user.birthDate = req.body.birthDate;
      }
      
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
        birthDate: updatedUser.birthDate,
        phoneNumber: updatedUser.phoneNumber,
        position: updatedUser.position,
        teams: updatedUser.teams
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update player details (Coach only)
// @access  Private/Coach
router.put('/:id', protect, coach, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Spieler nicht gefunden' });
    }
    
    // Prevent coaches from editing other coaches
    if (user.role === 'Trainer') {
      return res.status(403).json({ message: 'Trainer können nicht bearbeitet werden' });
    }
    
    // Update fields if provided
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
    if (req.body.position !== undefined) user.position = req.body.position;
    if (req.body.birthDate !== undefined) user.birthDate = req.body.birthDate;
    if (req.body.role !== undefined) user.role = req.body.role;
    
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
      birthDate: updatedUser.birthDate,
      phoneNumber: updatedUser.phoneNumber,
      position: updatedUser.position,
      teams: updatedUser.teams
    });
  } catch (error) {
    console.error('Player update error:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Spielers' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user completely from system
// @access  Private/Coach
router.delete('/:id', protect, coach, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting coaches (optional - for safety)
    if (userToDelete.role === 'Trainer') {
      return res.status(400).json({ message: 'Cannot delete coach users' });
    }
    
    // Remove user from all teams
    await Team.updateMany(
      { players: req.params.id },
      { $pull: { players: req.params.id } }
    );
    
    // Remove user from all events (invited, attending, declined)
    await Event.updateMany(
      { invitedPlayers: req.params.id },
      { $pull: { invitedPlayers: req.params.id } }
    );
    
    await Event.updateMany(
      { attendingPlayers: req.params.id },
      { $pull: { attendingPlayers: req.params.id } }
    );
    
    await Event.updateMany(
      { declinedPlayers: req.params.id },
      { $pull: { declinedPlayers: req.params.id } }
    );
    
    // Remove user from guest players in events
    await Event.updateMany(
      { 'guestPlayers.player': req.params.id },
      { $pull: { guestPlayers: { player: req.params.id } } }
    );
    
    // Delete all player attributes
    await PlayerAttribute.deleteMany({ player: req.params.id });
    
    // Finally, delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;