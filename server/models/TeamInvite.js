const mongoose = require('mongoose');
const crypto = require('crypto');

const TeamInviteSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: null // null means unlimited usage
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Generate unique invite code
TeamInviteSchema.statics.generateInviteCode = function() {
  return crypto.randomBytes(16).toString('hex');
};

// Check if invite is valid
TeamInviteSchema.methods.isValid = function() {
  // Check if invite is active
  if (!this.isActive) return false;
  
  // Check expiration
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  
  // Check usage limit
  if (this.maxUsage && this.usageCount >= this.maxUsage) return false;
  
  return true;
};

// Use the invite
TeamInviteSchema.methods.use = async function(userId) {
  if (!this.isValid()) {
    throw new Error('Invite is no longer valid');
  }
  
  this.usageCount += 1;
  this.usedBy.push({
    user: userId,
    usedAt: new Date()
  });
  
  await this.save();
};

module.exports = mongoose.model('TeamInvite', TeamInviteSchema);