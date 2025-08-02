import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const TrainingPreferencesContext = createContext();

export const TrainingPreferencesProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [focusAreas, setFocusAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load focus areas from localStorage and backend
  useEffect(() => {
    if (user && user._id) {
      loadFocusAreas();
    }
  }, [user]);

  // Load focus areas from localStorage first, then sync with backend
  const loadFocusAreas = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load from localStorage first for immediate display
      const localStorageKey = `trainingFocusAreas_${user._id}`;
      const localData = localStorage.getItem(localStorageKey);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        setFocusAreas(parsedData);
      }

      // Then sync with backend
      try {
        const response = await axios.get(`/users/${user._id}/training-preferences`);
        
        if (response.data && response.data.focusAreas) {
          const backendData = response.data.focusAreas;
          setFocusAreas(backendData);
          
          // Update localStorage with backend data
          localStorage.setItem(localStorageKey, JSON.stringify(backendData));
        }
      } catch (backendError) {
        // If backend fails but we have local data, that's ok
        if (!localData) {
          console.error('Error loading training preferences from backend:', backendError);
          // Don't set error state if we have local data
          setError('Fehler beim Laden der Trainingspräferenzen.');
        }
      }
    } catch (err) {
      console.error('Error loading focus areas:', err);
      setError('Fehler beim Laden der Trainingsschwerpunkte.');
    } finally {
      setLoading(false);
    }
  };

  // Update focus areas in both localStorage and backend
  const updateFocusAreas = async (newFocusAreas) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!Array.isArray(newFocusAreas)) {
        throw new Error('Focus areas must be an array');
      }

      if (newFocusAreas.length > 3) {
        throw new Error('Maximum 3 focus areas allowed');
      }

      // Update localStorage immediately for responsive UI
      const localStorageKey = `trainingFocusAreas_${user._id}`;
      localStorage.setItem(localStorageKey, JSON.stringify(newFocusAreas));
      setFocusAreas(newFocusAreas);

      // Prepare data for backend
      const requestData = {
        focusAreas: newFocusAreas.map(area => ({
          area: area.area,
          priority: area.priority,
          icon: area.icon,
          color: area.color
        }))
      };

      // Send to backend
      await axios.put(`/users/${user._id}/training-preferences`, requestData);

      console.log('Training preferences saved successfully');
      
    } catch (err) {
      console.error('Error updating focus areas:', err);
      
      // Revert localStorage on backend failure
      try {
        const response = await axios.get(`/users/${user._id}/training-preferences`);
        if (response.data && response.data.focusAreas) {
          const backendData = response.data.focusAreas;
          setFocusAreas(backendData);
          const localStorageKey = `trainingFocusAreas_${user._id}`;
          localStorage.setItem(localStorageKey, JSON.stringify(backendData));
        }
      } catch (revertError) {
        console.error('Error reverting data:', revertError);
      }
      
      const errorMessage = err.response?.data?.message || 'Fehler beim Speichern der Trainingsschwerpunkte.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear focus areas
  const clearFocusAreas = async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear localStorage
      const localStorageKey = `trainingFocusAreas_${user._id}`;
      localStorage.removeItem(localStorageKey);
      setFocusAreas([]);

      // Clear on backend
      await axios.put(`/users/${user._id}/training-preferences`, { focusAreas: [] });
      
    } catch (err) {
      console.error('Error clearing focus areas:', err);
      setError('Fehler beim Löschen der Trainingsschwerpunkte.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get focus area by priority
  const getFocusAreaByPriority = (priority) => {
    return focusAreas.find(area => area.priority === priority);
  };

  // Check if area is selected
  const isAreaSelected = (areaKey) => {
    return focusAreas.some(area => area.area === areaKey);
  };

  // Get primary focus area (priority 1)
  const getPrimaryFocusArea = () => {
    return getFocusAreaByPriority(1);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Context value
  const contextValue = {
    focusAreas,
    loading,
    error,
    updateFocusAreas,
    clearFocusAreas,
    loadFocusAreas,
    getFocusAreaByPriority,
    isAreaSelected,
    getPrimaryFocusArea,
    clearError
  };

  return (
    <TrainingPreferencesContext.Provider value={contextValue}>
      {children}
    </TrainingPreferencesContext.Provider>
  );
};

TrainingPreferencesProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Custom hook for using the context
export const useTrainingPreferences = () => {
  const context = useContext(TrainingPreferencesContext);
  if (!context) {
    throw new Error('useTrainingPreferences must be used within a TrainingPreferencesProvider');
  }
  return context;
};

export default TrainingPreferencesProvider;