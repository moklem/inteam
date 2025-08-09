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
    max: 99
  },
  textValue: {
    type: String
  },
  notes: {
    type: String
  },
  // Sub-attributes for detailed ratings
  subAttributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false  // Made optional for universal player ratings
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 99
  },
  // German League Level System fields
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 7 // 0=Kreisliga, 7=Bundesliga
  },
  levelRating: {
    type: Number,
    default: 1,
    min: 1,
    max: 99
  },
  overallLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 7
  },
  overallLevelRating: {
    type: Number,
    default: 1,
    min: 1,
    max: 99
  },
  // Migration tracking
  originalNumericValue: {
    type: Number,
    min: 1,
    max: 99
  },
  progressionHistory: [{
    value: Number,
    change: Number,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Pre-save middleware to track history and handle level calculations
PlayerAttributeSchema.pre('save', function(next) {
  // If this is not a new document and something has changed
  if (!this.isNew && (this.isModified('numericValue') || this.isModified('textValue') || this.isModified('notes') || this.isModified('subAttributes'))) {
    // If we have sub-attributes, calculate the main attribute value
    if (this.subAttributes && Object.keys(this.subAttributes).length > 0) {
      const calculatedValue = this.constructor.calculateMainAttributeFromSubs(this.subAttributes);
      if (calculatedValue !== null) {
        // Store original value for migration tracking
        if (!this.originalNumericValue && this.numericValue) {
          this.originalNumericValue = this.numericValue;
        }
        
        const oldLevel = this.level || 0;
        const oldRating = this.numericValue || 1;
        
        // Check for level-up (when reaching 90+ in current level)
        if (calculatedValue >= 90 && this.level < 7) {
          // Level up! Only this attribute advances and resets
          this.level = Math.min(7, (this.level || 0) + 1);
          this.levelRating = 1;
          this.numericValue = 1;  // Reset to 1 in new level
          
          // Add level-up event to progression history
          if (!this.progressionHistory) this.progressionHistory = [];
          this.progressionHistory.push({
            value: 1,
            change: 1 - oldRating,
            notes: `Level-Aufstieg: ${this.constructor.getLeagueLevels()[oldLevel]} → ${this.constructor.getLeagueLevels()[this.level]} (Wertung zurückgesetzt auf 1)`,
            updatedBy: this.updatedBy,
            updatedAt: new Date()
          });
        } else {
          // Normal update within current level
          this.numericValue = calculatedValue;
          this.levelRating = calculatedValue;  // levelRating is same as numericValue (1-99)
        }
      }
    } else if (this.isModified('numericValue') && this.numericValue) {
      // Check for level-up based on direct numericValue change
      const oldLevel = this.level || 0;
      const oldRating = this._original?.numericValue || this.numericValue;
      
      if (this.numericValue >= 90 && this.level < 7) {
        // Level up! Only this attribute advances and resets
        this.level = Math.min(7, (this.level || 0) + 1);
        this.levelRating = 1;
        this.numericValue = 1;  // Reset to 1 in new level
        
        // Add level-up event to progression history
        if (!this.progressionHistory) this.progressionHistory = [];
        this.progressionHistory.push({
          value: 1,
          change: 1 - oldRating,
          notes: `Level-Aufstieg: ${this.constructor.getLeagueLevels()[oldLevel]} → ${this.constructor.getLeagueLevels()[this.level]} (Wertung zurückgesetzt auf 1)`,
          updatedBy: this.updatedBy,
          updatedAt: new Date()
        });
      } else {
        // Normal update within current level
        this.levelRating = this.numericValue;  // levelRating is same as numericValue (1-99)
      }
    }
    
    this.history.push({
      value: {
        main: this.numericValue || this.textValue,
        subs: this.subAttributes || {},
        level: this.level,
        levelRating: this.levelRating
      },
      notes: this.notes,
      updatedBy: this.updatedBy,
      updatedAt: new Date()
    });
  }
  
  // Initialize level data for new documents
  if (this.isNew) {
    if (!this.level && this.level !== 0) {
      this.level = 0;  // Start at Kreisliga
    }
    if (!this.levelRating || this.levelRating === 0) {
      this.levelRating = this.numericValue || 1;
    }
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

// Static method to calculate main attribute value from sub-attributes
PlayerAttributeSchema.statics.calculateMainAttributeFromSubs = function(subAttributes) {
  if (!subAttributes || typeof subAttributes !== 'object') return null;
  
  const subValues = Object.values(subAttributes);
  const validValues = subValues.filter(val => typeof val === 'number' && val >= 1 && val <= 99);
  
  if (validValues.length === 0) return null;
  
  // Calculate average of all sub-attributes
  const average = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  return Math.round(average);
};

// Static method to get German league levels
PlayerAttributeSchema.statics.getLeagueLevels = function() {
  return [
    'Kreisliga',      // Level 0
    'Bezirksklasse',  // Level 1
    'Bezirksliga',    // Level 2
    'Landesliga',     // Level 3
    'Bayernliga',     // Level 4
    'Regionalliga',   // Level 5
    'Dritte Liga',    // Level 6
    'Bundesliga'      // Level 7
  ];
};

// Static method to convert old 1-99 rating to level system (for migration only)
PlayerAttributeSchema.statics.convertRatingToLevel = function(numericValue) {
  if (!numericValue || numericValue < 1) return { level: 0, levelRating: 1 };
  
  // For new system: levelRating is always the same as numericValue (1-99)
  // Level is determined by player's league progression
  // This method is kept for backward compatibility during migration
  
  // Simple migration mapping for existing data:
  // Estimate level based on old rating ranges
  let level = 0;
  if (numericValue > 90) level = 5;  // High ratings = higher leagues
  else if (numericValue > 80) level = 4;
  else if (numericValue > 70) level = 3;
  else if (numericValue > 60) level = 2;
  else if (numericValue > 50) level = 1;
  else level = 0;
  
  // In new system, rating within level is the actual rating (1-99)
  return { level, levelRating: numericValue };
};

// Static method to calculate absolute skill from level and rating
PlayerAttributeSchema.statics.getAbsoluteSkill = function(level, levelRating) {
  // Each level represents 100 skill points
  // levelRating is 1-99 within the level
  return (level * 100) + (levelRating || 1);
};

// Static method to convert absolute skill back to level and rating
PlayerAttributeSchema.statics.getOverallLevelAndRating = function(absoluteSkill) {
  const level = Math.min(7, Math.floor(absoluteSkill / 100));
  const rating = absoluteSkill % 100;
  return { level, rating };
};

// Static method to handle level-up for a single attribute (Option A - individual levels)
PlayerAttributeSchema.statics.handleAttributeLevelUp = async function(attributeId, fromLevel, toLevel, updatedBy) {
  const attribute = await this.findById(attributeId);
  if (!attribute) return false;
  
  const leagues = this.getLeagueLevels();
  const levelUpNote = `Level-Aufstieg: ${leagues[fromLevel]} → ${leagues[toLevel]} (Wertung zurückgesetzt auf 1)`;
  
  // Update only this specific attribute
  attribute.level = toLevel;
  attribute.levelRating = 1;
  attribute.numericValue = 1;
  
  // Add to progression history
  if (!attribute.progressionHistory) attribute.progressionHistory = [];
  attribute.progressionHistory.push({
    value: 1,
    change: 1 - 99, // Was at 90+ before reset
    notes: levelUpNote,
    updatedBy: updatedBy,
    updatedAt: new Date()
  });
  
  // Save without triggering another level-up check
  await attribute.save({ validateBeforeSave: false });
  
  return true;
};

// Static method to get sub-attribute definitions for each main attribute
PlayerAttributeSchema.statics.getSubAttributeDefinitions = function() {
  return {
    'Athletik': [
      'Sprunghöhe',
      'Geschwindigkeit', 
      'Beweglichkeit',
      'Ausdauer',
      'Reaktionszeit'
    ],
    'Aufschlag': [
      'Topspin-Aufschlag',
      'Flatteraufschlag',
      'Kraft',
      'Genauigkeit',
      'Konstanz'
    ],
    'Abwehr': [
      'Baggern',
      'Plattformkontrolle',
      'Spielübersicht',
      'Feldabsicherung',
      'Reflexe'
    ],
    'Angriff': [
      'Schlagkraft',
      'Schlaggenauigkeit',
      'Schlagauswahl',
      'Timing',
      'Abschlaghöhe'
    ],
    'Mental': [
      'Gelassenheit',
      'Führungsqualität',
      'Spielverständnis',
      'Krisensituation',
      'Kommunikation'
    ],
    'Annahme': [
      'Obere Annahme',
      'Untere Annahme',
      'Flatterannahme',
      'Topspinannahme',
      'Konstanz',
      'Genauigkeit'
    ],
    'Grund-Technik': [
      'Oberes Zuspiel',
      'Baggern',
      'Bewegung zum Ball',
      'Angriffsschritte',
      'Hechtbagger'
    ],
    'Positionsspezifisch': {
      'Zuspieler': [
        'Zuspielgenauigkeit',
        'Zuspiel-Tempo',
        'Überkopf',
        '2.Ball',
        'Entscheidungsfindung',
        'Out-of-System'
      ],
      'Außen': [
        'Linienschlag',
        'Diagonalschlag',
        'Wixxen',
        'Pipeangriff',
        'Transition',
        'Annahme',
        'Blocken'
      ],
      'Dia': [
        'Linienschlag',
        'Diagonalschlag',
        'Werkzeugschlag',
        'Hinterfeld-Angriff',
        'Blockpräsenz'
      ],
      // Legacy support for old position names
      'Diagonalspieler': [
        'Linienschlag',
        'Diagonalschlag',
        'Werkzeugschlag',
        'Hinterfeld-Angriff',
        'Blockpräsenz'
      ],
      'Mitte': [
        'Block-Timing',
        'Blockreichweite',
        'Schnellangriff',
        'Seitliche Bewegung',
        'Schließender Block'
      ],
      // Legacy support for old position names
      'Mittelspieler': [
        'Block-Timing',
        'Blockreichweite',
        'Schnellangriff',
        'Seitliche Bewegung',
        'Schließender Block'
      ],
      'Libero': [
        'Annahme',
        'Dankeball',
        'Feldabdeckung',
        'Plattformstabilität',
        'Erster Kontakt'
      ]
    }
  };
};

// Static method to calculate overall rating with level system
PlayerAttributeSchema.statics.calculateOverallLevelRating = async function(playerId, playerPosition = null) {
  const coreAttributes = [
    'Athletik',
    'Aufschlag', 
    'Abwehr',
    'Angriff',
    'Mental',
    'Annahme',
    'Grund-Technik',
    'Positionsspezifisch'
  ];

  // Position-specific weights (same as before)
  const positionWeights = {
    'Zuspieler': {
      'Positionsspezifisch': 0.25,
      'Mental': 0.18,
      'Grund-Technik': 0.18,
      'Athletik': 0.14,
      'Aufschlag': 0.12,
      'Abwehr': 0.12,
      'Angriff': 0.05,
      'Annahme': 0.01
    },
    'Libero': {
      'Positionsspezifisch': 0.20,
      'Annahme': 0.20,
      'Abwehr': 0.18,
      'Mental': 0.15,
      'Grund-Technik': 0.15,
      'Athletik': 0.12,
      'Angriff': 0.00,
      'Aufschlag': 0.00
    },
    'Mitte': {
      'Positionsspezifisch': 0.24,
      'Angriff': 0.18,
      'Athletik': 0.16,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.10,
      'Mental': 0.10,
      'Abwehr': 0.09,
      'Annahme': 0.01
    },
    'Mittelspieler': { // Legacy support
      'Positionsspezifisch': 0.24,
      'Angriff': 0.18,
      'Athletik': 0.16,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.10,
      'Mental': 0.10,
      'Abwehr': 0.09,
      'Annahme': 0.01
    },
    'Dia': {
      'Positionsspezifisch': 0.22,
      'Angriff': 0.20,
      'Abwehr': 0.12,
      'Athletik': 0.12,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.12,
      'Mental': 0.09,
      'Annahme': 0.01
    },
    'Diagonalspieler': { // Legacy support
      'Positionsspezifisch': 0.22,
      'Angriff': 0.20,
      'Abwehr': 0.12,
      'Athletik': 0.12,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.12,
      'Mental': 0.09,
      'Annahme': 0.01
    },
    'Außen': {
      'Annahme': 0.18,
      'Mental': 0.16,
      'Angriff': 0.15,
      'Positionsspezifisch': 0.11,
      'Athletik': 0.10,
      'Grund-Technik': 0.10,
      'Aufschlag': 0.10,
      'Abwehr': 0.10
    },
    'Aussenspieler': { // Legacy support
      'Annahme': 0.18,
      'Mental': 0.16,
      'Angriff': 0.15,
      'Positionsspezifisch': 0.11,
      'Athletik': 0.10,
      'Grund-Technik': 0.10,
      'Aufschlag': 0.10,
      'Abwehr': 0.10
    }
  };

  // Default weights if position not specified
  const defaultWeights = {
    'Athletik': 0.12,
    'Aufschlag': 0.15,
    'Abwehr': 0.15,
    'Angriff': 0.15,
    'Mental': 0.12,
    'Annahme': 0.10,
    'Grund-Technik': 0.11,
    'Positionsspezifisch': 0.10
  };

  const weights = positionWeights[playerPosition] || defaultWeights;

  // Find universal player ratings
  const attributes = await this.find({
    player: playerId,
    attributeName: { $in: coreAttributes },
    $or: [
      { team: null },
      { team: { $exists: false } }
    ]
  });

  if (attributes.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  attributes.forEach(attr => {
    if (weights[attr.attributeName]) {
      // Convert to absolute skill using level system
      const absoluteSkill = this.getAbsoluteSkill(attr.level || 0, attr.levelRating || 0);
      weightedSum += absoluteSkill * weights[attr.attributeName];
      totalWeight += weights[attr.attributeName];
    }
  });

  if (totalWeight === 0) return null;

  // Calculate overall absolute skill
  const overallAbsoluteSkill = Math.round(weightedSum / totalWeight);
  
  // Convert back to level and rating
  const { level, rating } = this.getOverallLevelAndRating(overallAbsoluteSkill);
  
  return {
    overallLevel: level,
    overallLevelRating: rating,
    overallAbsoluteSkill,
    leagueName: this.getLeagueLevels()[level]
  };
};

// Static method to calculate overall rating with position-specific weights (legacy support)
PlayerAttributeSchema.statics.calculateOverallRating = async function(playerId, playerPosition = null) {
  const coreAttributes = [
    'Athletik',
    'Aufschlag', 
    'Abwehr',
    'Angriff',
    'Mental',
    'Annahme',
    'Grund-Technik',
    'Positionsspezifisch'
  ];

  // Position-specific weights
  const positionWeights = {
    'Zuspieler': {
      'Positionsspezifisch': 0.25,
      'Mental': 0.18,
      'Grund-Technik': 0.18,
      'Athletik': 0.14,
      'Aufschlag': 0.12,
      'Abwehr': 0.12,
      'Angriff': 0.05,
      'Annahme': 0.01
    },
    'Libero': {
      'Positionsspezifisch': 0.20,
      'Annahme': 0.20,
      'Abwehr': 0.18,
      'Mental': 0.15,
      'Grund-Technik': 0.15,
      'Athletik': 0.12,
      'Angriff': 0.00,
      'Aufschlag': 0.00
    },
    'Mitte': {
      'Positionsspezifisch': 0.24,
      'Angriff': 0.18,
      'Athletik': 0.16,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.10,
      'Mental': 0.10,
      'Abwehr': 0.09,
      'Annahme': 0.01
    },
    'Mittelspieler': { // Legacy support
      'Positionsspezifisch': 0.24,
      'Angriff': 0.18,
      'Athletik': 0.16,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.10,
      'Mental': 0.10,
      'Abwehr': 0.09,
      'Annahme': 0.01
    },
    'Dia': {
      'Positionsspezifisch': 0.22,
      'Angriff': 0.20,
      'Abwehr': 0.12,
      'Athletik': 0.12,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.12,
      'Mental': 0.09,
      'Annahme': 0.01
    },
    'Diagonalspieler': { // Legacy support
      'Positionsspezifisch': 0.22,
      'Angriff': 0.20,
      'Abwehr': 0.12,
      'Athletik': 0.12,
      'Aufschlag': 0.12,
      'Grund-Technik': 0.12,
      'Mental': 0.09,
      'Annahme': 0.01
    },
    'Außen': {
      'Annahme': 0.18,
      'Mental': 0.16,
      'Angriff': 0.15,
      'Positionsspezifisch': 0.11,
      'Athletik': 0.10,
      'Grund-Technik': 0.10,
      'Aufschlag': 0.10,
      'Abwehr': 0.10
    },
    'Aussenspieler': { // Legacy support
      'Annahme': 0.18,
      'Mental': 0.16,
      'Angriff': 0.15,
      'Positionsspezifisch': 0.11,
      'Athletik': 0.10,
      'Grund-Technik': 0.10,
      'Aufschlag': 0.10,
      'Abwehr': 0.10
    }
  };

  // Default weights if position not specified or not found
  const defaultWeights = {
    'Athletik': 0.12,
    'Aufschlag': 0.15,
    'Abwehr': 0.15,
    'Angriff': 0.15,
    'Mental': 0.12,
    'Annahme': 0.10,
    'Grund-Technik': 0.11,
    'Positionsspezifisch': 0.10
  };

  // Use position-specific weights or default
  const weights = positionWeights[playerPosition] || defaultWeights;

  // Find universal player ratings (team field is null or undefined)
  const attributes = await this.find({
    player: playerId,
    attributeName: { $in: coreAttributes },
    $or: [
      { team: null },
      { team: { $exists: false } }
    ]
  });

  if (attributes.length === 0) return null;

  // New formula: Σ[(rating_i + 100 * level_i) * weight_i] / 8
  let weightedSum = 0;
  
  // Process all 8 core attributes (even if some are missing)
  coreAttributes.forEach(attrName => {
    const attr = attributes.find(a => a.attributeName === attrName);
    const weight = weights[attrName];
    
    if (attr && attr.numericValue) {
      // Attribute exists: use actual values
      const level = attr.level || 0;
      const rating = attr.numericValue;
      const absoluteSkill = rating + (100 * level);
      weightedSum += absoluteSkill * weight;
    } else {
      // Attribute missing: use default values (level 0, rating 1)
      const absoluteSkill = 1 + (100 * 0);
      weightedSum += absoluteSkill * weight;
    }
  });

  // Always divide by 8 (total number of attributes)
  return Math.round(weightedSum / 8);
};

module.exports = mongoose.model('PlayerAttribute', PlayerAttributeSchema);