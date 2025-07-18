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