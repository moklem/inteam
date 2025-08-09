const express = require('express');
const router = express.Router();
const { protect, coach, player } = require('../middleware/authMiddleware');
const PlayerAttribute = require('../models/PlayerAttribute');
const User = require('../models/User');
const Team = require('../models/Team');
const AchievementService = require('../services/achievementService');

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

// @route   POST /api/attributes/universal
// @desc    Create or update universal player ratings (no team dependency)
// @access  Private/Coach
router.post('/universal', protect, coach, async (req, res) => {
  try {
    const { playerId, ratings } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const results = [];

    // Process each rating
    for (const [attributeName, ratingData] of Object.entries(ratings)) {
      try {
        // Handle both old format (direct numeric value) and new format (object with value, subAttributes, and level)
        let numericValue, subAttributes, level, levelRating;
        
        if (typeof ratingData === 'number') {
          // Old format - direct numeric value
          numericValue = ratingData;
          subAttributes = {};
        } else if (typeof ratingData === 'object' && ratingData.value !== undefined) {
          // New format - object with value, subAttributes, and optional level data
          numericValue = ratingData.value;
          subAttributes = ratingData.subAttributes || {};
          level = ratingData.level;
          levelRating = ratingData.levelRating;
        } else {
          console.error(`Invalid rating data format for ${attributeName}:`, ratingData);
          continue;
        }

        // Find existing universal rating for this attribute
        let attribute = await PlayerAttribute.findOne({
          player: playerId,
          attributeName,
          $or: [
            { team: null },
            { team: { $exists: false } }
          ]
        });

        if (attribute) {
          // Update existing rating
          const oldValue = attribute.numericValue;
          const oldLevel = attribute.level || 0;
          const oldSubAttributes = attribute.subAttributes || {};
          
          // Check if level was explicitly provided (manual level change)
          if (level !== undefined && level !== attribute.level) {
            // Manual level change - respect it without triggering automatic level-up
            attribute.level = level;
            attribute.levelRating = levelRating || numericValue;
            attribute.numericValue = numericValue;
            attribute.subAttributes = subAttributes;
            attribute.updatedBy = req.user._id;
            
            // Add to progression history for manual level change
            if (!attribute.progressionHistory) attribute.progressionHistory = [];
            attribute.progressionHistory.push({
              value: numericValue,
              level: level,
              change: 0,
              notes: `Manueller Level-Wechsel zu ${PlayerAttribute.getLeagueLevels()[level]}`,
              updatedBy: req.user._id,
              updatedAt: new Date()
            });
            
            // Save the manual level change
            await attribute.save();
          } else {
            // Check if this update will trigger an automatic level-up
            const willLevelUp = numericValue >= 90 && oldLevel < 7;
            
            if (willLevelUp) {
              // Level up! Only this specific attribute advances
              const newLevel = Math.min(7, oldLevel + 1);
              const leagues = PlayerAttribute.getLeagueLevels();
              console.log(`Attribute ${attributeName} for player ${playerId} leveling up from ${leagues[oldLevel]} to ${leagues[newLevel]}!`);
              
              // Update only this attribute to new level with reset value
              await PlayerAttribute.handleAttributeLevelUp(attribute._id, oldLevel, newLevel, req.user._id);
              
              // Re-fetch this specific attribute after level-up
              attribute = await PlayerAttribute.findById(attribute._id);
            } else {
              // Normal update without level-up
              attribute.numericValue = numericValue;
              attribute.subAttributes = subAttributes;
              attribute.updatedBy = req.user._id;
              attribute.levelRating = numericValue; // In new system, levelRating = numericValue
              
              const hasSubAttributes = Object.keys(subAttributes).length > 0;
              attribute.notes = hasSubAttributes 
                ? `Aktualisiert mit Detailbewertungen (1-99 Skala)`
                : `Aktualisiert auf ${numericValue} (1-99 Skala)`;
              
              // Add to progression history if value changed
              if (oldValue !== numericValue || JSON.stringify(oldSubAttributes) !== JSON.stringify(subAttributes)) {
                if (!attribute.progressionHistory) attribute.progressionHistory = [];
                attribute.progressionHistory.push({
                  value: numericValue,
                  level: attribute.level || 0,
                  change: numericValue - (oldValue || 0),
                  notes: hasSubAttributes 
                    ? `Detailbewertungen aktualisiert, Hauptwert: ${numericValue}`
                    : `Änderung von ${oldValue} auf ${numericValue}`,
                  updatedBy: req.user._id,
                  updatedAt: new Date()
                });
              }

              await attribute.save();
            }
          }
          results.push(attribute);

          // Check for new achievements after rating update
          try {
            const player = await User.findById(playerId).select('position');
            const playerData = { position: player?.position };
            const newAchievements = await AchievementService.checkAndAwardAchievements(playerId, playerData);
            
            if (newAchievements.length > 0) {
              console.log(`Player ${playerId} unlocked ${newAchievements.length} new achievement(s)`);
              // You could emit a socket event here for real-time notifications
            }
          } catch (achievementError) {
            console.error('Error checking achievements:', achievementError);
            // Don't fail the rating update if achievement check fails
          }
        } else {
          // Create new universal rating
          const hasSubAttributes = Object.keys(subAttributes).length > 0;
          
          // For new attributes, each starts at level 0 (Option A - individual levels)
          const playerLevel = 0;
          
          const newAttribute = await PlayerAttribute.create({
            player: playerId,
            attributeName,
            category: 'Technical',
            numericValue,
            subAttributes,
            level: playerLevel,
            levelRating: numericValue, // In new system, levelRating = numericValue
            notes: hasSubAttributes 
              ? `Erstbewertung mit Detailbewertungen (1-99 Skala)`
              : `Erstbewertung: ${numericValue} (1-99 Skala)`,
            updatedBy: req.user._id,
            team: null, // Universal rating
            progressionHistory: [{
              value: numericValue,
              change: 0,
              notes: hasSubAttributes ? 'Erstbewertung mit Detailbewertungen' : 'Erstbewertung',
              updatedBy: req.user._id,
              updatedAt: new Date()
            }]
          });
          results.push(newAttribute);

          // Check for new achievements after first rating
          try {
            const player = await User.findById(playerId).select('position');
            const playerData = { position: player?.position };
            const newAchievements = await AchievementService.checkAndAwardAchievements(playerId, playerData);
            
            if (newAchievements.length > 0) {
              console.log(`Player ${playerId} unlocked ${newAchievements.length} new achievement(s) on first rating`);
            }
          } catch (achievementError) {
            console.error('Error checking achievements:', achievementError);
          }
        }
      } catch (error) {
        console.error(`Error processing attribute ${attributeName}:`, error);
        continue;
      }
    }

    res.json(results);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/universal/:playerId
// @desc    Get universal player ratings
// @access  Private
router.get('/universal/:playerId', protect, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Get universal ratings (no team dependency)
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    })
    .populate('player', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ attributeName: 1 });

    res.json(attributes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/attributes/calculate-overall
// @desc    Calculate overall rating for a player (universal, no team required)
// @access  Private
router.post('/calculate-overall', protect, async (req, res) => {
  try {
    const { playerId, playerPosition } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Calculate overall rating with position-specific weights
    const overallRating = await PlayerAttribute.calculateOverallRating(playerId, playerPosition);

    if (overallRating === null) {
      return res.status(404).json({ message: 'No attributes found for rating calculation' });
    }

    // Get rating category based on value
    let category = '';
    let color = '';
    
    if (overallRating >= 90) {
      category = 'Elite';
      color = 'green';
    } else if (overallRating >= 75) {
      category = 'Sehr gut';
      color = 'lightGreen';
    } else if (overallRating >= 60) {
      category = 'Gut';
      color = 'yellow';
    } else if (overallRating >= 40) {
      category = 'Durchschnitt';
      color = 'orange';
    } else {
      category = 'Entwicklungsbedarf';
      color = 'red';
    }

    res.json({
      playerId,
      overallRating,
      category,
      color,
      calculatedAt: new Date()
    });

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

// @route   GET /api/attributes/levels
// @desc    Get German league level configuration
// @access  Private
router.get('/levels', protect, async (req, res) => {
  try {
    const levels = PlayerAttribute.getLeagueLevels();
    res.json({ levels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/attributes/migrate-levels
// @desc    Migrate existing ratings to level system
// @access  Private/Coach
router.post('/migrate-levels', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;

    // Find all universal attributes for this player
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    });

    const migrated = [];

    for (const attribute of attributes) {
      // Skip if already migrated
      if (attribute.level !== undefined && attribute.level !== null) {
        continue;
      }

      // Store original value
      if (!attribute.originalNumericValue && attribute.numericValue) {
        attribute.originalNumericValue = attribute.numericValue;
      }

      // Convert to level system
      const levelData = PlayerAttribute.convertRatingToLevel(attribute.numericValue);
      attribute.level = levelData.level;
      attribute.levelRating = levelData.levelRating;

      await attribute.save();
      migrated.push({
        attributeName: attribute.attributeName,
        originalValue: attribute.numericValue,
        level: levelData.level,
        levelRating: levelData.levelRating,
        leagueName: PlayerAttribute.getLeagueLevels()[levelData.level]
      });
    }

    res.json({
      message: `Successfully migrated ${migrated.length} attributes to level system`,
      migrated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attributes/level-progress/:playerId
// @desc    Get level progression summary for a player
// @access  Private
router.get('/level-progress/:playerId', protect, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Get all universal attributes with level data
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    }).sort({ attributeName: 1 });

    const leagues = PlayerAttribute.getLeagueLevels();
    
    const progress = attributes.map(attr => ({
      attributeName: attr.attributeName,
      numericValue: attr.numericValue,
      level: attr.level || 0,
      levelRating: attr.numericValue || 1, // levelRating is same as numericValue in new system
      leagueName: leagues[attr.level || 0],
      progressToNextLevel: attr.level < 7 ? (attr.numericValue || 1) : 99, // Progress is the actual rating (1-99)
      nextLeague: attr.level < 7 ? leagues[(attr.level || 0) + 1] : null
    }));

    // Calculate overall level rating
    const player = await User.findById(playerId).select('position');
    const overallLevelData = await PlayerAttribute.calculateOverallLevelRating(playerId, player?.position);

    res.json({
      attributes: progress,
      overall: overallLevelData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/attributes/calculate-overall-level
// @desc    Calculate overall rating using level system
// @access  Private
router.post('/calculate-overall-level', protect, async (req, res) => {
  try {
    const { playerId, playerPosition } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Calculate overall level rating
    const overallLevelData = await PlayerAttribute.calculateOverallLevelRating(playerId, playerPosition || player.position);

    if (!overallLevelData) {
      return res.status(404).json({ message: 'No attributes found for rating calculation' });
    }

    // Also update the legacy overall rating for compatibility
    const overallRating = await PlayerAttribute.calculateOverallRating(playerId, playerPosition || player.position);

    res.json({
      ...overallLevelData,
      legacyOverallRating: overallRating
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;