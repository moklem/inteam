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
    required: false // Making it optional for backward compatibility
  },
  organizingTeams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
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
  // Voting deadline
  votingDeadline: {
    type: Date,
    required: false
  },
  // Track if auto-decline has been processed
  autoDeclineProcessed: {
    type: Boolean,
    default: false
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
  },
  // Training pool auto-invite settings
  trainingPoolAutoInvite: {
    enabled: {
      type: Boolean,
      default: false
    },
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingPool'
    },
    minParticipants: {
      type: Number,
      default: 6,
      min: 1
    },
    triggerType: {
      type: String,
      enum: ['deadline', 'hours_before'],
      default: 'deadline'
    },
    hoursBeforeEvent: {
      type: Number,
      default: 24,
      min: 1
    },
    invitesSent: {
      type: Boolean,
      default: false
    },
    invitesSentAt: Date,
    invitedPoolPlayers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  // MVP voting
  mvpVoting: {
    coachMVP: {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      selectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      selectedAt: Date,
      pointsAwarded: {
        type: Number,
        default: 15
      }
    },
    playerVoting: {
      enabled: {
        type: Boolean,
        default: false
      },
      votes: [{
        voter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedFor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedAt: {
          type: Date,
          default: Date.now
        }
      }],
      winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      pointsAwarded: {
        type: Number,
        default: 10
      },
      votingClosed: {
        type: Boolean,
        default: false
      }
    }
  },
  // Quick feedback tracking for VB-23
  quickFeedback: [{
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    providedAt: {
      type: Date,
      default: Date.now
    },
    provided: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Migrate single team to teams array and organizingTeam to organizingTeams
EventSchema.pre('save', function(next) {
  if (this.team && (!this.teams || this.teams.length === 0)) {
    this.teams = [this.team];
  }
  
  // Migrate single organizingTeam to organizingTeams array
  if (this.organizingTeam && (!this.organizingTeams || this.organizingTeams.length === 0)) {
    this.organizingTeams = [this.organizingTeam];
  }
  
  // Ensure organizingTeams is not empty - use first team if needed
  if ((!this.organizingTeams || this.organizingTeams.length === 0) && this.teams && this.teams.length > 0) {
    this.organizingTeams = [this.teams[0]];
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

// Method to check if a team is an organizing team
EventSchema.methods.isOrganizingTeam = function(teamId) {
  // Check new organizingTeams array
  if (this.organizingTeams && this.organizingTeams.length > 0) {
    return this.organizingTeams.some(team => team.toString() === teamId.toString());
  }
  // Fall back to old organizingTeam field for backward compatibility
  if (this.organizingTeam) {
    return this.organizingTeam.toString() === teamId.toString();
  }
  return false;
};

// Method to check if voting deadline has passed
EventSchema.methods.isVotingDeadlinePassed = function() {
  if (!this.votingDeadline) {
    return false; // No deadline set, voting always allowed
  }
  return new Date() > new Date(this.votingDeadline);
};

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

// Post-save hook to check for auto-invite triggers
EventSchema.post('save', async function(doc) {
  // Import here to avoid circular dependency
  const { checkAndTriggerAutoInvite, processVotingDeadlineAutoDecline } = require('../utils/trainingPoolAutoInvite');
  
  try {
    // Check if voting deadline has just passed and we should auto-decline
    if (doc.votingDeadline && !doc.autoDeclineProcessed) {
      const now = new Date();
      if (now >= new Date(doc.votingDeadline)) {
        console.log(`Voting deadline passed for event ${doc.title}, processing auto-decline and auto-invite`);
        await processVotingDeadlineAutoDecline(doc._id);
        return; // processVotingDeadlineAutoDecline will handle auto-invite if needed
      }
    }
    
    // Check if we should trigger auto-invite based on current conditions
    if (doc.trainingPoolAutoInvite?.enabled && !doc.trainingPoolAutoInvite?.invitesSent) {
      await checkAndTriggerAutoInvite(doc._id);
    }
  } catch (error) {
    console.error('Error in Event post-save hook:', error);
    // Don't throw error here to prevent save from failing
  }
});

module.exports = mongoose.model('Event', EventSchema);