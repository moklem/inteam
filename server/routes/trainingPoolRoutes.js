const express = require('express');
const router = express.Router();
const TrainingPool = require('../models/TrainingPool');
const PlayerAttribute = require('../models/PlayerAttribute');
const Event = require('../models/Event');
const User = require('../models/User');
const Team = require('../models/Team');
const { protect, coach } = require('../middleware/authMiddleware');

// Get all training pools (accessible by both coaches and players)
router.get('/', protect, async (req, res) => {
  try {
    let pools;
    
    if (req.user.role === 'Trainer') {
      // Coaches see pools for their teams and all league pools
      const teams = await Team.find({ coaches: req.user._id });
      const teamIds = teams.map(t => t._id);
      
      pools = await TrainingPool.find({
        $or: [
          { team: { $in: teamIds }, type: 'team' },
          { type: 'league' }
        ],
        active: true
      });
    } else {
      // Players see pools they're in, pools for their teams, and all league pools
      const teams = await Team.find({ players: req.user._id });
      const teamIds = teams.map(t => t._id);
      
      pools = await TrainingPool.find({
        $or: [
          { team: { $in: teamIds }, type: 'team' },
          { type: 'league' },
          { 'approvedPlayers.player': req.user._id },
          { 'pendingApproval.player': req.user._id }
        ],
        active: true
      });
    }
    
    // Populate the pools
    pools = await TrainingPool.populate(pools, [
      { path: 'team', select: 'name type' },
      { path: 'approvedPlayers.player', select: 'name email position' },
      { path: 'pendingApproval.player', select: 'name email position' }
    ]);
    
    // Sort pools by type and name
    pools.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'team' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
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
    
    const poolData = {
      name,
      type,
      team: teamId,
      minRating,
      maxRating,
      minAttendancePercentage: minAttendancePercentage !== undefined && minAttendancePercentage !== null ? minAttendancePercentage : 75,
      createdBy: req.user._id
    };
    
    // Only add leagueLevel if it's a league pool and has a value
    if (type === 'league' && leagueLevel) {
      poolData.leagueLevel = leagueLevel;
    }
    
    const pool = new TrainingPool(poolData);
    
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
    
    // Get player's current rating and attendance - match frontend calculation
    let skillRating = 50; // Default rating
    let attendancePercentage = 0;
    
    try {
      // Try to get overall rating using calculate-overall endpoint (same as frontend)
      const User = require('../models/User');
      const player = await User.findById(req.user._id);
      
      // Try to calculate overall rating properly
      const allAttributes = await PlayerAttribute.find({
        player: req.user._id
      });
      
      if (allAttributes && allAttributes.length > 0) {
        // Get attendance from any attribute
        const attrWithAttendance = allAttributes.find(a => a.attendanceTracking?.threeMonthAttendance?.percentage !== undefined);
        if (attrWithAttendance) {
          attendancePercentage = attrWithAttendance.attendanceTracking.threeMonthAttendance.percentage || 0;
        }
        
        // Calculate average rating from all attributes with values
        const ratings = allAttributes
          .filter(a => a.numericValue !== null && a.numericValue !== undefined)
          .map(a => a.numericValue);
        
        if (ratings.length >= 8) {
          // If we have all 8 core attributes, use simple average
          const sum = ratings.reduce((acc, val) => acc + val, 0);
          skillRating = Math.round(sum / ratings.length);
        } else if (ratings.length > 0) {
          // Partial ratings - still use average
          const sum = ratings.reduce((acc, val) => acc + val, 0);
          skillRating = Math.round(sum / ratings.length);
        }
      }
    } catch (err) {
      console.log('Error calculating rating:', err);
    }
    
    // Calculate pool rating (same formula as frontend)
    // Pool rating = 70% skill rating + 30% attendance
    // But if attendance is 0, use 100% skill rating
    let poolRating;
    if (attendancePercentage === 0) {
      poolRating = skillRating;
    } else {
      poolRating = Math.round(skillRating * 0.7 + attendancePercentage * 0.3);
    }
    
    console.log(`Player ${req.user._id} requesting pool ${req.params.id}: SkillRating=${skillRating}, Attendance=${attendancePercentage}%, PoolRating=${poolRating}`);
    
    // Check eligibility using pool rating
    if (!pool.isPlayerEligible(req.user._id, poolRating, attendancePercentage)) {
      return res.status(400).json({ 
        message: 'Sie erfüllen nicht die Anforderungen für diesen Pool',
        requirements: {
          minRating: pool.minRating,
          maxRating: pool.maxRating,
          minAttendance: pool.minAttendancePercentage,
          yourPoolRating: poolRating,
          yourSkillRating: skillRating,
          yourAttendance: attendancePercentage
        }
      });
    }
    
    // Add to pending approval (store both pool rating and skill rating)
    const success = pool.requestAccess(req.user._id, poolRating, attendancePercentage);
    
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
    
    // Update player's eligibility tracking on first available attribute
    const firstAttribute = await PlayerAttribute.findOne({ player: playerId });
    if (firstAttribute) {
      await PlayerAttribute.findOneAndUpdate(
        { _id: firstAttribute._id },
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
    }
    
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

// Add player directly to pool (coach only, bypasses approval)
router.post('/:id/add-player', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    // Check if player is already in pool
    const isApproved = pool.approvedPlayers.some(
      p => p.player.toString() === playerId
    );
    const isPending = pool.pendingApproval.some(
      p => p.player.toString() === playerId
    );
    
    if (isApproved) {
      return res.status(400).json({ message: 'Spieler ist bereits im Pool' });
    }
    
    // Remove from pending if exists
    if (isPending) {
      pool.pendingApproval = pool.pendingApproval.filter(
        p => p.player.toString() !== playerId
      );
    }
    
    // Get player's current rating and attendance - use same calculation as request-access
    const allPlayerAttributes = await PlayerAttribute.find({
      player: playerId
    });
    
    let skillRating = 50;
    let attendancePercentage = 0;
    let playerAttributes = null; // Keep for compatibility below
    
    if (allPlayerAttributes && allPlayerAttributes.length > 0) {
      // Get attendance from any attribute
      const attrWithAttendance = allPlayerAttributes.find(a => a.attendanceTracking?.threeMonthAttendance?.percentage !== undefined);
      if (attrWithAttendance) {
        attendancePercentage = attrWithAttendance.attendanceTracking.threeMonthAttendance.percentage || 0;
        playerAttributes = attrWithAttendance; // Use this for eligibility tracking
      }
      
      // Calculate average rating from all attributes with values
      const ratings = allPlayerAttributes
        .filter(a => a.numericValue !== null && a.numericValue !== undefined)
        .map(a => a.numericValue);
      
      if (ratings.length > 0) {
        const sum = ratings.reduce((acc, val) => acc + val, 0);
        skillRating = Math.round(sum / ratings.length);
      }
      
      // Use first attribute for eligibility tracking
      if (!playerAttributes && allPlayerAttributes.length > 0) {
        playerAttributes = allPlayerAttributes[0];
      }
    }
    
    // Calculate pool rating (same formula as frontend and request-access)
    let poolRating;
    if (attendancePercentage === 0) {
      poolRating = skillRating;
    } else {
      poolRating = Math.round(skillRating * 0.7 + attendancePercentage * 0.3);
    }
    
    // Add directly to approved players (store pool rating as currentRating)
    pool.approvedPlayers.push({
      player: playerId,
      approvedBy: req.user._id,
      currentRating: poolRating,  // Store the combined pool rating
      attendancePercentage: attendancePercentage
    });
    
    await pool.save();
    
    // Update player's eligibility tracking
    if (playerAttributes) {
      await PlayerAttribute.findOneAndUpdate(
        { _id: playerAttributes._id },
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
    }
    
    res.json({ message: 'Spieler erfolgreich zum Pool hinzugefügt' });
  } catch (error) {
    console.error('Error adding player to pool:', error);
    res.status(500).json({ message: 'Fehler beim Hinzufügen des Spielers' });
  }
});

// Delete a training pool
router.delete('/:id', protect, coach, async (req, res) => {
  try {
    const pool = await TrainingPool.findById(req.params.id);
    
    if (!pool) {
      return res.status(404).json({ message: 'Trainingspool nicht gefunden' });
    }
    
    // Check if coach is authorized (must be coach of the pool's team or it's a league pool)
    if (pool.type === 'team') {
      const team = await Team.findById(pool.team);
      if (!team || !team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Nicht autorisiert' });
      }
    }
    
    await pool.deleteOne();
    
    res.json({ message: 'Trainingspool erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting pool:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Trainingspools' });
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
    await PlayerAttribute.updateMany(
      { player: req.params.playerId },
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
        totalPlayersCount: pool.approvedPlayers.length,
        availablePlayersCount: availablePlayers.length,
        availablePlayers: availablePlayers
      };
    });
    // Return all pools with players, even if no players are available for this event
    
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
      
      // Update PlayerAttribute attendance tracking - use first available attribute
      const attribute = await PlayerAttribute.findOne({
        player: playerId
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