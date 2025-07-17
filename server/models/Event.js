const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Training', 'Game'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  }],
  organizingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false
  },
  description: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attendingPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  declinedPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  guestPlayers: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fromTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  }],
  uninvitedPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notes: {
    type: String
  },
  // Open access field
  isOpenAccess: {
    type: Boolean,
    default: false
  },
  // Recurring event fields
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    required: function() { return this.isRecurring; }
  },
  recurringEndDate: {
    type: Date,
    required: function() { return this.isRecurring; }
  },
  recurringGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  isRecurringInstance: {
    type: Boolean,
    default: false
  },
  originalStartTime: {
    type: Date
  },
   _fixesApplied: [{
    type: String
  }],
  // Notification tracking
  lastReminderSent: {
    type: Date,
    default: null
  },
  lastMinuteReminderSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Migrate single team to teams array
EventSchema.pre('save', function(next) {
  if (this.team && (!this.teams || this.teams.length === 0)) {
    this.teams = [this.team];
  }
  next();
});

// Virtual to get the first team for backward compatibility
EventSchema.virtual('primaryTeam').get(function() {
  return this.teams && this.teams.length > 0 ? this.teams[0] : this.team;
});

// Method to check if a player is invited
EventSchema.methods.isPlayerInvited = function(userId) {
  return this.invitedPlayers.some(player => player.toString() === userId.toString());
};

// Method to check if a player is attending
EventSchema.methods.isPlayerAttending = function(userId) {
  return this.attendingPlayers.some(player => player.toString() === userId.toString());
};

// Method to check if a player has declined
EventSchema.methods.hasPlayerDeclined = function(userId) {
  return this.declinedPlayers.some(player => player.toString() === userId.toString());
};

// Method to add a player to attending and remove from declined
EventSchema.methods.acceptInvitation = function(userId) {
  // Remove from declined if present
  this.declinedPlayers = this.declinedPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Add to attending if not already there
  if (!this.isPlayerAttending(userId)) {
    this.attendingPlayers.push(userId);
  }
};

// Method to add a player to declined and remove from attending
EventSchema.methods.declineInvitation = function(userId) {
  // Remove from attending if present
  this.attendingPlayers = this.attendingPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Add to declined if not already there
  if (!this.hasPlayerDeclined(userId)) {
    this.declinedPlayers.push(userId);
  }
};

module.exports = mongoose.model('Event', EventSchema);