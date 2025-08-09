const express = require('express');
const router = express.Router();
const { protect, coach } = require('../middleware/authMiddleware');
const PlayerAttribute = require('../models/PlayerAttribute');
const User = require('../models/User');

// @route   GET /api/progress/player/:playerId
// @desc    Get historical progress data for all attributes of a player
// @access  Private/Coach
router.get('/player/:playerId', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { from, to } = req.query;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Build date filter
    let dateFilter = {};
    if (from || to) {
      dateFilter.updatedAt = {};
      if (from) dateFilter.updatedAt.$gte = new Date(from);
      if (to) dateFilter.updatedAt.$lte = new Date(to);
    }

    // Get universal ratings (no team dependency) with progression history
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    })
    .populate('player', 'name email position')
    .populate('updatedBy', 'name email')
    .sort({ attributeName: 1 });

    // Process and format the data
    const progressData = {};

    attributes.forEach(attr => {
      let filteredHistory = attr.progressionHistory || [];
      
      // Apply date filtering to progression history
      if (from || to) {
        filteredHistory = filteredHistory.filter(entry => {
          const entryDate = new Date(entry.updatedAt);
          if (from && entryDate < new Date(from)) return false;
          if (to && entryDate > new Date(to)) return false;
          return true;
        });
      }

      // Sort by date ascending
      filteredHistory.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

      // Calculate absolute skill value for current state
      const currentAbsoluteSkill = ((attr.level || 0) * 100) + (attr.numericValue || 1);
      
      progressData[attr.attributeName] = {
        attributeName: attr.attributeName,
        currentValue: currentAbsoluteSkill, // Use absolute skill value instead of just numericValue
        currentLevel: attr.level || 0,
        currentLevelRating: attr.levelRating || 0,
        currentLeague: PlayerAttribute.getLeagueLevels()[attr.level || 0],
        subAttributes: attr.subAttributes || {},
        progressionHistory: filteredHistory.map((entry, index) => {
          // We need to determine what level the player was at for each history entry
          // Start by counting total level-ups in the entire history
          let totalLevelUps = 0;
          filteredHistory.forEach(histEntry => {
            if (histEntry.notes && histEntry.notes.includes('Level-Aufstieg')) {
              totalLevelUps++;
            }
          });
          
          // Calculate the starting level (current level minus total level-ups)
          const startingLevel = Math.max(0, (attr.level || 0) - totalLevelUps);
          
          // Now track level for this specific entry
          let historyLevel = startingLevel;
          
          // Count level-ups up to this point in history
          for (let i = 0; i <= index; i++) {
            const histEntry = filteredHistory[i];
            if (histEntry.notes && histEntry.notes.includes('Level-Aufstieg')) {
              // This is a level-up, increment the level
              historyLevel++;
            }
          }
          
          // Calculate absolute value based on the level at this point in history
          let absoluteValue;
          if (entry.notes && entry.notes.includes('Level-Aufstieg')) {
            // After level-up, value typically resets to 1 in the new level
            absoluteValue = (historyLevel * 100) + 1;
          } else {
            // Regular update: combine level and rating
            absoluteValue = (historyLevel * 100) + (entry.value || 1);
          }
          
          return {
            value: absoluteValue, // Use calculated absolute skill value
            change: entry.change,
            notes: entry.notes,
            updatedAt: entry.updatedAt,
            updatedBy: entry.updatedBy,
            level: historyLevel,
            levelRating: entry.value
          };
        }),
        lastUpdated: attr.updatedAt,
        totalEntries: filteredHistory.length
      };
    });

    // Add player info to response
    const response = {
      player: {
        _id: player._id,
        name: player.name,
        email: player.email,
        position: player.position
      },
      dateRange: {
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null
      },
      attributes: progressData,
      generatedAt: new Date()
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching player progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/progress/milestones/:playerId
// @desc    Get milestone achievements for a player
// @access  Private/Coach
router.get('/milestones/:playerId', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Get universal ratings with progression history
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    });

    const milestones = [];
    // Update milestone thresholds for absolute skill values (0-800 scale)
    const milestoneThresholds = [100, 200, 300, 400, 500, 600, 700];
    const leagues = PlayerAttribute.getLeagueLevels();

    attributes.forEach(attr => {
      if (!attr.progressionHistory || attr.progressionHistory.length === 0) return;

      const achievedMilestones = new Set();
      const achievedLevels = new Set();
      
      // Track level progression through history
      let currentHistoryLevel = 0;
      
      attr.progressionHistory.forEach((entry, index) => {
        // Update level tracking for this entry
        if (entry.notes && entry.notes.includes('Level-Aufstieg')) {
          const levelMatch = entry.notes.match(/Level-Aufstieg: (.+) → (.+)/);
          if (levelMatch) {
            const toLeague = levelMatch[2];
            const newLevel = leagues.indexOf(toLeague);
            if (newLevel >= 0) {
              currentHistoryLevel = newLevel;
            }
          }
        }
        
        // Calculate absolute value for this entry
        const absoluteValue = (currentHistoryLevel * 100) + (entry.value || 1);
        
        // Check for league milestone crossings (every 100 points)
        milestoneThresholds.forEach(threshold => {
          if (absoluteValue >= threshold && !achievedMilestones.has(threshold)) {
            // Check if we previously were below this threshold
            let wasPreviouslyBelow = true;
            let prevLevel = 0;
            
            for (let i = 0; i < index; i++) {
              const prevEntry = attr.progressionHistory[i];
              if (prevEntry.notes && prevEntry.notes.includes('Level-Aufstieg')) {
                const levelMatch = prevEntry.notes.match(/Level-Aufstieg: (.+) → (.+)/);
                if (levelMatch) {
                  const toLeague = levelMatch[2];
                  const newLevel = leagues.indexOf(toLeague);
                  if (newLevel >= 0) {
                    prevLevel = newLevel;
                  }
                }
              }
              const prevAbsoluteValue = (prevLevel * 100) + (prevEntry.value || 1);
              if (prevAbsoluteValue >= threshold) {
                wasPreviouslyBelow = false;
                break;
              }
            }
            
            if (wasPreviouslyBelow) {
              const leagueIndex = Math.floor(threshold / 100);
              const leagueName = leagues[leagueIndex] || 'Unknown';
              
              milestones.push({
                attributeName: attr.attributeName,
                threshold: threshold,
                value: absoluteValue,
                date: entry.updatedAt,
                type: threshold >= 600 ? 'elite' : threshold >= 400 ? 'excellent' : 'good',
                label: `${attr.attributeName}: ${leagueName} erreicht`,
                description: `${threshold} Punkte Marke überschritten (${leagueName})`
              });
              achievedMilestones.add(threshold);
            }
          }
        });

        // Check for level-up milestones
        if (entry.notes && entry.notes.includes('Level-Aufstieg')) {
          // Extract level information from notes
          const levelMatch = entry.notes.match(/Level-Aufstieg: (.+) → (.+)/);
          if (levelMatch) {
            const fromLeague = levelMatch[1];
            const toLeague = levelMatch[2];
            const toLevel = leagues.indexOf(toLeague);
            
            if (toLevel >= 0 && !achievedLevels.has(toLevel)) {
              milestones.push({
                attributeName: attr.attributeName,
                level: toLevel,
                leagueName: toLeague,
                value: absoluteValue, // Use calculated absolute value
                date: entry.updatedAt,
                type: 'levelup',
                label: `${attr.attributeName}: Level-Aufstieg zu ${toLeague}`,
                description: `Von ${fromLeague} zu ${toLeague} aufgestiegen`,
                fromLeague,
                toLeague
              });
              achievedLevels.add(toLevel);
            }
          }
        }
      });
    });

    // Sort milestones by date
    milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      player: {
        _id: player._id,
        name: player.name,
        position: player.position
      },
      milestones,
      totalMilestones: milestones.length,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/progress/note
// @desc    Add a coach note to a specific progression entry
// @access  Private/Coach
router.post('/note', protect, coach, async (req, res) => {
  try {
    const { playerId, attributeName, entryDate, notes } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Find the attribute
    const attribute = await PlayerAttribute.findOne({
      player: playerId,
      attributeName,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    });

    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found' });
    }

    // Find the progression entry by date (within a reasonable tolerance)
    const targetDate = new Date(entryDate);
    const tolerance = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const entryIndex = attribute.progressionHistory.findIndex(entry => {
      const entryTime = new Date(entry.updatedAt).getTime();
      const targetTime = targetDate.getTime();
      return Math.abs(entryTime - targetTime) <= tolerance;
    });

    if (entryIndex === -1) {
      return res.status(404).json({ message: 'Progression entry not found' });
    }

    // Update the notes for this entry
    attribute.progressionHistory[entryIndex].notes = notes;
    attribute.progressionHistory[entryIndex].lastNoteUpdate = new Date();
    attribute.progressionHistory[entryIndex].noteUpdatedBy = req.user._id;

    // Save the attribute
    await attribute.save();

    res.json({
      message: 'Note added successfully',
      updatedEntry: attribute.progressionHistory[entryIndex]
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/progress/export/:playerId
// @desc    Export progress report as PDF (placeholder - would need PDF generation library)
// @access  Private/Coach
router.post('/export/:playerId', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { from, to } = req.body;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // For now, return JSON data that could be used for PDF generation
    // In production, you would use a library like puppeteer, jsPDF, or PDFKit
    
    // Get progress data
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    }).populate('player', 'name email position');

    // Build date filter
    let dateFilter = {};
    if (from || to) {
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
    }

    // Process data for report
    const reportData = {
      player: {
        name: player.name,
        email: player.email,
        position: player.position
      },
      reportPeriod: {
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null
      },
      generatedAt: new Date(),
      generatedBy: req.user.name,
      attributes: {}
    };

    attributes.forEach(attr => {
      let filteredHistory = attr.progressionHistory || [];
      
      // Apply date filtering
      if (from || to) {
        filteredHistory = filteredHistory.filter(entry => {
          const entryDate = new Date(entry.updatedAt);
          if (from && entryDate < new Date(from)) return false;
          if (to && entryDate > new Date(to)) return false;
          return true;
        });
      }

      if (filteredHistory.length > 0) {
        const values = filteredHistory.map(entry => entry.value);
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        
        reportData.attributes[attr.attributeName] = {
          currentValue: attr.numericValue,
          startValue: firstValue,
          endValue: lastValue,
          totalChange: lastValue - firstValue,
          progressionHistory: filteredHistory,
          statistics: {
            averageValue: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
            highestValue: Math.max(...values),
            lowestValue: Math.min(...values),
            totalEntries: filteredHistory.length
          }
        };
      }
    });

    // For now, return JSON data
    // In production, this would generate and return a PDF blob
    res.json(reportData);

  } catch (error) {
    console.error('Error generating progress report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/progress/stats/:playerId
// @desc    Get overall progress statistics for a player
// @access  Private/Coach
router.get('/stats/:playerId', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if player exists
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Get universal ratings with progression history
    const attributes = await PlayerAttribute.find({
      player: playerId,
      $or: [
        { team: null },
        { team: { $exists: false } }
      ]
    });

    const stats = {
      player: {
        _id: player._id,
        name: player.name,
        position: player.position
      },
      overallStats: {
        totalAttributes: attributes.length,
        totalProgressEntries: 0,
        averageCurrentRating: 0,
        averageImprovement: 0,
        mostImprovedAttribute: null,
        mostDeclinedAttribute: null,
        plateauAttributes: []
      },
      attributeStats: {}
    };

    let totalCurrentRating = 0;
    let totalImprovements = [];
    let attributeImprovements = [];

    attributes.forEach(attr => {
      if (attr.progressionHistory && attr.progressionHistory.length > 0) {
        const history = attr.progressionHistory;
        const values = history.map(entry => entry.value);
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const totalImprovement = lastValue - firstValue;
        
        stats.totalProgressEntries += history.length;
        totalCurrentRating += attr.numericValue || 0;
        
        if (Math.abs(totalImprovement) > 0) {
          totalImprovements.push(totalImprovement);
          attributeImprovements.push({
            name: attr.attributeName,
            improvement: totalImprovement,
            currentValue: attr.numericValue
          });
        }
        
        // Check for plateau (last 3 entries with minimal change)
        if (history.length >= 3) {
          const recentEntries = history.slice(-3);
          const recentChanges = recentEntries.slice(1).map((entry, index) => 
            Math.abs(entry.value - recentEntries[index].value));
          const isPlateauing = recentChanges.every(change => change < 3);
          
          if (isPlateauing) {
            stats.overallStats.plateauAttributes.push(attr.attributeName);
          }
        }

        // Individual attribute stats
        stats.attributeStats[attr.attributeName] = {
          currentValue: attr.numericValue,
          totalEntries: history.length,
          firstValue: firstValue,
          lastValue: lastValue,
          totalImprovement: totalImprovement,
          averageValue: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
          highestValue: Math.max(...values),
          lowestValue: Math.min(...values),
          trend: totalImprovement > 5 ? 'improving' : 
                 totalImprovement < -5 ? 'declining' : 'stable'
        };
      }
    });

    // Calculate overall statistics
    if (attributes.length > 0) {
      stats.overallStats.averageCurrentRating = Math.round(totalCurrentRating / attributes.length);
    }

    if (totalImprovements.length > 0) {
      stats.overallStats.averageImprovement = Math.round(
        (totalImprovements.reduce((sum, imp) => sum + imp, 0) / totalImprovements.length) * 100
      ) / 100;
    }

    // Find most improved and most declined attributes
    if (attributeImprovements.length > 0) {
      attributeImprovements.sort((a, b) => b.improvement - a.improvement);
      stats.overallStats.mostImprovedAttribute = attributeImprovements[0];
      stats.overallStats.mostDeclinedAttribute = attributeImprovements[attributeImprovements.length - 1];
    }

    res.json(stats);

  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;