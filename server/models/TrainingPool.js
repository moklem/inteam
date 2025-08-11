const mongoose = require('mongoose');

// Define league levels with their rating ranges for training pools
// Names match PlayerAttribute model, but with custom rating thresholds for pool access
const LEAGUE_LEVELS = {
  'Kreisliga': { min: 1, max: 14, order: 1 },           // Entry level
  'Bezirksklasse': { min: 15, max: 27, order: 2 },      // +12 points
  'Bezirksliga': { min: 28, max: 40, order: 3 },        // +12 points  
  'Landesliga': { min: 41, max: 53, order: 4 },         // +12 points
  'Bayernliga': { min: 54, max: 66, order: 5 },         // +12 points
  'Regionalliga': { min: 67, max: 79, order: 6 },       // +12 points
  'Dritte Liga': { min: 80, max: 92, order: 7 },        // +12 points
  'Bundesliga': { min: 93, max: 99, order: 8 }          // Top level
};

const TrainingPoolSchema = new mongoose.Schema({
  // Pool identification
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['team', 'league'],
    required: true
  },
  
  // For team-specific pools
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: function() { return this.type === 'team'; }
  },
  
  // For league-level pools
  leagueLevel: {
    type: String,
    enum: Object.keys(LEAGUE_LEVELS),
    required: function() { return this.type === 'league'; }
  },
  
  // Rating requirements
  minRating: {
    type: Number,
    min: 1,
    max: 99,
    required: true
  },
  maxRating: {
    type: Number,
    min: 1,
    max: 99,
    required: true
  },
  
  // Attendance requirement (percentage over 3 months)
  minAttendancePercentage: {
    type: Number,
    default: 75,
    min: 0,
    max: 100
  },
  
  // Players in the pool
  eligiblePlayers: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    qualifiedDate: {
      type: Date,
      default: Date.now
    },
    currentRating: {
      type: Number,
      min: 1,
      max: 99
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Players pending coach approval
  pendingApproval: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    currentRating: {
      type: Number,
      min: 1,
      max: 99
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  
  // Players approved by coach
  approvedPlayers: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedDate: {
      type: Date,
      default: Date.now
    },
    currentRating: {
      type: Number,
      min: 1,
      max: 99
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  
  // Auto-invite settings
  autoInviteEnabled: {
    type: Boolean,
    default: false
  },
  autoInviteRules: {
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
    }
  },
  
  // Statistics
  stats: {
    totalInvitesSent: {
      type: Number,
      default: 0
    },
    totalAccepted: {
      type: Number,
      default: 0
    },
    lastInviteDate: Date
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
TrainingPoolSchema.index({ team: 1, type: 1 });
TrainingPoolSchema.index({ leagueLevel: 1, type: 1 });
TrainingPoolSchema.index({ 'eligiblePlayers.player': 1 });
TrainingPoolSchema.index({ 'approvedPlayers.player': 1 });

// Static method to get league level for a rating
TrainingPoolSchema.statics.getLeagueLevel = function(rating) {
  for (const [league, range] of Object.entries(LEAGUE_LEVELS)) {
    if (rating >= range.min && rating <= range.max) {
      return league;
    }
  }
  return 'Kreisliga'; // Default to lowest level
};

// Static method to get all league levels in order
TrainingPoolSchema.statics.getLeagueLevels = function() {
  return Object.entries(LEAGUE_LEVELS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name, data]) => ({
      name,
      ...data
    }));
};

// Method to check if a player is eligible
TrainingPoolSchema.methods.isPlayerEligible = function(playerId, playerRating, attendancePercentage) {
  // Check rating requirements
  if (playerRating < this.minRating || playerRating > this.maxRating) {
    return false;
  }
  
  // Check attendance requirements
  if (attendancePercentage < this.minAttendancePercentage) {
    return false;
  }
  
  // Check if already in pool
  const isInPool = this.approvedPlayers.some(
    p => p.player.toString() === playerId.toString()
  );
  
  return !isInPool;
};

// Method to add player to pending approval
TrainingPoolSchema.methods.requestAccess = function(playerId, playerRating, attendancePercentage) {
  // Check if already pending
  const isPending = this.pendingApproval.some(
    p => p.player.toString() === playerId.toString()
  );
  
  if (!isPending && this.isPlayerEligible(playerId, playerRating, attendancePercentage)) {
    this.pendingApproval.push({
      player: playerId,
      currentRating: playerRating,
      attendancePercentage: attendancePercentage
    });
    return true;
  }
  return false;
};

// Method to approve a player
TrainingPoolSchema.methods.approvePlayer = function(playerId, coachId) {
  const pendingIndex = this.pendingApproval.findIndex(
    p => p.player.toString() === playerId.toString()
  );
  
  if (pendingIndex !== -1) {
    const pendingPlayer = this.pendingApproval[pendingIndex];
    
    // Add to approved players
    this.approvedPlayers.push({
      player: pendingPlayer.player,
      approvedBy: coachId,
      currentRating: pendingPlayer.currentRating,
      attendancePercentage: pendingPlayer.attendancePercentage
    });
    
    // Remove from pending
    this.pendingApproval.splice(pendingIndex, 1);
    
    return true;
  }
  return false;
};

// Method to remove a player from the pool
TrainingPoolSchema.methods.removePlayer = function(playerId) {
  // Remove from approved players
  this.approvedPlayers = this.approvedPlayers.filter(
    p => p.player.toString() !== playerId.toString()
  );
  
  // Remove from eligible players
  this.eligiblePlayers = this.eligiblePlayers.filter(
    p => p.player.toString() !== playerId.toString()
  );
  
  // Remove from pending approval
  this.pendingApproval = this.pendingApproval.filter(
    p => p.player.toString() !== playerId.toString()
  );
};

// Method to get available players for auto-invite
TrainingPoolSchema.methods.getAvailablePlayersForInvite = function(excludePlayerIds = []) {
  return this.approvedPlayers.filter(p => {
    const playerId = p.player.toString();
    return !excludePlayerIds.some(id => id.toString() === playerId);
  });
};

module.exports = mongoose.model('TrainingPool', TrainingPoolSchema);