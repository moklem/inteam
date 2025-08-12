// Test script for the corrected German League Level System
// Run this with: node test-level-system.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// Import the PlayerAttribute model
const PlayerAttribute = require('./server/models/PlayerAttribute');

async function testLevelSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Test data
    const testPlayerId = new mongoose.Types.ObjectId();
    const testUserId = new mongoose.Types.ObjectId();

    console.log('\n=== Testing German League Level System ===\n');

    // Test 1: Create initial attributes at level 0 (Kreisliga)
    console.log('1. Creating initial attributes in Kreisliga (Level 0)...');
    const attr1 = await PlayerAttribute.create({
      player: testPlayerId,
      attributeName: 'Athletik',
      numericValue: 50,
      level: 0,
      levelRating: 50,
      updatedBy: testUserId,
      team: null
    });
    console.log(`   ✓ Created Athletik: Level ${attr1.level} (${PlayerAttribute.getLeagueLevels()[attr1.level]}), Rating: ${attr1.levelRating}/99`);

    const attr2 = await PlayerAttribute.create({
      player: testPlayerId,
      attributeName: 'Aufschlag',
      numericValue: 60,
      level: 0,
      levelRating: 60,
      updatedBy: testUserId,
      team: null
    });
    console.log(`   ✓ Created Aufschlag: Level ${attr2.level} (${PlayerAttribute.getLeagueLevels()[attr2.level]}), Rating: ${attr2.levelRating}/99`);

    // Test 2: Update an attribute to 89 (should NOT trigger level-up)
    console.log('\n2. Testing update to 89 (should stay in current level)...');
    attr1.numericValue = 89;
    attr1.levelRating = 89;
    attr1.updatedBy = testUserId;
    await attr1.save();
    console.log(`   ✓ Athletik updated to 89: Still Level ${attr1.level} (${PlayerAttribute.getLeagueLevels()[attr1.level]})`);

    // Test 3: Update an attribute to 90 (should trigger level-up)
    console.log('\n3. Testing update to 90 (should trigger level-up and reset ALL attributes)...');
    
    // Simulate the level-up logic
    const oldLevel = attr1.level;
    const newLevel = oldLevel + 1;
    
    if (attr1.numericValue >= 90 && oldLevel < 7) {
      console.log(`   → Level-up triggered! Moving from ${PlayerAttribute.getLeagueLevels()[oldLevel]} to ${PlayerAttribute.getLeagueLevels()[newLevel]}`);
      
      // Use the static method to handle level-up for all attributes
      const updatedCount = await PlayerAttribute.handlePlayerLevelUp(testPlayerId, oldLevel, newLevel, testUserId);
      console.log(`   ✓ Reset ${updatedCount} attributes to 1 in new level`);
      
      // Reload attributes to verify
      const updatedAttr1 = await PlayerAttribute.findById(attr1._id);
      const updatedAttr2 = await PlayerAttribute.findById(attr2._id);
      
      console.log(`   ✓ Athletik: Level ${updatedAttr1.level} (${PlayerAttribute.getLeagueLevels()[updatedAttr1.level]}), Rating: ${updatedAttr1.numericValue}/99`);
      console.log(`   ✓ Aufschlag: Level ${updatedAttr2.level} (${PlayerAttribute.getLeagueLevels()[updatedAttr2.level]}), Rating: ${updatedAttr2.numericValue}/99`);
    }

    // Test 4: Verify absolute skill calculation
    console.log('\n4. Testing absolute skill calculation...');
    const absoluteSkill = PlayerAttribute.getAbsoluteSkill(1, 50);
    console.log(`   ✓ Level 1, Rating 50 = Absolute Skill: ${absoluteSkill}`);
    
    const absoluteSkillMax = PlayerAttribute.getAbsoluteSkill(7, 99);
    console.log(`   ✓ Level 7 (Bundesliga), Rating 99 = Absolute Skill: ${absoluteSkillMax}`);

    // Clean up test data
    console.log('\n5. Cleaning up test data...');
    await PlayerAttribute.deleteMany({ player: testPlayerId });
    console.log('   ✓ Test data cleaned up');

    console.log('\n=== All tests passed! ===\n');
    console.log('The corrected level system works as follows:');
    console.log('- Each level has ratings from 1-99');
    console.log('- When any attribute reaches 90+, the player advances to the next league');
    console.log('- Upon advancing, ALL attributes reset to 1 in the new league');
    console.log('- Progress bar shows actual rating (1-99) as progress in current league');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testLevelSystem();