const express = require('express');
const router = express.Router();
const TrainingPool = require('../models/TrainingPool');
const PlayerAttribute = require('../models/PlayerAttribute');
const Event = require('../models/Event');
const User = require('../models/User');
const Team = require('../models/Team');
const { protect, coach } = require('../middleware/authMiddleware');

// Get all training pools (filtered by coach's teams)
router.get('/', protect, coach, async (req, res) => {
  try {
    // Get teams where user is a coach
    const teams = await Team.find({ coaches: req.user._id });
    const teamIds = teams.map(t => t._id);
    
    // Get pools for these teams and league pools
    const pools = await TrainingPool.find({
      $or: [
        { team: { $in: teamIds }, type: 'team' },
        { type: 'league' }
      ],
      active: true
    })
    .populate('team', 'name type')
    .populate('approvedPlayers.player', 'name email position')
    .populate('pendingApproval.player', 'name email position')
    .sort({ type: 1, name: 1 });
    
    res.json(pools);
  } catch (error) {
    console.error('Error fetching training pools:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Trainingspools' });
  }
});

// Get training pool by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const pool = await TrainingPool.findById(req.params.id)
      .populate('team', 'name type')
      .populate('approvedPlayers.player', 'name email position')
      .populate('pendingApproval.player', 'name email position')
      .populate('eligiblePlayers.player', 'name email position');
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    res.json(pool);
  } catch (error) {
    console.error('Error fetching training pool:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Trainingspools' });
  }
});

// Create a new training pool
router.post('/', protect, coach, async (req, res) => {
  try {
    const {
      name,
      type,
      teamId,
      leagueLevel,
      minAttendancePercentage
    } = req.body;
    
    // Get league level ranges if it's a league pool
    let minRating, maxRating;
    if (type === 'league') {
      const levels = TrainingPool.getLeagueLevels();
      const level = levels.find(l => l.name === leagueLevel);
      if (!level) {
        return res.status(400).json({ message: 'Ungültiges Liga-Level' });
      }
      minRating = level.min;
      maxRating = level.max;
    } else {
      // For team pools, use the team's average level or custom range
      minRating = req.body.minRating || 1;
      maxRating = req.body.maxRating || 99;
    }
    
    const pool = new TrainingPool({
      name,
      type,
      team: teamId,
      leagueLevel,
      minRating,
      maxRating,
      minAttendancePercentage: minAttendancePercentage || 75,
      createdBy: req.user._id
    });
    
    await pool.save();
    
    res.status(201).json(pool);
  } catch (error) {
    console.error('Error creating training pool:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Trainingspools' });
  }
});

// Update training pool settings
router.put('/:id', protect, coach, async (req, res) => {
  try {
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'name', 'minAttendancePercentage', 'active', 'minRating', 'maxRating'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        pool[field] = req.body[field];
      }
    });
    
    await pool.save();
    
    res.json(pool);
  } catch (error) {
    console.error('Error updating training pool:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Trainingspools' });
  }
});

// Request access to a training pool (for players)
router.post('/:id/request-access', protect, async (req, res) => {
  try {
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    // Get player's current rating and attendance
    const playerAttributes = await PlayerAttribute.findOne({
      player: req.user._id,
      attributeName: 'Overall'
    });
    
    if (!playerAttributes) {
      return res.status(400).json({ message: 'Spielerbewertung nicht gefunden' });
    }
    
    const playerRating = playerAttributes.overallRating || playerAttributes.numericValue;
    const attendancePercentage = playerAttributes.attendanceTracking?.threeMonthAttendance?.percentage || 0;
    
    // Check eligibility
    if (!pool.isPlayerEligible(req.user._id, playerRating, attendancePercentage)) {
      return res.status(400).json({ 
        message: 'Sie erfüllen nicht die Anforderungen für diesen Pool',
        requirements: {
          minRating: pool.minRating,
          maxRating: pool.maxRating,
          minAttendance: pool.minAttendancePercentage,
          yourRating: playerRating,
          yourAttendance: attendancePercentage
        }
      });
    }
    
    // Add to pending approval
    const success = pool.requestAccess(req.user._id, playerRating, attendancePercentage);
    
    if (!success) {
      return res.status(400).json({ message: 'Anfrage bereits vorhanden oder Spieler bereits im Pool' });
    }
    
    await pool.save();
    
    res.json({ message: 'Zugriffsanfrage erfolgreich gesendet' });
  } catch (error) {
    console.error('Error requesting pool access:', error);
    res.status(500).json({ message: 'Fehler beim Senden der Zugriffsanfrage' });
  }
});

// Approve player for training pool (coach only)
router.post('/:id/approve-player', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    const success = pool.approvePlayer(playerId, req.user._id);
    
    if (!success) {
      return res.status(400).json({ message: 'Spieler nicht in Warteliste gefunden' });
    }
    
    await pool.save();
    
    // Update player's eligibility tracking
    await PlayerAttribute.findOneAndUpdate(
      { player: playerId, attributeName: 'Overall' },
      {
        $push: {
          trainingPoolEligibility: {
            poolId: pool._id,
            poolName: pool.name,
            leagueLevel: pool.leagueLevel,
            eligible: true,
            qualifiedDate: new Date()
          }
        }
      }
    );
    
    res.json({ message: 'Spieler erfolgreich genehmigt' });
  } catch (error) {
    console.error('Error approving player:', error);
    res.status(500).json({ message: 'Fehler beim Genehmigen des Spielers' });
  }
});

// Reject player from pending list
router.post('/:id/reject-player', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    // Remove from pending
    pool.pendingApproval = pool.pendingApproval.filter(
      p => p.player.toString() !== playerId
    );
    
    await pool.save();
    
    res.json({ message: 'Spieleranfrage abgelehnt' });
  } catch (error) {
    console.error('Error rejecting player:', error);
    res.status(500).json({ message: 'Fehler beim Ablehnen der Anfrage' });
  }
});

// Remove player from pool
router.delete('/:id/remove-player/:playerId', protect, coach, async (req, res) => {
  try {
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    pool.removePlayer(req.params.playerId);
    await pool.save();
    
    // Update player's eligibility tracking
    await PlayerAttribute.findOneAndUpdate(
      { player: req.params.playerId, attributeName: 'Overall' },
      {
        $pull: {
          trainingPoolEligibility: { poolId: pool._id }
        }
      }
    );
    
    res.json({ message: 'Spieler erfolgreich entfernt' });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ message: 'Fehler beim Entfernen des Spielers' });
  }
});

// Get available pools for an event (for auto-invite)
router.get('/event/:eventId/available', protect, coach, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('team');
    
    if (!event) {
      return res.status(404).json({ message: 'Event nicht gefunden' });
    }
    
    // Get pools for this team and league pools
    const pools = await TrainingPool.find({
      $or: [
        { team: event.team._id, type: 'team' },
        { type: 'league' }
      ],
      active: true,
      'approvedPlayers.0': { $exists: true } // Has at least one approved player
    })
    .populate('approvedPlayers.player', 'name position')
    .select('name type leagueLevel approvedPlayers');
    
    // Filter out players already invited to the event
    const invitedPlayerIds = [
      ...event.invitedPlayers,
      ...event.attendingPlayers,
      ...event.declinedPlayers,
      ...event.guestPlayers.map(g => g.player)
    ].map(id => id.toString());
    
    const availablePools = pools.map(pool => {
      const availablePlayers = pool.approvedPlayers.filter(
        p => !invitedPlayerIds.includes(p.player._id.toString())
      );
      
      return {
        _id: pool._id,
        name: pool.name,
        type: pool.type,
        leagueLevel: pool.leagueLevel,
        availablePlayersCount: availablePlayers.length,
        availablePlayers: availablePlayers
      };
    }).filter(pool => pool.availablePlayersCount > 0);
    
    res.json(availablePools);
  } catch (error) {
    console.error('Error fetching available pools:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen verfügbarer Pools' });
  }
});

// Update player attendance (called after event ends)
router.post('/update-attendance', protect, async (req, res) => {
  try {
    const { eventId, attendingPlayerIds } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event nicht gefunden' });
    }
    
    // Get all invited players
    const allInvitedIds = [
      ...event.invitedPlayers,
      ...event.guestPlayers.map(g => g.player)
    ];
    
    // Update attendance for all players
    const updatePromises = allInvitedIds.map(async (playerId) => {
      const attended = attendingPlayerIds.includes(playerId.toString());
      
      // Update PlayerAttribute attendance tracking
      const attribute = await PlayerAttribute.findOne({
        player: playerId,
        attributeName: 'Overall'
      });
      
      if (attribute) {
        // Update total counts
        attribute.attendanceTracking.totalEvents += 1;
        if (attended) {
          attribute.attendanceTracking.attendedEvents += 1;
        }
        
        // Calculate 3-month attendance
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        // Get events from last 3 months
        const recentEvents = await Event.find({
          $or: [
            { invitedPlayers: playerId },
            { 'guestPlayers.player': playerId }
          ],
          startTime: { $gte: threeMonthsAgo },
          type: { $in: ['Training', 'Game'] }
        });
        
        const eventsInPeriod = recentEvents.length;
        const attendedInPeriod = recentEvents.filter(e => 
          e.attendingPlayers.includes(playerId) ||
          e.guestPlayers.some(g => g.player.equals(playerId) && g.status === 'accepted')
        ).length;
        
        attribute.attendanceTracking.threeMonthAttendance = {
          percentage: eventsInPeriod > 0 ? Math.round((attendedInPeriod / eventsInPeriod) * 100) : 0,
          eventsInPeriod,
          attendedInPeriod,
          lastUpdated: new Date()
        };
        
        // Update monthly breakdown
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const monthIndex = attribute.attendanceTracking.monthlyBreakdown.findIndex(
          m => m.month === monthKey
        );
        
        if (monthIndex >= 0) {
          attribute.attendanceTracking.monthlyBreakdown[monthIndex].totalEvents += 1;
          if (attended) {
            attribute.attendanceTracking.monthlyBreakdown[monthIndex].attendedEvents += 1;
          }
          attribute.attendanceTracking.monthlyBreakdown[monthIndex].percentage = 
            Math.round((attribute.attendanceTracking.monthlyBreakdown[monthIndex].attendedEvents / 
                       attribute.attendanceTracking.monthlyBreakdown[monthIndex].totalEvents) * 100);
        } else {
          attribute.attendanceTracking.monthlyBreakdown.push({
            month: monthKey,
            totalEvents: 1,
            attendedEvents: attended ? 1 : 0,
            percentage: attended ? 100 : 0
          });
        }
        
        await attribute.save();
      }
    });
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Anwesenheit erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Anwesenheit' });
  }
});

// Get league levels
router.get('/config/league-levels', protect, async (req, res) => {
  try {
    const levels = TrainingPool.getLeagueLevels();
    res.json(levels);
  } catch (error) {
    console.error('Error fetching league levels:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Liga-Level' });
  }
});

module.exports = router;