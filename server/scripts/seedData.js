require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const Event = require('../models/Event');
const PlayerAttribute = require('../models/PlayerAttribute');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/volleyball-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected for seeding'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample data
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Team.deleteMany({});
    await Event.deleteMany({});
    await PlayerAttribute.deleteMany({});
    
    console.log('Cleared existing data');

    // Create users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create coaches
    const coach1 = await User.create({
      name: 'Thomas Müller',
      email: 'coach1@example.com',
      password: passwordHash,
      role: 'Trainer',
      birthDate: new Date('1985-05-15'),
      phoneNumber: '0123456789',
      position: 'Universal'
    });
    
    const coach2 = await User.create({
      name: 'Sandra Schmidt',
      email: 'coach2@example.com',
      password: passwordHash,
      role: 'Trainer',
      birthDate: new Date('1982-08-22'),
      phoneNumber: '0123456790',
      position: 'Zuspieler'
    });
    
    console.log('Created coaches');
    
    // Create adult players
    const adultPlayers = [];
    for (let i = 1; i <= 15; i++) {
      const player = await User.create({
        name: `Spieler ${i}`,
        email: `player${i}@example.com`,
        password: passwordHash,
        role: 'Spieler',
        birthDate: new Date(`199${i % 9}-${(i % 12) + 1}-${(i % 28) + 1}`),
        phoneNumber: `01234567${i < 10 ? '0' + i : i}`,
        position: ['Zuspieler', 'Mittelblocker', 'Außenangreifer', 'Diagonalangreifer', 'Libero'][i % 5]
      });
      adultPlayers.push(player);
    }
    
    console.log('Created adult players');
    
    // Create youth players
    const youthPlayers = [];
    for (let i = 1; i <= 10; i++) {
      const player = await User.create({
        name: `Jugendspieler ${i}`,
        email: `youth${i}@example.com`,
        password: passwordHash,
        role: 'Jugendspieler',
        birthDate: new Date(`200${i % 5 + 3}-${(i % 12) + 1}-${(i % 28) + 1}`),
        phoneNumber: `09876543${i < 10 ? '0' + i : i}`,
        position: ['Zuspieler', 'Mittelblocker', 'Außenangreifer', 'Diagonalangreifer', 'Libero'][i % 5]
      });
      youthPlayers.push(player);
    }
    
    console.log('Created youth players');
    
    // Create teams
    const teams = [];
    
    // Adult teams
    for (let i = 1; i <= 5; i++) {
      const team = await Team.create({
        name: `H${i}`,
        type: 'Adult',
        description: `Herrenmannschaft ${i}`,
        coaches: i === 1 ? [coach1._id, coach2._id] : (i % 2 === 0 ? [coach1._id] : [coach2._id]),
        players: adultPlayers.slice((i-1)*3, i*3).map(p => p._id)
      });
      teams.push(team);
    }
    
    // Youth teams
    const youthTeamNames = ['U20', 'U18', 'U16'];
    for (let i = 0; i < youthTeamNames.length; i++) {
      const team = await Team.create({
        name: youthTeamNames[i],
        type: 'Youth',
        description: `Jugendmannschaft ${youthTeamNames[i]}`,
        coaches: i === 0 ? [coach1._id] : [coach2._id],
        players: youthPlayers.slice(i*3, (i+1)*3 + 1).map(p => p._id)
      });
      teams.push(team);
    }
    
    console.log('Created teams');
    
    // Update user teams
    for (const team of teams) {
      // Update coaches
      for (const coachId of team.coaches) {
        await User.findByIdAndUpdate(coachId, {
          $addToSet: { teams: team._id }
        });
      }
      
      // Update players
      for (const playerId of team.players) {
        await User.findByIdAndUpdate(playerId, {
          $addToSet: { teams: team._id }
        });
      }
    }
    
    console.log('Updated user teams');
    
    // Create events
    const now = new Date();
    const events = [];
    
    // Training events
    for (const team of teams) {
      // Past trainings
      for (let i = 1; i <= 3; i++) {
        const startTime = new Date(now);
        startTime.setDate(now.getDate() - (i * 7));
        startTime.setHours(18, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(20, 0, 0, 0);
        
        const event = await Event.create({
          title: `Training ${team.name}`,
          type: 'Training',
          startTime,
          endTime,
          location: 'Sporthalle Musterstadt',
          team: team._id,
          description: `Reguläres Training für Team ${team.name}`,
          createdBy: team.coaches[0],
          invitedPlayers: team.players,
          attendingPlayers: team.players.slice(0, Math.ceil(team.players.length * 0.8)),
          declinedPlayers: team.players.slice(Math.ceil(team.players.length * 0.8)),
          guestPlayers: []
        });
        events.push(event);
      }
      
      // Future trainings
      for (let i = 1; i <= 4; i++) {
        const startTime = new Date(now);
        startTime.setDate(now.getDate() + (i * 7));
        startTime.setHours(18, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(20, 0, 0, 0);
        
        const event = await Event.create({
          title: `Training ${team.name}`,
          type: 'Training',
          startTime,
          endTime,
          location: 'Sporthalle Musterstadt',
          team: team._id,
          description: `Reguläres Training für Team ${team.name}`,
          createdBy: team.coaches[0],
          invitedPlayers: team.players,
          attendingPlayers: team.players.slice(0, Math.floor(team.players.length * 0.5)),
          declinedPlayers: [],
          guestPlayers: []
        });
        events.push(event);
      }
    }
    
    // Game events
    for (let i = 0; i < 3; i++) {
      const team = teams[i];
      
      // Past game
      const pastStartTime = new Date(now);
      pastStartTime.setDate(now.getDate() - ((i+1) * 10));
      pastStartTime.setHours(15, 0, 0, 0);
      
      const pastEndTime = new Date(pastStartTime);
      pastEndTime.setHours(17, 0, 0, 0);
      
      const pastGame = await Event.create({
        title: `Spiel: ${team.name} vs. Gegner ${i+1}`,
        type: 'Game',
        startTime: pastStartTime,
        endTime: pastEndTime,
        location: 'Wettkampfhalle Musterstadt',
        team: team._id,
        description: `Ligaspiel gegen Gegner ${i+1}`,
        createdBy: team.coaches[0],
        invitedPlayers: team.players,
        attendingPlayers: team.players,
        declinedPlayers: [],
        guestPlayers: []
      });
      events.push(pastGame);
      
      // Future game
      const futureStartTime = new Date(now);
      futureStartTime.setDate(now.getDate() + ((i+1) * 14));
      futureStartTime.setHours(15, 0, 0, 0);
      
      const futureEndTime = new Date(futureStartTime);
      futureEndTime.setHours(17, 0, 0, 0);
      
      const futureGame = await Event.create({
        title: `Spiel: ${team.name} vs. Gegner ${i+4}`,
        type: 'Game',
        startTime: futureStartTime,
        endTime: futureEndTime,
        location: 'Wettkampfhalle Musterstadt',
        team: team._id,
        description: `Ligaspiel gegen Gegner ${i+4}`,
        createdBy: team.coaches[0],
        invitedPlayers: team.players,
        attendingPlayers: [],
        declinedPlayers: [],
        guestPlayers: []
      });
      events.push(futureGame);
    }
    
    console.log('Created events');
    
    // Create player attributes
    const attributeNames = [
      'Aufschlag', 'Annahme', 'Zuspiel', 'Angriff', 'Block', 
      'Abwehr', 'Taktisches Verständnis', 'Teamfähigkeit'
    ];
    
    const attributeCategories = [
      'Technical', 'Technical', 'Technical', 'Technical', 'Technical',
      'Technical', 'Tactical', 'Mental'
    ];
    
    // Add attributes for all players in the first team
    const team1Players = await User.find({ teams: teams[0]._id });
    
    for (const player of team1Players) {
      for (let i = 0; i < attributeNames.length; i++) {
        await PlayerAttribute.create({
          player: player._id,
          attributeName: attributeNames[i],
          category: attributeCategories[i],
          numericValue: Math.floor(Math.random() * 5) + 5, // 5-10
          notes: `Notizen für ${attributeNames[i]} von ${player.name}`,
          updatedBy: coach1._id,
          team: teams[0]._id,
          history: []
        });
      }
    }
    
    // Add attributes for youth players in the first youth team
    const youthTeam1Players = await User.find({ teams: teams[5]._id });
    
    for (const player of youthTeam1Players) {
      for (let i = 0; i < attributeNames.length; i++) {
        await PlayerAttribute.create({
          player: player._id,
          attributeName: attributeNames[i],
          category: attributeCategories[i],
          numericValue: Math.floor(Math.random() * 4) + 4, // 4-8
          notes: `Entwicklungsnotizen für ${attributeNames[i]} von ${player.name}`,
          updatedBy: coach1._id,
          team: teams[5]._id,
          history: []
        });
      }
    }
    
    console.log('Created player attributes');
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();