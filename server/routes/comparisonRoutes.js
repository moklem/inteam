const express = require('express');
const router = express.Router();
const PlayerAttribute = require('../models/PlayerAttribute');
const Team = require('../models/Team');
const { protect } = require('../middleware/authMiddleware');

// Get percentile rankings for a player within their team (now using level system)
router.get('/team/:teamId/percentiles', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Get team to find all players
    const team = await Team.findById(teamId).populate('players', '_id name');
    if (!team) {
      return res.status(404).json({ message: 'Team nicht gefunden' });
    }

    // Get universal attributes for all team players
    const playerIds = team.players.map(p => p._id);
    const teamAttributes = await PlayerAttribute.find({
      player: { $in: playerIds },
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    }).populate('player', 'name');

    // Group attributes by player to ensure we have complete data
    const playerAttributesMap = {};
    teamAttributes.forEach(attr => {
      const playerId = attr.player._id.toString();
      if (!playerAttributesMap[playerId]) {
        playerAttributesMap[playerId] = {};
      }
      playerAttributesMap[playerId][attr.attributeName] = attr;
    });

    // Filter to only players with at least some attributes
    const playersWithAttributes = Object.keys(playerAttributesMap);
    
    // Minimum 5 players required for meaningful comparisons
    if (playersWithAttributes.length < 5) {
      return res.status(400).json({
        message: 'Mindestens 5 Spieler mit Bewertungen erforderlich für Teamvergleiche'
      });
    }

    // Find the requesting player's attributes
    const playerAttributes = playerAttributesMap[userId];
    if (!playerAttributes) {
      return res.status(404).json({
        message: 'Spielerattribute nicht gefunden'
      });
    }

    // Calculate percentiles for each attribute using level system
    const coreAttributes = ['Athletik', 'Aufschlag', 'Abwehr', 'Angriff', 'Mental', 'Annahme', 'Grund-Technik', 'Positionsspezifisch'];
    const percentiles = {};
    const levelPercentiles = {};
    const strengths = [];
    const improvements = [];

    coreAttributes.forEach(attrName => {
      // Get all absolute skill values for this attribute (using level system)
      const values = [];
      const levelValues = [];
      
      playersWithAttributes.forEach(playerId => {
        const attr = playerAttributesMap[playerId][attrName];
        if (attr) {
          // Calculate absolute skill from level and rating
          const absoluteSkill = PlayerAttribute.getAbsoluteSkill(attr.level || 0, attr.levelRating || 0);
          values.push(absoluteSkill);
          levelValues.push({ level: attr.level || 0, levelRating: attr.levelRating || 0 });
        } else {
          // Default to Kreisliga 50 if not set
          values.push(50);
          levelValues.push({ level: 0, levelRating: 50 });
        }
      });
      
      values.sort((a, b) => a - b);

      const playerAttr = playerAttributes[attrName];
      const playerAbsoluteSkill = playerAttr 
        ? PlayerAttribute.getAbsoluteSkill(playerAttr.level || 0, playerAttr.levelRating || 0)
        : 50;
      
      // Calculate percentile rank (0-100)
      const rank = values.filter(v => v < playerAbsoluteSkill).length;
      const percentile = Math.round((rank / (values.length - 1)) * 100);
      
      // Store percentiles with simplified attribute keys
      const simpleKey = attrName.toLowerCase().replace('-', '');
      percentiles[simpleKey] = percentile;
      
      // Also store level information
      levelPercentiles[simpleKey] = {
        percentile,
        level: playerAttr?.level || 0,
        levelRating: playerAttr?.levelRating || 0,
        leagueName: PlayerAttribute.getLeagueLevels()[playerAttr?.level || 0]
      };

      // Identify strengths (top 30%) and areas for improvement (bottom 30%)
      if (percentile >= 70) {
        strengths.push(simpleKey);
      } else if (percentile <= 30) {
        improvements.push(simpleKey);
      }
    });

    // Cache the result for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');

    res.json({
      percentiles,
      levelPercentiles,
      strengths,
      improvements,
      teamSize: playersWithAttributes.length
    });

  } catch (error) {
    console.error('Error calculating percentiles:', error);
    res.status(500).json({ 
      message: 'Fehler beim Berechnen der Perzentile',
      error: error.message 
    });
  }
});

// Get team distribution data (anonymous) for bell curve visualization
router.get('/team/:teamId/distribution', protect, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get team to find all players
    const team = await Team.findById(teamId).populate('players', '_id');
    if (!team) {
      return res.status(404).json({ message: 'Team nicht gefunden' });
    }

    // Get universal attributes for all team players
    const playerIds = team.players.map(p => p._id);
    const teamAttributes = await PlayerAttribute.find({
      player: { $in: playerIds },
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    });

    // Group attributes by player
    const playerAttributesMap = {};
    teamAttributes.forEach(attr => {
      const playerId = attr.player.toString();
      if (!playerAttributesMap[playerId]) {
        playerAttributesMap[playerId] = {};
      }
      playerAttributesMap[playerId][attr.attributeName] = attr;
    });

    const playersWithAttributes = Object.keys(playerAttributesMap);
    
    if (playersWithAttributes.length < 5) {
      return res.status(400).json({
        message: 'Mindestens 5 Spieler mit Bewertungen erforderlich für Verteilungsanalyse'
      });
    }

    const coreAttributes = ['Athletik', 'Aufschlag', 'Abwehr', 'Angriff', 'Mental', 'Annahme', 'Grund-Technik', 'Positionsspezifisch'];
    const distributions = {};
    const levelDistributions = {};

    coreAttributes.forEach(attrName => {
      const values = [];
      const leagues = PlayerAttribute.getLeagueLevels();
      const levelCounts = Array(8).fill(0); // 8 league levels
      
      playersWithAttributes.forEach(playerId => {
        const attr = playerAttributesMap[playerId][attrName];
        if (attr) {
          const absoluteSkill = PlayerAttribute.getAbsoluteSkill(attr.level || 0, attr.levelRating || 0);
          values.push(absoluteSkill);
          levelCounts[attr.level || 0]++;
        } else {
          values.push(50); // Default
          levelCounts[0]++; // Kreisliga
        }
      });
      
      values.sort((a, b) => a - b);

      // Create distribution bins for bell curve (based on absolute skill)
      const bins = Array(10).fill(0); // 10 bins for visualization
      const binSize = 80; // Each bin represents 80 skill points (800 total range / 10 bins)
      values.forEach(value => {
        const binIndex = Math.min(Math.floor(value / binSize), 9);
        bins[binIndex]++;
      });

      const simpleKey = attrName.toLowerCase().replace('-', '');
      distributions[simpleKey] = {
        bins,
        mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
        min: values[0],
        max: values[values.length - 1]
      };
      
      // Add level distribution data
      levelDistributions[simpleKey] = {
        levelCounts,
        leagues
      };
    });

    // Cache for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');

    res.json({
      distributions,
      levelDistributions,
      teamSize: playersWithAttributes.length
    });

  } catch (error) {
    console.error('Error calculating distributions:', error);
    res.status(500).json({ 
      message: 'Fehler beim Berechnen der Verteilung',
      error: error.message 
    });
  }
});

module.exports = router;