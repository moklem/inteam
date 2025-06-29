import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Load team attributes when current team changes
  useEffect(() => {
    if (user && user.role === 'Trainer' && currentTeam) {
      fetchTeamAttributes(currentTeam._id);
    } else {
      setAttributes([]);
    }
  }, [user, currentTeam]);

  // Fetch all attributes for a team
  const fetchTeamAttributes = async (teamId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/attributes/team/${teamId}`);
      
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
  };

  // Fetch all attributes for a player
  const fetchPlayerAttributes = async (playerId, teamId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams();
      
      if (teamId) {
        queryParams.append('teamId', teamId);
      }
      
      const queryString = queryParams.toString();
      const url = `${process.env.REACT_APP_API_URL}/attributes/player/${playerId}${queryString ? `?${queryString}` : ''}`;
      
      const res = await axios.get(url);
      
      if (res.data) {
        // Store player attributes in a map by player ID
        setPlayerAttributes({
          ...playerAttributes,
          [playerId]: res.data
        });
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch player attributes');
      console.error('Error fetching player attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific attribute by ID
  const fetchAttribute = async (attributeId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/attributes/${attributeId}`);
      
      if (res.data) {
        // Update the attribute in the attributes array
        setAttributes(attributes.map(attr => 
          attr._id === res.data._id ? res.data : attr
        ));
        
        // Update in player attributes if present
        const playerId = res.data.player._id;
        if (playerAttributes[playerId]) {
          setPlayerAttributes({
            ...playerAttributes,
            [playerId]: playerAttributes[playerId].map(attr => 
              attr._id === res.data._id ? res.data : attr
            )
          });
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attribute');
      console.error('Error fetching attribute:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new attribute (coach only)
  const createAttribute = async (attributeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/attributes`, attributeData);
      
      if (res.data) {
        setAttributes([...attributes, res.data]);
        
        // Update player attributes if we have them for this player
        const playerId = res.data.player;
        if (playerAttributes[playerId]) {
          setPlayerAttributes({
            ...playerAttributes,
            [playerId]: [...playerAttributes[playerId], res.data]
          });
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create attribute');
      console.error('Error creating attribute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an attribute (coach only)
  const updateAttribute = async (attributeId, attributeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`${process.env.REACT_APP_API_URL}/attributes/${attributeId}`, attributeData);
      
      if (res.data) {
        // Update the attribute in the attributes array
        setAttributes(attributes.map(attr => 
          attr._id === res.data._id ? res.data : attr
        ));
        
        // Update in player attributes if present
        const playerId = res.data.player;
        if (playerAttributes[playerId]) {
          setPlayerAttributes({
            ...playerAttributes,
            [playerId]: playerAttributes[playerId].map(attr => 
              attr._id === res.data._id ? res.data : attr
            )
          });
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update attribute');
      console.error('Error updating attribute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an attribute (coach only)
  const deleteAttribute = async (attributeId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the attribute before deleting to know which player it belongs to
      const attribute = attributes.find(attr => attr._id === attributeId);
      const playerId = attribute?.player;
      
      await axios.delete(`${process.env.REACT_APP_API_URL}/attributes/${attributeId}`);
      
      // Remove the attribute from the attributes array
      setAttributes(attributes.filter(attr => attr._id !== attributeId));
      
      // Remove from player attributes if present
      if (playerId && playerAttributes[playerId]) {
        setPlayerAttributes({
          ...playerAttributes,
          [playerId]: playerAttributes[playerId].filter(attr => attr._id !== attributeId)
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
  };

  // Get player progress for a specific attribute
  const getPlayerProgress = async (playerId, attributeName, teamId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams();
      
      if (teamId) {
        queryParams.append('teamId', teamId);
      }
      
      const queryString = queryParams.toString();
      const url = `${process.env.REACT_APP_API_URL}/attributes/progress/${playerId}/${attributeName}${queryString ? `?${queryString}` : ''}`;
      
      const res = await axios.get(url);
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch player progress');
      console.error('Error fetching player progress:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get attributes by category
  const getAttributesByCategory = (category = null) => {
    if (!category) return attributes;
    
    return attributes.filter(attr => attr.category === category);
  };

  // Get attributes for a specific player
  const getPlayerAttributesFromCache = (playerId) => {
    return playerAttributes[playerId] || [];
  };

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
