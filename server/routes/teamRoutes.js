const express = require('express');
const router = express.Router();
const { protect, coach } = require('../middleware/authMiddleware');
const Team = require('../models/Team');
const User = require('../models/User');
const Event = require('../models/Event');

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private/Coach
router.post('/', protect, coach, async (req, res) => {
  try {
    const { name, type, description } = req.body;

    // Check if team already exists
    const teamExists = await Team.findOne({ name });
    if (teamExists) {
      return res.status(400).json({ message: 'Team already exists' });
    }

    // Create new team
    const team = await Team.create({
      name,
      type,
      description,
      coaches: [req.user._id],
      players: []
    });

    if (team) {
      res.status(201).json(team);
    } else {
      res.status(400).json({ message: 'Invalid team data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/teams
// @desc    Get all teams
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let teams;
    
    // If user is a coach, get all teams
    if (req.user.role === 'Trainer') {
      teams = await Team.find({})
        .populate('coaches', 'name email')
        .populate('players', 'name email role position');
    } else {
      // If user is a player, get only teams they belong to
      teams = await Team.find({ 
        $or: [
          { players: req.user._id },
          { coaches: req.user._id }
        ]
      })
        .populate('coaches', 'name email')
        .populate('players', 'name email role position');
    }
    
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/teams/:id
// @desc    Get team by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // First find the team without population to check membership
    const teamCheck = await Team.findById(req.params.id);
    
    if (!teamCheck) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is authorized to view this team
    // For players, check if they are in the team
    const isAuthorized = req.user.role === 'Trainer' || 
                        teamCheck.players.some(p => p.toString() === req.user._id.toString()) ||
                        teamCheck.coaches.some(c => c.toString() === req.user._id.toString());
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this team' });
    }
    
    // Now populate and return the full team data
    const team = await Team.findById(req.params.id)
      .populate('coaches', 'name email')
      .populate('players', 'name email role birthDate position');
    
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private/Coach
router.put('/:id', protect, coach, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    const team = await Team.findById(req.params.id);
    
    if (team) {
      // Check if coach is authorized to update this team
      if (team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
        team.name = name || team.name;
        team.type = type || team.type;
        team.description = description || team.description;
        
        const updatedTeam = await team.save();
        res.json(updatedTeam);
      } else {
        res.status(403).json({ message: 'Not authorized to update this team' });
      }
    } else {
      res.status(404).json({ message: 'Team not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/teams/:id/players
// @desc    Add player to team
// @access  Private/Coach
router.post('/:id/players', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;
    
    const team = await Team.findById(req.params.id);
    const player = await User.findById(playerId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Check if coach is authorized to update this team
    if (!team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }
    
    // Check if player is already in the team
    if (team.players.includes(playerId)) {
      return res.status(400).json({ message: 'Player already in team' });
    }
    
    // Add player to team
    team.players.push(playerId);
    await team.save();
    
    // Add team to player's teams
    if (!player.teams.includes(team._id)) {
      player.teams.push(team._id);
      await player.save();
    }
    
    // Add player to all future events of this team
    const now = new Date();
    const futureEvents = await Event.find({
      $or: [
        { team: team._id },
        { teams: team._id },
        { organizingTeam: team._id }
      ],
      startTime: { $gte: now }
    });
    
    for (const event of futureEvents) {
      // Check if player is not already invited or already in the event
      const isAlreadyInvited = event.invitedPlayers.some(p => p.toString() === playerId.toString());
      const isAlreadyAttending = event.attendingPlayers.some(p => p.toString() === playerId.toString());
      const isAlreadyDeclined = event.declinedPlayers.some(p => p.toString() === playerId.toString());
      const isGuestPlayer = event.guestPlayers.some(g => g.player.toString() === playerId.toString());
      
      let needsSave = false;
      
      // Add to invited players if not already in any list
      if (!isAlreadyInvited && !isAlreadyAttending && !isAlreadyDeclined && !isGuestPlayer) {
        event.invitedPlayers.push(playerId);
        needsSave = true;
      }
      
      // Remove from uninvited players if present
      if (event.uninvitedPlayers && event.uninvitedPlayers.length > 0) {
        const uninvitedIndex = event.uninvitedPlayers.findIndex(p => p.toString() === playerId.toString());
        if (uninvitedIndex !== -1) {
          event.uninvitedPlayers.splice(uninvitedIndex, 1);
          needsSave = true;
        }
      }
      
      // Only save if we made changes
      if (needsSave) {
        await event.save();
      }
    }

    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/teams/:id/players/:playerId
// @desc    Remove player from team
// @access  Private/Coach
router.delete('/:id/players/:playerId', protect, coach, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    const player = await User.findById(req.params.playerId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Check if coach is authorized to update this team
    if (!team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }
    
    // Remove player from team
    team.players = team.players.filter(
      p => p.toString() !== req.params.playerId
    );
    await team.save();
    
    // Remove team from player's teams
    player.teams = player.teams.filter(
      t => t.toString() !== team._id.toString()
    );
    await player.save();
    
    res.json({ message: 'Player removed from team' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/teams/:id/coaches
// @desc    Add coach to team
// @access  Private/Coach
router.post('/:id/coaches', protect, coach, async (req, res) => {
  try {
    const { coachId } = req.body;
    
    const team = await Team.findById(req.params.id);
    const newCoach = await User.findById(coachId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (!newCoach) {
      return res.status(404).json({ message: 'Coach not found' });
    }
    
    // Check if user is a coach
    if (newCoach.role !== 'Trainer') {
      return res.status(400).json({ message: 'User is not a coach' });
    }
    
    // Check if coach is already in the team
    if (team.coaches.includes(coachId)) {
      return res.status(400).json({ message: 'Coach already in team' });
    }
    
    // Add coach to team
    team.coaches.push(coachId);
    await team.save();
    
    // Add team to coach's teams
    if (!newCoach.teams.includes(team._id)) {
      newCoach.teams.push(team._id);
      await newCoach.save();
    }
    
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;