const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['H1', 'H2', 'H3', 'H4', 'H5', 'U20', 'U18', 'U16']
  },
  type: {
    type: String,
    enum: ['Adult', 'Youth'],
    required: true
  },
  description: {
    type: String
  },
  coaches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for getting all team members (coaches + players)
TeamSchema.virtual('members').get(function() {
  return [...this.coaches, ...this.players];
});

// Method to check if a user is a member of the team
TeamSchema.methods.isMember = function(userId) {
  return this.players.some(player => player.toString() === userId.toString()) || 
         this.coaches.some(coach => coach.toString() === userId.toString());
};

// Method to add a player to the team
TeamSchema.methods.addPlayer = function(userId) {
  if (!this.players.includes(userId)) {
    this.players.push(userId);
  }
};

// Method to remove a player from the team
TeamSchema.methods.removePlayer = function(userId) {
  this.players = this.players.filter(player => player.toString() !== userId.toString());
};

module.exports = mongoose.model('Team', TeamSchema);