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
  unsurePlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  playerResponses: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['declined', 'unsure'],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
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
  // Notification settings
  notificationSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    reminderTimes: [{
      hours: {
        type: Number,
        required: true
      },
      minutes: {
        type: Number,
        default: 0
      }
    }],
    customMessage: {
      type: String,
      default: ''
    }
  },
  // Notification tracking
  lastReminderSent: {
    type: Date,
    default: null
  },
  lastMinuteReminderSent: {
    type: Boolean,
    default: false
  },
  remindersSent: [{
    reminderTime: {
      type: Number, // hours before event
      required: true
    },
    reminderMinutes: {
      type: Number, // minutes before event
      default: 0
    },
    sentAt: {
      type: Date,
      required: true
    }
  }],
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
  
  // Set default notification settings if not provided
  if (!this.notificationSettings || !this.notificationSettings.reminderTimes || this.notificationSettings.reminderTimes.length === 0) {
    this.notificationSettings = {
      enabled: true,
      reminderTimes: [
        { hours: 24, minutes: 0 },
        { hours: 1, minutes: 0 }
      ],
      customMessage: ''
    };
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

// Method to check if a player is unsure
EventSchema.methods.isPlayerUnsure = function(userId) {
  return this.unsurePlayers.some(player => player.toString() === userId.toString());
};

// Method to add a player to attending and remove from declined/unsure
EventSchema.methods.acceptInvitation = function(userId) {
  // Remove from declined if present
  this.declinedPlayers = this.declinedPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Remove from unsure if present
  this.unsurePlayers = this.unsurePlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Remove from playerResponses if present
  this.playerResponses = this.playerResponses.filter(
    response => response.player.toString() !== userId.toString()
  );
  
  // Add to attending if not already there
  if (!this.isPlayerAttending(userId)) {
    this.attendingPlayers.push(userId);
  }
};

// Method to add a player to declined and remove from attending/unsure
EventSchema.methods.declineInvitation = function(userId, reason) {
  // Remove from attending if present
  this.attendingPlayers = this.attendingPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Remove from unsure if present
  this.unsurePlayers = this.unsurePlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Add to declined if not already there
  if (!this.hasPlayerDeclined(userId)) {
    this.declinedPlayers.push(userId);
  }
  
  // Update or add response reason
  const existingResponseIndex = this.playerResponses.findIndex(
    response => response.player.toString() === userId.toString()
  );
  
  if (existingResponseIndex >= 0) {
    this.playerResponses[existingResponseIndex] = {
      player: userId,
      status: 'declined',
      reason: reason,
      respondedAt: new Date()
    };
  } else {
    this.playerResponses.push({
      player: userId,
      status: 'declined',
      reason: reason
    });
  }
};

// Method to add a player to unsure and remove from attending/declined
EventSchema.methods.markAsUnsure = function(userId, reason) {
  // Remove from attending if present
  this.attendingPlayers = this.attendingPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Remove from declined if present
  this.declinedPlayers = this.declinedPlayers.filter(
    player => player.toString() !== userId.toString()
  );
  
  // Add to unsure if not already there
  if (!this.isPlayerUnsure(userId)) {
    this.unsurePlayers.push(userId);
  }
  
  // Update or add response reason
  const existingResponseIndex = this.playerResponses.findIndex(
    response => response.player.toString() === userId.toString()
  );
  
  if (existingResponseIndex >= 0) {
    this.playerResponses[existingResponseIndex] = {
      player: userId,
      status: 'unsure',
      reason: reason,
      respondedAt: new Date()
    };
  } else {
    this.playerResponses.push({
      player: userId,
      status: 'unsure',
      reason: reason
    });
  }
};

module.exports = mongoose.model('Event', EventSchema);