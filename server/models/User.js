const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Spieler', 'Trainer', 'Jugendspieler'],
    required: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  birthDate: {
    type: Date,
    required: function() {
      return this.role === 'Spieler' || this.role === 'Jugendspieler';
    }
  },
  phoneNumber: {
    type: String
  },
  position: {
    type: String
  },
  // Notification prompt tracking
  notificationPromptShown: {
    type: Boolean,
    default: false
  },
  notificationPromptDismissedAt: {
    type: Date,
    default: null
  },
  // Training preferences
  trainingPreferences: {
    focusAreas: [{
      area: {
        type: String,
        enum: ['technik', 'taktik', 'kondition', 'mental'],
        required: true
      },
      priority: {
        type: Number,
        min: 1,
        max: 3,
        required: true
      },
      icon: {
        type: String,
        required: true
      },
      color: {
        type: String,
        required: true
      }
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Interface customization preferences
  interfacePreferences: {
    theme: {
      mode: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },
      primaryColor: {
        type: String,
        default: '#1976d2'
      },
      accentColor: {
        type: String,
        default: '#f50057'
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      }
    },
    layout: {
      dashboardWidgets: [{
        id: {
          type: String,
          required: true
        },
        position: {
          type: Number,
          required: true
        },
        visible: {
          type: Boolean,
          default: true
        }
      }],
      defaultPage: {
        type: String,
        default: '/player'
      },
      viewMode: {
        type: String,
        enum: ['compact', 'comfortable'],
        default: 'comfortable'
      }
    },
    shortcuts: [{
      type: String
    }],
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: [{
        type: String,
        enum: ['events', 'teams', 'invitations'],
        default: ['events', 'teams', 'invitations']
      }],
      quietHours: {
        enabled: {
          type: Boolean,
          default: false
        },
        start: {
          type: String,
          default: '22:00'
        },
        end: {
          type: String,
          default: '08:00'
        }
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to check if user is a youth player (under 20 years old)
UserSchema.methods.isYouthPlayer = function() {
  if (!this.birthDate) return false;
  
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Check if age will exceed 20 this year or next year
  return age <= 20 || (age === 20 && monthDiff < 0);
};

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);