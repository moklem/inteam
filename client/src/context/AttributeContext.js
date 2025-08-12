import React, { createContext, useState, useContext, useCallback } from 'react';

import PropTypes from 'prop-types';

import { AuthContext } from './AuthContext';
import axios from '../utils/axios';


export const AttributeContext = createContext();

export const AttributeProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);









  // Get position-specific attribute weights - MEMOIZED
  const getPositionSpecificWeights = useCallback((position) => {
    const positionWeights = {
      'Zuspieler': {
        'Positionsspezifisch': 25,
        'Mental': 18,
        'Grund-Technik': 18,
        'Athletik': 14,
        'Aufschlag': 12,
        'Abwehr': 12,
        'Angriff': 5,
        'Annahme': 1
      },
      'Libero': {
        'Positionsspezifisch': 20,
        'Annahme': 20,
        'Abwehr': 18,
        'Mental': 15,
        'Grund-Technik': 15,
        'Athletik': 12,
        'Angriff': 0,
        'Aufschlag': 0
      },
      'Mitte': {
        'Positionsspezifisch': 24,
        'Angriff': 18,
        'Athletik': 16,
        'Aufschlag': 12,
        'Grund-Technik': 10,
        'Mental': 10,
        'Abwehr': 9,
        'Annahme': 1
      },
      'Mittelspieler': { // Legacy support
        'Positionsspezifisch': 24,
        'Angriff': 18,
        'Athletik': 16,
        'Aufschlag': 12,
        'Grund-Technik': 10,
        'Mental': 10,
        'Abwehr': 9,
        'Annahme': 1
      },
      'Dia': {
        'Positionsspezifisch': 22,
        'Angriff': 20,
        'Abwehr': 12,
        'Athletik': 12,
        'Aufschlag': 12,
        'Grund-Technik': 12,
        'Mental': 9,
        'Annahme': 1
      },
      'Diagonalspieler': { // Legacy support
        'Positionsspezifisch': 22,
        'Angriff': 20,
        'Abwehr': 12,
        'Athletik': 12,
        'Aufschlag': 12,
        'Grund-Technik': 12,
        'Mental': 9,
        'Annahme': 1
      },
      'Außen': {
        'Annahme': 18,
        'Mental': 16,
        'Angriff': 15,
        'Positionsspezifisch': 11,
        'Athletik': 10,
        'Grund-Technik': 10,
        'Aufschlag': 10,
        'Abwehr': 10
      },
      'Aussenspieler': { // Legacy support
        'Annahme': 18,
        'Mental': 16,
        'Angriff': 15,
        'Positionsspezifisch': 11,
        'Athletik': 10,
        'Grund-Technik': 10,
        'Aufschlag': 10,
        'Abwehr': 10
      }
    };

    // Default weights if position not found
    const defaultWeights = {
      'Athletik': 12,
      'Aufschlag': 15,
      'Abwehr': 15,
      'Angriff': 15,
      'Mental': 12,
      'Annahme': 10,
      'Grund-Technik': 11,
      'Positionsspezifisch': 10
    };

    return positionWeights[position] || defaultWeights;
  }, []);

  // Calculate overall rating for a player (universal) with position-specific weights - MEMOIZED
  const calculateOverallRating = useCallback(async (playerId, playerPosition = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/attributes/calculate-overall`, {
        playerId,
        playerPosition
      });
      
      return res.data;
    } catch (err) {
      // If the new API doesn't exist yet (404), fail silently and return null
      if (err.response?.status === 404) {
        console.warn('New rating API not deployed yet, skipping overall rating calculation');
        return null;
      }
      
      setError(err.response?.data?.message || 'Failed to calculate overall rating');
      console.error('Error calculating overall rating:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch universal player ratings - MEMOIZED
  const fetchUniversalPlayerRatings = useCallback(async (playerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`/attributes/universal/${playerId}`);
      
      return res.data || [];
    } catch (err) {
      // If the new API doesn't exist yet (404), return empty array
      if (err.response?.status === 404) {
        console.warn('New universal ratings API not deployed yet, using empty ratings');
        return [];
      }
      
      setError(err.response?.data?.message || 'Failed to fetch player ratings');
      console.error('Error fetching player ratings:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Save universal player ratings - MEMOIZED
  const saveUniversalPlayerRatings = useCallback(async (playerId, ratings) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/attributes/universal`, {
        playerId,
        ratings
      });
      
      return res.data || [];
    } catch (err) {
      // If the new API doesn't exist yet (404), show user-friendly message
      if (err.response?.status === 404) {
        const message = 'Das neue Bewertungssystem ist noch nicht verfügbar.';
        setError(message);
        alert(message);
        throw new Error(message);
      }
      
      setError(err.response?.data?.message || 'Failed to save player ratings');
      console.error('Error saving player ratings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate rating value (1-99 scale) - MEMOIZED
  const validateRating = useCallback((value) => {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, message: 'Bewertung muss eine Zahl sein' };
    }
    
    if (numValue < 1 || numValue > 99) {
      return { isValid: false, message: 'Bewertung muss zwischen 1 und 99 liegen' };
    }
    
    if (!Number.isInteger(numValue)) {
      return { isValid: false, message: 'Bewertung muss eine ganze Zahl sein' };
    }
    
    return { isValid: true, message: '' };
  }, []);

  // Get rating category and color based on value - MEMOIZED
  const getRatingCategory = useCallback((value) => {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return { category: 'Unbekannt', color: 'grey', label: 'N/A' };
    }
    
    if (numValue >= 90) {
      return { category: 'Elite', color: 'green', label: 'Elite (90-99)' };
    } else if (numValue >= 75) {
      return { category: 'Sehr gut', color: 'lightGreen', label: 'Sehr gut (75-89)' };
    } else if (numValue >= 60) {
      return { category: 'Gut', color: 'yellow', label: 'Gut (60-74)' };
    } else if (numValue >= 40) {
      return { category: 'Durchschnitt', color: 'orange', label: 'Durchschnitt (40-59)' };
    } else {
      return { category: 'Entwicklungsbedarf', color: 'red', label: 'Entwicklungsbedarf (1-39)' };
    }
  }, []);

  // Get core volleyball attributes with sub-attributes - MEMOIZED
  const getCoreAttributes = useCallback(() => {
    return [
      { 
        name: 'Athletik', 
        description: 'Körperliche Fitness und Beweglichkeit',
        subAttributes: [
          'Sprunghöhe',
          'Geschwindigkeit', 
          'Beweglichkeit',
          'Ausdauer',
          'Reaktionszeit'
        ]
      },
      { 
        name: 'Aufschlag', 
        description: 'Präzision und Kraft beim Aufschlag',
        subAttributes: [
          'Topspin-Aufschlag',
          'Flatteraufschlag',
          'Kraft',
          'Genauigkeit',
          'Konstanz'
        ]
      },
      { 
        name: 'Abwehr', 
        description: 'Defensive Fähigkeiten und Reaktion',
        subAttributes: [
          'Baggern',
          'Plattformkontrolle',
          'Spielübersicht',
          'Feldabsicherung',
          'Reflexe'
        ]
      },
      { 
        name: 'Angriff', 
        description: 'Offensive Schlagkraft und Technik',
        subAttributes: [
          'Schlagkraft',
          'Schlaggenauigkeit',
          'Schlagauswahl',
          'Timing',
          'Abschlaghöhe'
        ]
      },
      { 
        name: 'Mental', 
        description: 'Mentale Stärke und Spielintelligenz',
        subAttributes: [
          'Gelassenheit',
          'Führungsqualität',
          'Spielverständnis',
          'Krisensituation',
          'Kommunikation'
        ]
      },
      { 
        name: 'Annahme', 
        description: 'Ballannahme und Aufschlagverhalten',
        subAttributes: [
          'Obere Annahme',
          'Untere Annahme',
          'Flatterannahme',
          'Topspinannahme',
          'Konstanz',
          'Genauigkeit'
        ]
      },
      { 
        name: 'Grund-Technik', 
        description: 'Grundlegende Volleyball-Techniken',
        subAttributes: [
          'Oberes Zuspiel',
          'Baggern',
          'Bewegung zum Ball',
          'Angriffsschritte',
          'Hechtbagger'
        ]
      },
      { 
        name: 'Positionsspezifisch', 
        description: 'Spezielle Positionsfähigkeiten',
        subAttributes: []  // Will be set dynamically based on player position
      }
    ];
  }, []);

  // Get position-specific sub-attributes - MEMOIZED
  const getPositionSpecificSubAttributes = useCallback((position) => {
    const positionMap = {
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
      // Legacy support for old position name
      'Aussenspieler': [
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
      // Legacy support for old position name
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
      // Legacy support for old position name
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
    };

    return positionMap[position] || [];
  }, []);

  // Calculate main attribute value from sub-attributes - MEMOIZED
  const calculateMainAttributeFromSubs = useCallback((subAttributes) => {
    if (!subAttributes || typeof subAttributes !== 'object') return null;
    
    const subValues = Object.values(subAttributes);
    const validValues = subValues.filter(val => typeof val === 'number' && val >= 1 && val <= 99);
    
    if (validValues.length === 0) return null;
    
    // Calculate average of all sub-attributes
    const average = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    return Math.round(average);
  }, []);

  // Get all attributes with sub-attribute values populated for a player - MEMOIZED
  const getAttributesWithSubValues = useCallback((playerData, playerPosition) => {
    const coreAttributes = getCoreAttributes();
    
    return coreAttributes.map(attr => {
      // For position-specific attributes, get the right sub-attributes
      let subAttributes = attr.subAttributes;
      if (attr.name === 'Positionsspezifisch' && playerPosition) {
        subAttributes = getPositionSpecificSubAttributes(playerPosition);
      }

      // Find the current attribute data for this player
      const attributeData = playerData?.find(data => data.attributeName === attr.name);
      
      return {
        ...attr,
        subAttributes,
        currentValue: attributeData?.numericValue || null,
        subAttributeValues: attributeData?.subAttributes || {},
        notes: attributeData?.notes || ''
      };
    });
  }, [getCoreAttributes, getPositionSpecificSubAttributes]);

  // Save attribute with sub-attributes - MEMOIZED
  const saveAttributeWithSubs = useCallback(async (playerId, attributeName, subAttributeValues, notes = '') => {
    try {
      setLoading(true);
      setError(null);

      // Calculate main attribute value from sub-attributes
      const calculatedMainValue = calculateMainAttributeFromSubs(subAttributeValues);
      
      const payload = {
        playerId,
        ratings: [{
          attributeName,
          numericValue: calculatedMainValue,
          subAttributes: subAttributeValues,
          notes
        }]
      };
      
      const res = await axios.post(`/attributes/universal`, payload);
      
      return res.data || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save attribute with sub-attributes');
      console.error('Error saving attribute with sub-attributes:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateMainAttributeFromSubs]);


  // German League Level System functions
  const getLeagueLevels = useCallback(() => {
    return [
      { name: 'Kreisliga', color: '#9E9E9E' },        // Level 0 - Grey
      { name: 'Bezirksklasse', color: '#795548' },    // Level 1 - Brown
      { name: 'Bezirksliga', color: '#FF9800' },      // Level 2 - Orange
      { name: 'Landesliga', color: '#4CAF50' },       // Level 3 - Green
      { name: 'Bayernliga', color: '#2196F3' },       // Level 4 - Blue
      { name: 'Regionalliga', color: '#3F51B5' },     // Level 5 - Indigo
      { name: 'Dritte Liga', color: '#9C27B0' },      // Level 6 - Purple
      { name: 'Bundesliga', color: '#FFD700' }        // Level 7 - Gold
    ];
  }, []);

  const convertRatingToLevel = useCallback((numericValue) => {
    if (!numericValue || numericValue < 1) return { level: 0, levelRating: 1 };
    
    // In the new system, levelRating is the same as numericValue (1-99)
    // This method is kept for backward compatibility
    // Level is determined by player's league progression, not the rating itself
    return { 
      level: 0, // Default to Kreisliga, actual level is stored per player
      levelRating: numericValue 
    };
  }, []);

  const getAbsoluteSkill = useCallback((level, levelRating) => {
    // Each level represents 100 skill points
    // levelRating is 1-99 within the level
    return (level * 100) + (levelRating || 1);
  }, []);

  // Calculate overall rating based on individual attribute levels (Option A)
  // Formula: Σ[(rating_i + 100 * level_i) * weight_i] / 8
  const calculateOverallFromAttributes = useCallback((attributes, playerPosition = null) => {
    const coreAttributeNames = [
      'Athletik', 'Aufschlag', 'Abwehr', 'Angriff',
      'Mental', 'Annahme', 'Grund-Technik', 'Positionsspezifisch'
    ];
    
    const weights = getPositionSpecificWeights(playerPosition);
    let weightedSum = 0;
    
    // Process all 8 core attributes
    coreAttributeNames.forEach(attrName => {
      const attr = attributes.find(a => a.attributeName === attrName);
      const weight = weights[attrName];
      
      if (attr && attr.numericValue) {
        const level = attr.level || 0;
        const rating = attr.numericValue;
        const absoluteSkill = rating + (100 * level);
        weightedSum += absoluteSkill * weight;
      } else {
        // Missing attribute: use default (level 0, rating 1)
        const absoluteSkill = 1;
        weightedSum += absoluteSkill * weight;
      }
    });
    
    // Divide by 8 as per the formula
    return Math.round(weightedSum / 8);
  }, [getPositionSpecificWeights]);

  const getOverallLevelAndRating = useCallback((absoluteSkill) => {
    const level = Math.min(7, Math.floor(absoluteSkill / 100));
    const rating = absoluteSkill % 100;
    return { level, rating };
  }, []);

  const migratePlayerToLevelSystem = useCallback(async (playerId) => {
    try {
      setLoading(true);
      const response = await axios.post('/attributes/migrate-levels', { playerId });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLevelProgress = useCallback(async (playerId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/attributes/level-progress/${playerId}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateOverallLevelRating = useCallback(async (playerId, position) => {
    try {
      setLoading(true);
      const response = await axios.post('/attributes/calculate-overall-level', {
        playerId,
        playerPosition: position
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AttributeContext.Provider
      value={{
        loading,
        error,
        calculateOverallRating,
        fetchUniversalPlayerRatings,
        saveUniversalPlayerRatings,
        validateRating,
        getRatingCategory,
        getCoreAttributes,
        // Level system functions
        getLeagueLevels,
        convertRatingToLevel,
        getAbsoluteSkill,
        getOverallLevelAndRating,
        calculateOverallFromAttributes,
        migratePlayerToLevelSystem,
        fetchLevelProgress,
        calculateOverallLevelRating,
        getPositionSpecificSubAttributes,
        getPositionSpecificWeights,
        calculateMainAttributeFromSubs,
        getAttributesWithSubValues,
        saveAttributeWithSubs,
        setError
      }}
    >
      {children}
    </AttributeContext.Provider>
  );
};

AttributeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AttributeProvider;