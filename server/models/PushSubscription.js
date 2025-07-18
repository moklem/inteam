const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    endpoint: {
      type: String,
      required: true,
      unique: true
    },
    expirationTime: {
      type: Date,
      default: null
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    }
  },
  preferences: {
    eventReminders: {
      type: Boolean,
      default: true
    },
    guestInvitations: {
      type: Boolean,
      default: true
    },
    teamUpdates: {
      type: Boolean,
      default: true
    },
    reminderHours: {
      type: Number,
      default: 24
    }
  },
  lastNotificationSent: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on save
pushSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
pushSubscriptionSchema.index({ user: 1 });
pushSubscriptionSchema.index({ 'subscription.endpoint': 1 });
pushSubscriptionSchema.index({ 'subscription.expirationTime': 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);