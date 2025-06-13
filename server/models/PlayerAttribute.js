const mongoose = require('mongoose');

const PlayerAttributeSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attributeName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Technical', 'Tactical', 'Physical', 'Mental', 'Other'],
    default: 'Other'
  },
  numericValue: {
    type: Number,
    min: 1,
    max: 10
  },
  textValue: {
    type: String
  },
  notes: {
    type: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  history: [{
    value: {
      type: mongoose.Schema.Types.Mixed
    },
    notes: {
      type: String
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to track history
PlayerAttributeSchema.pre('save', function(next) {
  // If this is not a new document and something has changed
  if (!this.isNew && (this.isModified('numericValue') || this.isModified('textValue') || this.isModified('notes'))) {
    this.history.push({
      value: this.numericValue || this.textValue,
      notes: this.notes,
      updatedBy: this.updatedBy,
      updatedAt: new Date()
    });
  }
  next();
});

// Static method to get all attributes for a player
PlayerAttributeSchema.statics.getPlayerAttributes = async function(playerId) {
  return this.find({ player: playerId }).sort({ category: 1, attributeName: 1 });
};

// Static method to get player progress over time
PlayerAttributeSchema.statics.getPlayerProgress = async function(playerId, attributeName) {
  const attribute = await this.findOne({ player: playerId, attributeName });
  if (!attribute) return null;
  
  return {
    current: attribute.numericValue || attribute.textValue,
    history: attribute.history.map(h => ({
      value: h.value,
      notes: h.notes,
      updatedAt: h.updatedAt
    }))
  };
};

module.exports = mongoose.model('PlayerAttribute', PlayerAttributeSchema);