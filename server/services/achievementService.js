const Achievement = require('../models/Achievement');
const PlayerAttribute = require('../models/PlayerAttribute');

class AchievementService {
  
  /**
   * Check and award new achievements for a player
   * @param {string} playerId - The player's ID
   * @param {Object} playerData - Player data including position
   * @returns {Array} Array of newly unlocked achievements
   */
  static async checkAndAwardAchievements(playerId, playerData = {}) {
    try {
      // Get player's current attributes
      const playerAttributes = await PlayerAttribute.findOne({ playerId });
      if (!playerAttributes) return [];

      // Prepare attribute data for checking
      const attributeData = {
        Athletik: playerAttributes.athletik || 0,
        Aufschlag: playerAttributes.aufschlag || 0,
        Abwehr: playerAttributes.abwehr || 0,
        Angriff: playerAttributes.angriff || 0,
        Mental: playerAttributes.mental || 0,
        'Grund-Technik': playerAttributes.grundTechnik || 0,
        Positionsspezifisch: playerAttributes.positionsspezifisch || 0,
        Annahme: playerAttributes.annahme || 0,
        overallRating: playerAttributes.overallRating || 0
      };

      // Get all badge definitions
      const badgeDefinitions = Achievement.getBadgeDefinitions();
      const newAchievements = [];

      // Check each badge for eligibility
      for (const badgeDefinition of badgeDefinitions) {
        try {
          // Skip position-specific badges if player position doesn't match
          if (badgeDefinition.triggerValue.position && 
              playerData.position !== badgeDefinition.triggerValue.position) {
            continue;
          }

          const isEligible = await Achievement.checkBadgeEligibility(
            playerId, 
            badgeDefinition, 
            attributeData
          );

          if (isEligible) {
            const newAchievement = new Achievement({
              playerId,
              badgeId: badgeDefinition.badgeId,
              badgeName: badgeDefinition.badgeName,
              badgeDescription: badgeDefinition.badgeDescription,
              category: badgeDefinition.category,
              rarity: badgeDefinition.rarity,
              triggerType: badgeDefinition.triggerType,
              triggerValue: badgeDefinition.triggerValue
            });

            await newAchievement.save();
            newAchievements.push(newAchievement);
          }
        } catch (error) {
          console.error(`Error checking badge ${badgeDefinition.badgeId}:`, error);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error in checkAndAwardAchievements:', error);
      return [];
    }
  }

  /**
   * Get all achievements for a player
   * @param {string} playerId - The player's ID
   * @param {Object} options - Query options
   * @returns {Array} Array of player achievements
   */
  static async getPlayerAchievements(playerId, options = {}) {
    try {
      const query = Achievement.find({ playerId });
      
      if (options.category) {
        query.where('category').equals(options.category);
      }
      
      if (options.rarity) {
        query.where('rarity').equals(options.rarity);
      }
      
      return await query.sort({ unlockedAt: -1 }).exec();
    } catch (error) {
      console.error('Error getting player achievements:', error);
      return [];
    }
  }

  /**
   * Get achievement statistics for a player
   * @param {string} playerId - The player's ID
   * @returns {Object} Achievement statistics
   */
  static async getPlayerAchievementStats(playerId) {
    try {
      const achievements = await Achievement.find({ playerId });
      const allBadges = Achievement.getBadgeDefinitions();
      
      const stats = {
        total: achievements.length,
        totalAvailable: allBadges.length,
        byCategory: {
          Fähigkeiten: 0,
          Position: 0,
          Team: 0,
          Fortschritt: 0,
          Spezial: 0
        },
        byRarity: {
          Bronze: 0,
          Silber: 0,
          Gold: 0,
          Platin: 0,
          Diamant: 0
        },
        completionPercentage: 0,
        recentUnlocks: []
      };

      achievements.forEach(achievement => {
        stats.byCategory[achievement.category]++;
        stats.byRarity[achievement.rarity]++;
      });

      stats.completionPercentage = Math.round((stats.total / stats.totalAvailable) * 100);
      
      // Get 5 most recent unlocks
      stats.recentUnlocks = achievements
        .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
        .slice(0, 5);

      return stats;
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return null;
    }
  }

  /**
   * Get available badges that player hasn't unlocked yet
   * @param {string} playerId - The player's ID
   * @param {number} limit - Limit number of results
   * @returns {Array} Array of available badge definitions
   */
  static async getAvailableBadges(playerId, limit = 10) {
    try {
      const playerAchievements = await Achievement.find({ playerId }).select('badgeId');
      const unlockedBadgeIds = playerAchievements.map(a => a.badgeId);
      
      const allBadges = Achievement.getBadgeDefinitions();
      const availableBadges = allBadges.filter(badge => 
        !unlockedBadgeIds.includes(badge.badgeId)
      );

      return availableBadges.slice(0, limit);
    } catch (error) {
      console.error('Error getting available badges:', error);
      return [];
    }
  }

  /**
   * Get next achievable badges based on current progress
   * @param {string} playerId - The player's ID
   * @param {Object} playerData - Current player data
   * @returns {Array} Array of next achievable badges with progress
   */
  static async getNextAchievableBadges(playerId, playerData = {}) {
    try {
      const playerAttributes = await PlayerAttribute.findOne({ playerId });
      if (!playerAttributes) return [];

      const attributeData = {
        Athletik: playerAttributes.athletik || 0,
        Aufschlag: playerAttributes.aufschlag || 0,
        Abwehr: playerAttributes.abwehr || 0,
        Angriff: playerAttributes.angriff || 0,
        Mental: playerAttributes.mental || 0,
        'Grund-Technik': playerAttributes.grundTechnik || 0,
        Positionsspezifisch: playerAttributes.positionsspezifisch || 0,
        Annahme: playerAttributes.annahme || 0,
        overallRating: playerAttributes.overallRating || 0
      };

      const availableBadges = await this.getAvailableBadges(playerId, 20);
      const nextAchievable = [];

      for (const badge of availableBadges) {
        if (badge.triggerType === 'rating_threshold') {
          let progress = 0;
          let progressText = '';

          if (badge.triggerValue.attribute === 'all') {
            const minRating = Math.min(...Object.values(attributeData));
            progress = Math.min((minRating / badge.triggerValue.threshold) * 100, 100);
            progressText = `Niedrigste Bewertung: ${minRating}/${badge.triggerValue.threshold}`;
          } else if (badge.triggerValue.attribute === 'overallRating') {
            progress = Math.min((attributeData.overallRating / badge.triggerValue.threshold) * 100, 100);
            progressText = `Gesamtwertung: ${attributeData.overallRating}/${badge.triggerValue.threshold}`;
          } else {
            const currentRating = attributeData[badge.triggerValue.attribute] || 0;
            progress = Math.min((currentRating / badge.triggerValue.threshold) * 100, 100);
            progressText = `${badge.triggerValue.attribute}: ${currentRating}/${badge.triggerValue.threshold}`;
          }

          if (progress >= 70) { // Only show badges that are close to being achieved
            nextAchievable.push({
              ...badge,
              progress,
              progressText
            });
          }
        }
      }

      return nextAchievable.sort((a, b) => b.progress - a.progress).slice(0, 5);
    } catch (error) {
      console.error('Error getting next achievable badges:', error);
      return [];
    }
  }

  /**
   * Delete all achievements for a player (for testing/admin purposes)
   * @param {string} playerId - The player's ID
   */
  static async resetPlayerAchievements(playerId) {
    try {
      await Achievement.deleteMany({ playerId });
      return true;
    } catch (error) {
      console.error('Error resetting player achievements:', error);
      return false;
    }
  }
}

module.exports = AchievementService;