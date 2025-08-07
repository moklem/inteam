const express = require('express');
const router = express.Router();
const PlayerAttribute = require('../models/PlayerAttribute');
const { protect } = require('../middleware/authMiddleware');

// Get percentile rankings for a player within their team
router.get('/team/:teamId/percentiles', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Get all player attributes for the team
    const teamAttributes = await PlayerAttribute.find({ teamId }).populate('playerId', 'name');

    // Minimum 5 players required for meaningful comparisons
    if (teamAttributes.length < 5) {
      return res.status(400).json({
        message: 'Mindestens 5 Spieler erforderlich für Teamvergleiche'
      });
    }

    // Find the requesting player's attributes
    const playerAttribute = teamAttributes.find(attr => 
      attr.playerId._id.toString() === userId
    );

    if (!playerAttribute) {
      return res.status(404).json({
        message: 'Spielerattribute nicht gefunden'
      });
    }

    // Calculate percentiles for each attribute
    const attributes = ['athletik', 'aufschlag', 'abwehr', 'angriff', 'mental', 'grundTechnik', 'annahme', 'positionsspezifisch'];
    const percentiles = {};
    const strengths = [];
    const improvements = [];

    attributes.forEach(attr => {
      // Get all values for this attribute (1-99 scale)
      const values = teamAttributes
        .map(ta => ta[attr] || 50) // Default to 50 if not set
        .sort((a, b) => a - b);

      const playerValue = playerAttribute[attr] || 50;
      
      // Calculate percentile rank (0-100)
      const rank = values.filter(v => v < playerValue).length;
      const percentile = Math.round((rank / (values.length - 1)) * 100);
      
      percentiles[attr] = percentile;

      // Identify strengths (top 30%) and areas for improvement (bottom 30%)
      if (percentile >= 70) {
        strengths.push(attr);
      } else if (percentile <= 30) {
        improvements.push(attr);
      }
    });

    // Cache the result for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');

    res.json({
      percentiles,
      strengths,
      improvements,
      teamSize: teamAttributes.length
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

    // Get all player attributes for the team
    const teamAttributes = await PlayerAttribute.find({ teamId });

    if (teamAttributes.length < 5) {
      return res.status(400).json({
        message: 'Mindestens 5 Spieler erforderlich für Verteilungsanalyse'
      });
    }

    const attributes = ['athletik', 'aufschlag', 'abwehr', 'angriff', 'mental', 'grundTechnik', 'annahme', 'positionsspezifisch'];
    const distributions = {};

    attributes.forEach(attr => {
      const values = teamAttributes
        .map(ta => ta[attr] || 50)
        .sort((a, b) => a - b);

      // Create distribution bins for bell curve (no individual values exposed)
      const bins = Array(10).fill(0); // 10 bins from 1-10, 11-20, ..., 91-99
      values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - 1) / 10), 9);
        bins[binIndex]++;
      });

      distributions[attr] = {
        bins,
        mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
        min: values[0],
        max: values[values.length - 1]
      };
    });

    // Cache for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');

    res.json({
      distributions,
      teamSize: teamAttributes.length
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