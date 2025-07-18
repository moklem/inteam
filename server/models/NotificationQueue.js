const mongoose = require('mongoose');

const NotificationQueueSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  reminderTime: {
    hours: {
      type: Number,
      required: true
    },
    minutes: {
      type: Number,
      default: 0
    }
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
NotificationQueueSchema.index({ scheduledTime: 1, status: 1 });
NotificationQueueSchema.index({ eventId: 1, 'reminderTime.hours': 1, 'reminderTime.minutes': 1 });

module.exports = mongoose.model('NotificationQueue', NotificationQueueSchema);