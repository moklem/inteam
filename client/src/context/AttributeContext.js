import React, { createContext, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';

import axios from '../utils/axios';

import { AuthContext } from './AuthContext';

export const AttributeContext = createContext();

export const AttributeProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);









  // Calculate overall rating for a player (universal) - MEMOIZED
  const calculateOverallRating = useCallback(async (playerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/attributes/calculate-overall`, {
        playerId
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

  // Get core volleyball attributes - MEMOIZED
  const getCoreAttributes = useCallback(() => {
    return [
      { name: 'Athletik', weight: 0.15, description: 'Körperliche Fitness und Beweglichkeit' },
      { name: 'Aufschlag', weight: 0.20, description: 'Präzision und Kraft beim Aufschlag' },
      { name: 'Abwehr', weight: 0.20, description: 'Defensive Fähigkeiten und Reaktion' },
      { name: 'Angriff', weight: 0.20, description: 'Offensive Schlagkraft und Technik' },
      { name: 'Mental', weight: 0.15, description: 'Mentale Stärke und Spielintelligenz' },
      { name: 'Positionsspezifisch', weight: 0.10, description: 'Spezielle Positionsfähigkeiten' }
    ];
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