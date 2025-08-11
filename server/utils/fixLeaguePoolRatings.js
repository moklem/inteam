// Migration script to fix league pools that don't have minRating and maxRating set
const mongoose = require('mongoose');
const TrainingPool = require('../models/TrainingPool');
require('dotenv').config();

// League level definitions (must match TrainingPool model)
const LEAGUE_LEVELS = {
  'Kreisliga': { min: 1, max: 14 },
  'Bezirksklasse': { min: 15, max: 27 },
  'Bezirksliga': { min: 28, max: 40 },
  'Landesliga': { min: 41, max: 53 },
  'Bayernliga': { min: 54, max: 66 },
  'Regionalliga': { min: 67, max: 79 },
  'Dritte Liga': { min: 80, max: 92 },
  'Bundesliga': { min: 93, max: 99 }
};

async function fixLeaguePoolRatings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all league pools
    const leaguePools = await TrainingPool.find({ type: 'league' });
    console.log(`Found ${leaguePools.length} league pools`);

    let fixedCount = 0;
    for (const pool of leaguePools) {
      let needsUpdate = false;

      // Check if minRating or maxRating is missing or incorrect
      if (!pool.minRating || !pool.maxRating || 
          (pool.leagueLevel && LEAGUE_LEVELS[pool.leagueLevel])) {
        
        // Get the correct values from league level
        if (pool.leagueLevel && LEAGUE_LEVELS[pool.leagueLevel]) {
          const levelData = LEAGUE_LEVELS[pool.leagueLevel];
          
          // Update if values are missing or different
          if (pool.minRating !== levelData.min || pool.maxRating !== levelData.max) {
            console.log(`Fixing pool "${pool.name}" (${pool.leagueLevel}): ${pool.minRating}-${pool.maxRating} -> ${levelData.min}-${levelData.max}`);
            pool.minRating = levelData.min;
            pool.maxRating = levelData.max;
            needsUpdate = true;
          }
        }
      }

      // Set default attendance if missing
      if (pool.minAttendancePercentage === undefined || pool.minAttendancePercentage === null) {
        console.log(`Setting default attendance requirement for pool "${pool.name}"`);
        pool.minAttendancePercentage = 0; // Set to 0 for league pools by default
        needsUpdate = true;
      }

      if (needsUpdate) {
        await pool.save();
        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} league pools`);

    // Also check team pools for missing attendance requirements
    const teamPools = await TrainingPool.find({ type: 'team' });
    console.log(`Found ${teamPools.length} team pools`);

    let teamFixedCount = 0;
    for (const pool of teamPools) {
      if (pool.minAttendancePercentage === undefined || pool.minAttendancePercentage === null) {
        console.log(`Setting default attendance requirement for team pool "${pool.name}"`);
        pool.minAttendancePercentage = 75; // Default 75% for team pools
        await pool.save();
        teamFixedCount++;
      }
    }

    console.log(`Fixed ${teamFixedCount} team pools`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing league pool ratings:', error);
    process.exit(1);
  }
}

// Run the migration
fixLeaguePoolRatings();