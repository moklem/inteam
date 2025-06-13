const express = require('express');
const router = express.Router();
const { protect, coach, player } = require('../middleware/authMiddleware');
const PlayerAttribute = require('../models/PlayerAttribute');
const User = require('../models/User');
const Team = require('../models/Team');

// @route   POST /api/attributes
// @desc    Create a new player attribute
// @access  Private/Coach
router.post('/', protect, coach, async (req, res) => {
  try {
    const { 
      player: playerId, 
      attributeName, 
      category,
      numericValue, 
      textValue, 
      notes,
      team: teamId
    } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if coach is authorized to create attributes for this team
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to create attributes for this team' });
    }

    // Check if player is in the team
    if (!team.players.includes(playerId)) {
      return res.status(400).json({ message: 'Player is not in this team' });
    }

    // Check if attribute already exists for this player in this team
    const existingAttribute = await PlayerAttribute.findOne({
      player: playerId,
      attributeName,
      team: teamId
    });

    if (existingAttribute) {
      return res.status(400).json({ message: 'Attribute already exists for this player in this team' });
    }

    // Create new attribute
    const attribute = await PlayerAttribute.create({
      player: playerId,
      attributeName,
      category: category || 'Other',
      numericValue,
      textValue,
      notes,
      updatedBy: req.user._id,
      team: teamId,
      history: []
    });

    if (attribute) {
      res.status(201).json(attribute);
    } else {
      res.status(400).json({ message: 'Invalid attribute data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/player/:playerId
// @desc    Get all attributes for a player
// @access  Private/Coach
router.get('/player/:playerId', protect, coach, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    // Check if player exists
    const player = await User.findById(req.params.playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Build filter
    const filter = { player: req.params.playerId };
    
    if (teamId) {
      filter.team = teamId;
      
      // Check if coach is authorized to view attributes for this team
      const team = await Team.findById(teamId);
      if (!team || !team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to view attributes for this team' });
      }
    } else {
      // Get teams coached by this user
      const teams = await Team.find({ coaches: req.user._id });
      const teamIds = teams.map(team => team._id);
      
      filter.team = { $in: teamIds };
    }
    
    const attributes = await PlayerAttribute.find(filter)
      .populate('player', 'name email')
      .populate('updatedBy', 'name email')
      .populate('team', 'name type')
      .sort({ category: 1, attributeName: 1 });
    
    res.json(attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/team/:teamId
// @desc    Get all attributes for a team
// @access  Private/Coach
router.get('/team/:teamId', protect, coach, async (req, res) => {
  try {
    const { attributeName, category } = req.query;
    
    // Check if team exists
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if coach is authorized to view attributes for this team
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view attributes for this team' });
    }
    
    // Build filter
    const filter = { team: req.params.teamId };
    
    if (attributeName) {
      filter.attributeName = attributeName;
    }
    
    if (category) {
      filter.category = category;
    }
    
    const attributes = await PlayerAttribute.find(filter)
      .populate('player', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ player: 1, category: 1, attributeName: 1 });
    
    res.json(attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/:id
// @desc    Get attribute by ID
// @access  Private/Coach
router.get('/:id', protect, coach, async (req, res) => {
  try {
    const attribute = await PlayerAttribute.findById(req.params.id)
      .populate('player', 'name email')
      .populate('updatedBy', 'name email')
      .populate('team', 'name type')
      .populate({
        path: 'history.updatedBy',
        select: 'name email'
      });
    
    if (attribute) {
      // Check if coach is authorized to view this attribute
      const team = await Team.findById(attribute.team);
      
      if (!team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to view this attribute' });
      }
      
      res.json(attribute);
    } else {
      res.status(404).json({ message: 'Attribute not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/attributes/:id
// @desc    Update attribute
// @access  Private/Coach
router.put('/:id', protect, coach, async (req, res) => {
  try {
    const { 
      numericValue, 
      textValue, 
      notes,
      category
    } = req.body;
    
    const attribute = await PlayerAttribute.findById(req.params.id);
    
    if (attribute) {
      // Check if coach is authorized to update this attribute
      const team = await Team.findById(attribute.team);
      
      if (!team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to update this attribute' });
      }
      
      // Update attribute
      if (numericValue !== undefined) attribute.numericValue = numericValue;
      if (textValue !== undefined) attribute.textValue = textValue;
      if (notes !== undefined) attribute.notes = notes;
      if (category) attribute.category = category;
      
      attribute.updatedBy = req.user._id;
      
      const updatedAttribute = await attribute.save();
      res.json(updatedAttribute);
    } else {
      res.status(404).json({ message: 'Attribute not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/attributes/:id
// @desc    Delete attribute
// @access  Private/Coach
router.delete('/:id', protect, coach, async (req, res) => {
  try {
    const attribute = await PlayerAttribute.findById(req.params.id);
    
    if (attribute) {
      // Check if coach is authorized to delete this attribute
      const team = await Team.findById(attribute.team);
      
      if (!team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to delete this attribute' });
      }
      
      await attribute.remove();
      res.json({ message: 'Attribute removed' });
    } else {
      res.status(404).json({ message: 'Attribute not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/progress/:playerId/:attributeName
// @desc    Get player progress for a specific attribute
// @access  Private/Coach
router.get('/progress/:playerId/:attributeName', protect, coach, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    // Check if player exists
    const player = await User.findById(req.params.playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Build filter
    const filter = { 
      player: req.params.playerId,
      attributeName: req.params.attributeName
    };
    
    if (teamId) {
      filter.team = teamId;
      
      // Check if coach is authorized to view attributes for this team
      const team = await Team.findById(teamId);
      if (!team || !team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to view attributes for this team' });
      }
    } else {
      // Get teams coached by this user
      const teams = await Team.find({ coaches: req.user._id });
      const teamIds = teams.map(team => team._id);
      
      filter.team = { $in: teamIds };
    }
    
    const attribute = await PlayerAttribute.findOne(filter)
      .populate('player', 'name email')
      .populate('team', 'name type')
      .populate({
        path: 'history.updatedBy',
        select: 'name email'
      });
    
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found' });
    }
    
    // Format progress data
    const progress = {
      player: attribute.player,
      attributeName: attribute.attributeName,
      team: attribute.team,
      currentValue: attribute.numericValue || attribute.textValue,
      history: attribute.history.map(h => ({
        value: h.value,
        notes: h.notes,
        updatedBy: h.updatedBy,
        updatedAt: h.updatedAt
      }))
    };
    
    res.json(progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;