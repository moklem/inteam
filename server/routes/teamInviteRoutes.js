const express = require('express');
const router = express.Router();
const { protect, coach } = require('../middleware/authMiddleware');
const TeamInvite = require('../models/TeamInvite');
const Team = require('../models/Team');

// @route   POST /api/team-invites
// @desc    Create a new team invite
// @access  Private/Coach
router.post('/', protect, coach, async (req, res) => {
  try {
    const { teamId, description, expiresIn, maxUsage } = req.body;
    
    // Verify team exists and coach has access
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if coach is authorized for this team
    if (!team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to create invites for this team' });
    }
    
    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    }
    
    // Create invite
    const invite = await TeamInvite.create({
      team: teamId,
      createdBy: req.user._id,
      inviteCode: TeamInvite.generateInviteCode(),
      description,
      expiresAt,
      maxUsage: maxUsage || null
    });
    
    // Populate team info
    await invite.populate('team', 'name type');
    
    // Generate full invite URL
    const inviteUrl = `${process.env.CLIENT_URL || 'https://inteamfe.onrender.com'}/register?invite=${invite.inviteCode}`;
    
    res.status(201).json({
      ...invite.toObject(),
      inviteUrl
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/team-invites/team/:teamId
// @desc    Get all invites for a team
// @access  Private/Coach
router.get('/team/:teamId', protect, coach, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if coach is authorized for this team
    if (!team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view invites for this team' });
    }
    
    const invites = await TeamInvite.find({ team: req.params.teamId })
      .populate('createdBy', 'name')
      .populate('usedBy.user', 'name email')
      .sort('-createdAt');
    
    // Add invite URLs
    const invitesWithUrls = invites.map(invite => ({
      ...invite.toObject(),
      inviteUrl: `${process.env.CLIENT_URL || 'https://inteamfe.onrender.com'}/register?invite=${invite.inviteCode}`
    }));
    
    res.json(invitesWithUrls);
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/team-invites/validate/:code
// @desc    Validate an invite code
// @access  Public
router.get('/validate/:code', async (req, res) => {
  try {
    const invite = await TeamInvite.findOne({ inviteCode: req.params.code })
      .populate('team', 'name type');
    
    if (!invite) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Invite code not found' 
      });
    }
    
    if (!invite.isValid()) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Invite is no longer valid' 
      });
    }
    
    res.json({
      valid: true,
      team: invite.team,
      description: invite.description
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/team-invites/:id
// @desc    Deactivate an invite
// @access  Private/Coach
router.delete('/:id', protect, coach, async (req, res) => {
  try {
    const invite = await TeamInvite.findById(req.params.id).populate('team');
    
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    
    // Check if coach is authorized
    if (!invite.team.coaches.some(coach => coach.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this invite' });
    }
    
    invite.isActive = false;
    await invite.save();
    
    res.json({ message: 'Invite deactivated successfully' });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/team-invites/my-invites
// @desc    Get all active invites for teams the coach manages
// @access  Private/Coach
router.get('/my-invites', protect, coach, async (req, res) => {
  try {
    // Find all teams where the user is a coach
    const teams = await Team.find({ coaches: req.user._id });
    const teamIds = teams.map(team => team._id);
    
    // Find all active invites for these teams
    const invites = await TeamInvite.find({ 
      team: { $in: teamIds },
      isActive: true
    })
      .populate('team', 'name type')
      .sort('-createdAt');
    
    // Add invite URLs
    const invitesWithUrls = invites.map(invite => ({
      ...invite.toObject(),
      inviteUrl: `${process.env.CLIENT_URL || 'https://inteamfe.onrender.com'}/register?invite=${invite.inviteCode}`
    }));
    
    res.json(invitesWithUrls);
  } catch (error) {
    console.error('Get my invites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;