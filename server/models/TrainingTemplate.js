const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  sets: { type: Number, default: 1 },
  reps: { type: String, default: '10' },
  duration: { type: String },
  intensity: { type: String, enum: ['niedrig', 'mittel', 'hoch'], default: 'mittel' },
  description: { type: String },
  customizable: { type: Boolean, default: true }
});

const phaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  weeks: { type: Number, required: true },
  focusAreas: [{ 
    type: String, 
    enum: ['Technik', 'Taktik', 'Kondition', 'Mental'],
    required: true 
  }],
  exercises: [exerciseSchema],
  goals: { type: String },
  notes: { type: String }
});

const customizableParamSchema = new mongoose.Schema({
  param: { type: String, required: true },
  label: { type: String, required: true },
  defaultValue: { type: mongoose.Schema.Types.Mixed, required: true },
  options: [{ type: mongoose.Schema.Types.Mixed }],
  type: { 
    type: String, 
    enum: ['number', 'select', 'text', 'boolean'], 
    required: true 
  }
});

const usageSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 }
});

const trainingTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    required: true, 
    maxlength: 500 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: {
    type: String,
    required: true,
    enum: ['Anfänger', 'Fortgeschritten', 'Wettkampf', 'Position-spezifisch', 'Saisonvorbereitung', 'Kondition', 'Technik', 'Taktik']
  },
  visibility: {
    type: String,
    required: true,
    enum: ['public', 'team', 'private'],
    default: 'team'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  duration: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['Tage', 'Wochen', 'Monate'], default: 'Wochen' }
  },
  phases: [phaseSchema],
  customizableParams: [customizableParamSchema],
  tags: [{ type: String, trim: true }],
  targetLevel: {
    type: String,
    enum: ['Anfänger', 'Fortgeschritten', 'Profi'],
    required: true
  },
  usage: usageSchema,
  version: { type: Number, default: 1 },
  originalTemplate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TrainingTemplate' 
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
trainingTemplateSchema.index({ createdBy: 1 });
trainingTemplateSchema.index({ category: 1 });
trainingTemplateSchema.index({ visibility: 1 });
trainingTemplateSchema.index({ teamId: 1 });
trainingTemplateSchema.index({ tags: 1 });
trainingTemplateSchema.index({ 'usage.rating': -1 });
trainingTemplateSchema.index({ createdAt: -1 });

// Virtual for average rating
trainingTemplateSchema.virtual('averageRating').get(function() {
  return this.usage.ratingCount > 0 ? this.usage.rating / this.usage.ratingCount : 0;
});

// Methods
trainingTemplateSchema.methods.incrementUsage = function() {
  this.usage.count += 1;
  return this.save();
};

trainingTemplateSchema.methods.addRating = function(rating) {
  this.usage.rating += rating;
  this.usage.ratingCount += 1;
  return this.save();
};

trainingTemplateSchema.methods.canBeViewedBy = function(user) {
  if (this.visibility === 'public') return true;
  if (this.visibility === 'private') return this.createdBy.toString() === user._id.toString();
  if (this.visibility === 'team') {
    return this.createdBy.toString() === user._id.toString() || 
           (this.teamId && user.teams && user.teams.includes(this.teamId));
  }
  return false;
};

trainingTemplateSchema.methods.canBeEditedBy = function(user) {
  return this.createdBy.toString() === user._id.toString();
};

module.exports = mongoose.model('TrainingTemplate', trainingTemplateSchema);