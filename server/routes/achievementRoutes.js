const express = require('express');
const router = express.Router();
const AchievementService = require('../services/achievementService');
const Achievement = require('../models/Achievement');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get all achievements for a player
router.get('/player/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { category, rarity } = req.query;

    // Check if user has permission to view this player's achievements
    if (req.user.id !== playerId && req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Keine Berechtigung zum Anzeigen dieser Achievements' });
    }

    const achievements = await AchievementService.getPlayerAchievements(playerId, {
      category,
      rarity
    });

    res.json({
      success: true,
      achievements
    });
  } catch (error) {
    console.error('Error getting player achievements:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Achievements' });
  }
});

// Get achievement statistics for a player
router.get('/stats/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if user has permission to view this player's stats
    if (req.user.id !== playerId && req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Keine Berechtigung zum Anzeigen dieser Statistiken' });
    }

    const stats = await AchievementService.getPlayerAchievementStats(playerId);
    
    if (!stats) {
      return res.status(404).json({ message: 'Keine Statistiken gefunden' });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Achievement-Statistiken' });
  }
});

// Get available badges that player hasn't unlocked
router.get('/available/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 10 } = req.query;

    // Check if user has permission
    if (req.user.id !== playerId && req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const availableBadges = await AchievementService.getAvailableBadges(
      playerId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      badges: availableBadges
    });
  } catch (error) {
    console.error('Error getting available badges:', error);
    res.status(500).json({ message: 'Fehler beim Laden der verfügbaren Badges' });
  }
});

// Get next achievable badges with progress
router.get('/next/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if user has permission
    if (req.user.id !== playerId && req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    // Get player data for position-specific checks
    const player = await User.findById(playerId).select('position');
    const playerData = { position: player?.position };

    const nextBadges = await AchievementService.getNextAchievableBadges(
      playerId,
      playerData
    );

    res.json({
      success: true,
      badges: nextBadges
    });
  } catch (error) {
    console.error('Error getting next achievable badges:', error);
    res.status(500).json({ message: 'Fehler beim Laden der nächsten Badges' });
  }
});

// Manual achievement check (for after rating updates)
router.post('/check/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Only allow trainers to manually trigger achievement checks
    if (req.user.role !== 'Trainer' && req.user.id !== playerId) {
      return res.status(403).json({ message: 'Keine Berechtigung für Achievement-Check' });
    }

    // Get player data for position-specific checks
    const player = await User.findById(playerId).select('position');
    const playerData = { position: player?.position };

    const newAchievements = await AchievementService.checkAndAwardAchievements(
      playerId,
      playerData
    );

    res.json({
      success: true,
      newAchievements,
      count: newAchievements.length,
      message: newAchievements.length > 0 ? 
        `${newAchievements.length} neue Achievement(s) freigeschaltet!` :
        'Keine neuen Achievements freigeschaltet.'
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ message: 'Fehler beim Prüfen der Achievements' });
  }
});

// Get all badge definitions (for reference)
router.get('/definitions', auth, async (req, res) => {
  try {
    const definitions = Achievement.getBadgeDefinitions();
    
    // Group by category and rarity for better organization
    const organized = {
      byCategory: {},
      byRarity: {},
      all: definitions
    };

    definitions.forEach(badge => {
      if (!organized.byCategory[badge.category]) {
        organized.byCategory[badge.category] = [];
      }
      if (!organized.byRarity[badge.rarity]) {
        organized.byRarity[badge.rarity] = [];
      }
      
      organized.byCategory[badge.category].push(badge);
      organized.byRarity[badge.rarity].push(badge);
    });

    res.json({
      success: true,
      definitions: organized
    });
  } catch (error) {
    console.error('Error getting badge definitions:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Badge-Definitionen' });
  }
});

// Reset player achievements (admin/testing only)
router.delete('/reset/:playerId', auth, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Only trainers can reset achievements
    if (req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Nur Trainer können Achievements zurücksetzen' });
    }

    const success = await AchievementService.resetPlayerAchievements(playerId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alle Achievements wurden zurückgesetzt'
      });
    } else {
      res.status(500).json({ message: 'Fehler beim Zurücksetzen der Achievements' });
    }
  } catch (error) {
    console.error('Error resetting achievements:', error);
    res.status(500).json({ message: 'Fehler beim Zurücksetzen der Achievements' });
  }
});

// Get team achievement leaderboard
router.get('/leaderboard/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Get all team members
    const teamMembers = await User.find({ teams: teamId }).select('_id name');
    
    const leaderboard = [];
    
    for (const member of teamMembers) {
      const stats = await AchievementService.getPlayerAchievementStats(member._id);
      if (stats) {
        leaderboard.push({
          playerId: member._id,
          playerName: member.name,
          totalAchievements: stats.total,
          completionPercentage: stats.completionPercentage,
          byRarity: stats.byRarity,
          recentUnlocks: stats.recentUnlocks.length
        });
      }
    }
    
    // Sort by total achievements descending
    leaderboard.sort((a, b) => b.totalAchievements - a.totalAchievements);

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Error getting achievement leaderboard:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Achievement-Rangliste' });
  }
});

module.exports = router;