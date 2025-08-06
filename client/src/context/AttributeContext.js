import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';

import axios from 'axios';

import { AuthContext } from './AuthContext';
import { TeamContext } from './TeamContext';

export const AttributeContext = createContext();

export const AttributeProvider = ({ children }) => {
  const [attributes, setAttributes] = useState([]);
  const [playerAttributes, setPlayerAttributes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);
  const { currentTeam } = useContext(TeamContext);

  // Fetch all attributes for a team - MEMOIZED
  const fetchTeamAttributes = useCallback(async (teamId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`/attributes/team/${teamId}`);
      
      if (res.data) {
        setAttributes(res.data);
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch team attributes');
      console.error('Error fetching team attributes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all attributes for a player - MEMOIZED
  const fetchPlayerAttributes = useCallback(async (playerId, teamId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams();
      
      if (teamId) {
        queryParams.append('teamId', teamId);
      }
      
      const queryString = queryParams.toString();
      const url = `/attributes/player/${playerId}${queryString ? `?${queryString}` : ''}`;
      
      const res = await axios.get(url);
      
      if (res.data) {
        // Store player attributes in a map by player ID
        setPlayerAttributes(prev => ({
          ...prev,
          [playerId]: res.data
        }));
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch player attributes');
      console.error('Error fetching player attributes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a specific attribute by ID - MEMOIZED
  const fetchAttribute = useCallback(async (attributeId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`/attributes/${attributeId}`);
      
      if (res.data) {
        // Update the attribute in the attributes array
        setAttributes(prevAttributes => 
          prevAttributes.map(attr => 
            attr._id === res.data._id ? res.data : attr
          )
        );
        
        // Update in player attributes if present
        const playerId = res.data.player._id;
        setPlayerAttributes(prev => {
          if (prev[playerId]) {
            return {
              ...prev,
              [playerId]: prev[playerId].map(attr => 
                attr._id === res.data._id ? res.data : attr
              )
            };
          }
          return prev;
        });
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attribute');
      console.error('Error fetching attribute:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new attribute (coach only) - MEMOIZED
  const createAttribute = useCallback(async (attributeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/attributes`, attributeData);
      
      if (res.data) {
        setAttributes(prev => [...prev, res.data]);
        
        // Update player attributes if we have them for this player
        const playerId = res.data.player;
        setPlayerAttributes(prev => {
          if (prev[playerId]) {
            return {
              ...prev,
              [playerId]: [...prev[playerId], res.data]
            };
          }
          return prev;
        });
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create attribute');
      console.error('Error creating attribute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an attribute (coach only) - MEMOIZED
  const updateAttribute = useCallback(async (attributeId, attributeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`/attributes/${attributeId}`, attributeData);
      
      if (res.data) {
        // Update the attribute in the attributes array
        setAttributes(prevAttributes => 
          prevAttributes.map(attr => 
            attr._id === res.data._id ? res.data : attr
          )
        );
        
        // Update in player attributes if present
        const playerId = res.data.player;
        setPlayerAttributes(prev => {
          if (prev[playerId]) {
            return {
              ...prev,
              [playerId]: prev[playerId].map(attr => 
                attr._id === res.data._id ? res.data : attr
              )
            };
          }
          return prev;
        });
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update attribute');
      console.error('Error updating attribute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete an attribute (coach only) - MEMOIZED
  const deleteAttribute = useCallback(async (attributeId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the attribute before deleting to know which player it belongs to
      const attribute = attributes.find(attr => attr._id === attributeId);
      const playerId = attribute?.player;
      
      await axios.delete(`/attributes/${attributeId}`);
      
      // Remove the attribute from the attributes array
      setAttributes(prev => prev.filter(attr => attr._id !== attributeId));
      
      // Remove from player attributes if present
      if (playerId) {
        setPlayerAttributes(prev => {
          if (prev[playerId]) {
            return {
              ...prev,
              [playerId]: prev[playerId].filter(attr => attr._id !== attributeId)
            };
          }
          return prev;
        });
      }
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete attribute');
      console.error('Error deleting attribute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [attributes]);

  // Get player progress for a specific attribute - MEMOIZED
  const getPlayerProgress = useCallback(async (playerId, attributeName, teamId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams();
      
      if (teamId) {
        queryParams.append('teamId', teamId);
      }
      
      const queryString = queryParams.toString();
      const url = `/attributes/progress/${playerId}/${attributeName}${queryString ? `?${queryString}` : ''}`;
      
      const res = await axios.get(url);
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch player progress');
      console.error('Error fetching player progress:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get attributes by category - MEMOIZED
  const getAttributesByCategory = useCallback((category = null) => {
    if (!category) return attributes;
    
    return attributes.filter(attr => attr.category === category);
  }, [attributes]);

  // Get attributes for a specific player - MEMOIZED
  const getPlayerAttributesFromCache = useCallback((playerId) => {
    return playerAttributes[playerId] || [];
  }, [playerAttributes]);

  // Calculate overall rating for a player - MEMOIZED
  const calculateOverallRating = useCallback(async (playerId, teamId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/attributes/calculate-overall`, {
        playerId,
        teamId
      });
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate overall rating');
      console.error('Error calculating overall rating:', err);
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

  // Load team attributes when current team changes
  useEffect(() => {
    if (user && user.role === 'Trainer' && currentTeam) {
      fetchTeamAttributes(currentTeam._id);
    } else {
      setAttributes([]);
    }
  }, [user, currentTeam, fetchTeamAttributes]);

  return (
    <AttributeContext.Provider
      value={{
        attributes,
        playerAttributes,
        loading,
        error,
        fetchTeamAttributes,
        fetchPlayerAttributes,
        fetchAttribute,
        createAttribute,
        updateAttribute,
        deleteAttribute,
        getPlayerProgress,
        getAttributesByCategory,
        getPlayerAttributesFromCache,
        calculateOverallRating,
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