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

// Pre-save middleware to track history
PlayerAttributeSchema.pre('save', function(next) {
  // If this is not a new document and something has changed
  if (!this.isNew && (this.isModified('numericValue') || this.isModified('textValue') || this.isModified('notes') || this.isModified('subAttributes'))) {
    // If we have sub-attributes, calculate the main attribute value
    if (this.subAttributes && Object.keys(this.subAttributes).length > 0) {
      const calculatedValue = this.constructor.calculateMainAttributeFromSubs(this.subAttributes);
      if (calculatedValue !== null) {
        this.numericValue = calculatedValue;
      }
    }
    
    this.history.push({
      value: {
        main: this.numericValue || this.textValue,
        subs: this.subAttributes || {}
      },
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

// Static method to calculate overall rating with position-specific weights
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

  let weightedSum = 0;
  let totalWeight = 0;

  attributes.forEach(attr => {
    if (attr.numericValue && weights[attr.attributeName]) {
      weightedSum += attr.numericValue * weights[attr.attributeName];
      totalWeight += weights[attr.attributeName];
    }
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
};

module.exports = mongoose.model('PlayerAttribute', PlayerAttributeSchema);