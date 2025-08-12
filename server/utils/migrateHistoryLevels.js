const mongoose = require('mongoose');
const PlayerAttribute = require('../models/PlayerAttribute');
require('dotenv').config();

/**
 * Migration script to add level information to existing progressionHistory entries
 * This ensures historical data displays correctly on charts
 */

async function migrateHistoryLevels() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all player attributes
    const attributes = await PlayerAttribute.find({});
    console.log(`Found ${attributes.length} attributes to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const attr of attributes) {
      if (!attr.progressionHistory || attr.progressionHistory.length === 0) {
        skippedCount++;
        continue;
      }

      let needsMigration = false;
      const leagues = PlayerAttribute.getLeagueLevels();
      
      // Calculate what level the player started at
      let levelUpsInHistory = 0;
      attr.progressionHistory.forEach(entry => {
        if (entry.notes && entry.notes.includes('Level-Aufstieg')) {
          levelUpsInHistory++;
        }
      });
      
      const startingLevel = Math.max(0, (attr.level || 0) - levelUpsInHistory);
      let currentLevel = startingLevel;
      
      // Update each history entry with the correct level
      attr.progressionHistory.forEach((entry, index) => {
        // Check if this entry is a level-up
        if (entry.notes && entry.notes.includes('Level-Aufstieg')) {
          // Extract the target level from the notes
          const levelMatch = entry.notes.match(/Level-Aufstieg: (.+) → (.+)/);
          if (levelMatch) {
            const toLeague = levelMatch[2];
            const newLevel = leagues.indexOf(toLeague);
            if (newLevel >= 0) {
              currentLevel = newLevel;
            }
          }
        }
        
        // Set the level if it's not already set or incorrect
        if (entry.level === undefined || entry.level === null || entry.level !== currentLevel) {
          entry.level = currentLevel;
          needsMigration = true;
        }
      });

      if (needsMigration) {
        // Mark the progressionHistory as modified so Mongoose saves it
        attr.markModified('progressionHistory');
        await attr.save();
        migratedCount++;
        console.log(`Migrated ${attr.attributeName} for player ${attr.player}`);
      } else {
        skippedCount++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migratedCount} attributes`);
    console.log(`Skipped (already had levels): ${skippedCount} attributes`);
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateHistoryLevels();