const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeId: {
    type: String,
    required: true
  },
  badgeName: {
    type: String,
    required: true
  },
  badgeDescription: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Fähigkeiten', 'Position', 'Team', 'Fortschritt', 'Spezial'],
    required: true
  },
  rarity: {
    type: String,
    enum: ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'],
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  triggerType: {
    type: String,
    enum: ['rating_threshold', 'improvement', 'consistency', 'special_event'],
    required: true
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
achievementSchema.index({ playerId: 1, badgeId: 1 }, { unique: true });
achievementSchema.index({ playerId: 1, unlockedAt: -1 });

// Static method to define all available badges
achievementSchema.statics.getBadgeDefinitions = function() {
  return [
    // Fähigkeiten - Bronze
    {
      badgeId: 'first_steps',
      badgeName: 'Erste Schritte',
      badgeDescription: 'Erste Bewertung erhalten',
      category: 'Fähigkeiten',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'any', threshold: 1 }
    },
    {
      badgeId: 'solid_foundation',
      badgeName: 'Solide Basis',
      badgeDescription: 'Alle Attribute über 30 Punkte',
      category: 'Fähigkeiten',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'all', threshold: 30 }
    },
    {
      badgeId: 'serve_specialist',
      badgeName: 'Aufschlag-Spezialist',
      badgeDescription: 'Aufschlag-Bewertung über 70',
      category: 'Fähigkeiten',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Aufschlag', threshold: 70 }
    },
    {
      badgeId: 'defense_expert',
      badgeName: 'Abwehr-Experte',
      badgeDescription: 'Abwehr-Bewertung über 70',
      category: 'Fähigkeiten',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Abwehr', threshold: 70 }
    },
    {
      badgeId: 'attack_power',
      badgeName: 'Angriffs-Power',
      badgeDescription: 'Angriff-Bewertung über 70',
      category: 'Fähigkeiten',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Angriff', threshold: 70 }
    },
    
    // Fähigkeiten - Silber
    {
      badgeId: 'well_rounded',
      badgeName: 'Allrounder',
      badgeDescription: 'Alle Attribute über 50 Punkte',
      category: 'Fähigkeiten',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'all', threshold: 50 }
    },
    {
      badgeId: 'serve_master',
      badgeName: 'Aufschlag-Meister',
      badgeDescription: 'Aufschlag-Bewertung über 85',
      category: 'Fähigkeiten',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Aufschlag', threshold: 85 }
    },
    {
      badgeId: 'defense_wall',
      badgeName: 'Abwehr-Mauer',
      badgeDescription: 'Abwehr-Bewertung über 85',
      category: 'Fähigkeiten',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Abwehr', threshold: 85 }
    },
    {
      badgeId: 'attack_machine',
      badgeName: 'Angriffs-Maschine',
      badgeDescription: 'Angriff-Bewertung über 85',
      category: 'Fähigkeiten',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Angriff', threshold: 85 }
    },
    {
      badgeId: 'mental_strength',
      badgeName: 'Mentale Stärke',
      badgeDescription: 'Mental-Bewertung über 85',
      category: 'Fähigkeiten',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Mental', threshold: 85 }
    },
    
    // Fähigkeiten - Gold
    {
      badgeId: 'excellence',
      badgeName: 'Exzellenz',
      badgeDescription: 'Alle Attribute über 70 Punkte',
      category: 'Fähigkeiten',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'all', threshold: 70 }
    },
    {
      badgeId: 'serve_legend',
      badgeName: 'Aufschlag-Legende',
      badgeDescription: 'Aufschlag-Bewertung über 95',
      category: 'Fähigkeiten',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Aufschlag', threshold: 95 }
    },
    {
      badgeId: 'defense_fortress',
      badgeName: 'Abwehr-Festung',
      badgeDescription: 'Abwehr-Bewertung über 95',
      category: 'Fähigkeiten',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Abwehr', threshold: 95 }
    },
    {
      badgeId: 'attack_destroyer',
      badgeName: 'Angriffs-Zerstörer',
      badgeDescription: 'Angriff-Bewertung über 95',
      category: 'Fähigkeiten',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Angriff', threshold: 95 }
    },
    
    // Position - Bronze bis Gold
    {
      badgeId: 'setter_starter',
      badgeName: 'Zuspieler Anfänger',
      badgeDescription: 'Positionsspezifisch (Zuspieler) über 60',
      category: 'Position',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 60, position: 'Zuspieler' }
    },
    {
      badgeId: 'setter_expert',
      badgeName: 'Zuspieler Experte',
      badgeDescription: 'Positionsspezifisch (Zuspieler) über 80',
      category: 'Position',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 80, position: 'Zuspieler' }
    },
    {
      badgeId: 'setter_master',
      badgeName: 'Zuspieler Meister',
      badgeDescription: 'Positionsspezifisch (Zuspieler) über 90',
      category: 'Position',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 90, position: 'Zuspieler' }
    },
    {
      badgeId: 'libero_starter',
      badgeName: 'Libero Anfänger',
      badgeDescription: 'Positionsspezifisch (Libero) über 60',
      category: 'Position',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 60, position: 'Libero' }
    },
    {
      badgeId: 'libero_expert',
      badgeName: 'Libero Experte',
      badgeDescription: 'Positionsspezifisch (Libero) über 80',
      category: 'Position',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 80, position: 'Libero' }
    },
    {
      badgeId: 'libero_master',
      badgeName: 'Libero Meister',
      badgeDescription: 'Positionsspezifisch (Libero) über 90',
      category: 'Position',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 90, position: 'Libero' }
    },
    {
      badgeId: 'outside_starter',
      badgeName: 'Außen Anfänger',
      badgeDescription: 'Positionsspezifisch (Außen) über 60',
      category: 'Position',
      rarity: 'Bronze',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 60, position: 'Außen' }
    },
    {
      badgeId: 'outside_expert',
      badgeName: 'Außen Experte',
      badgeDescription: 'Positionsspezifisch (Außen) über 80',
      category: 'Position',
      rarity: 'Silber',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 80, position: 'Außen' }
    },
    {
      badgeId: 'outside_master',
      badgeName: 'Außen Meister',
      badgeDescription: 'Positionsspezifisch (Außen) über 90',
      category: 'Position',
      rarity: 'Gold',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'Positionsspezifisch', threshold: 90, position: 'Außen' }
    },
    
    // Fortschritt
    {
      badgeId: 'rising_star',
      badgeName: 'Aufsteigender Stern',
      badgeDescription: 'Gesamtwertung um 10 Punkte verbessert',
      category: 'Fortschritt',
      rarity: 'Bronze',
      triggerType: 'improvement',
      triggerValue: { attribute: 'overallRating', improvement: 10 }
    },
    {
      badgeId: 'breakthrough',
      badgeName: 'Durchbruch',
      badgeDescription: 'Gesamtwertung um 20 Punkte verbessert',
      category: 'Fortschritt',
      rarity: 'Silber',
      triggerType: 'improvement',
      triggerValue: { attribute: 'overallRating', improvement: 20 }
    },
    {
      badgeId: 'transformation',
      badgeName: 'Transformation',
      badgeDescription: 'Gesamtwertung um 30 Punkte verbessert',
      category: 'Fortschritt',
      rarity: 'Gold',
      triggerType: 'improvement',
      triggerValue: { attribute: 'overallRating', improvement: 30 }
    },
    
    // Platin und Diamant
    {
      badgeId: 'perfection',
      badgeName: 'Perfektion',
      badgeDescription: 'Alle Attribute über 90 Punkte',
      category: 'Fähigkeiten',
      rarity: 'Platin',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'all', threshold: 90 }
    },
    {
      badgeId: 'legend',
      badgeName: 'Legende',
      badgeDescription: 'Gesamtwertung über 95 Punkte',
      category: 'Spezial',
      rarity: 'Diamant',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'overallRating', threshold: 95 }
    },
    {
      badgeId: 'volleyball_god',
      badgeName: 'Volleyball-Gott',
      badgeDescription: 'Alle Attribute auf 99 Punkte',
      category: 'Spezial',
      rarity: 'Diamant',
      triggerType: 'rating_threshold',
      triggerValue: { attribute: 'all', threshold: 99 }
    }
  ];
};

// Method to check if player qualifies for a badge
achievementSchema.statics.checkBadgeEligibility = async function(playerId, badgeDefinition, playerAttributes) {
  const existingAchievement = await this.findOne({ playerId, badgeId: badgeDefinition.badgeId });
  if (existingAchievement) return false;

  const { triggerType, triggerValue } = badgeDefinition;
  
  switch (triggerType) {
    case 'rating_threshold':
      if (triggerValue.attribute === 'all') {
        return Object.values(playerAttributes).every(rating => rating >= triggerValue.threshold);
      } else if (triggerValue.attribute === 'any') {
        return Object.values(playerAttributes).some(rating => rating >= triggerValue.threshold);
      } else if (triggerValue.attribute === 'overallRating') {
        return playerAttributes.overallRating >= triggerValue.threshold;
      } else {
        return playerAttributes[triggerValue.attribute] >= triggerValue.threshold;
      }
    
    case 'improvement':
      // This would require historical data comparison
      return false; // Implement with progression history
      
    default:
      return false;
  }
};

module.exports = mongoose.model('Achievement', achievementSchema);