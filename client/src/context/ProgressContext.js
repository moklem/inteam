import React, { createContext, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';

import { AuthContext } from './AuthContext';
import axios from '../utils/axios';

export const ProgressContext = createContext();

export const ProgressProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);

  // Fetch historical progress data for a player - MEMOIZED
  const fetchPlayerProgress = useCallback(async (playerId, fromDate = null, toDate = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (fromDate) params.from = fromDate.toISOString();
      if (toDate) params.to = toDate.toISOString();
      
      const res = await axios.get(`/progress/player/${playerId}`, { params });
      
      return res.data || {};
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Fortschrittsdaten');
      console.error('Error fetching player progress:', err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate trend for an attribute based on historical data - MEMOIZED
  const calculateAttributeTrend = useCallback((progressionHistory) => {
    if (!progressionHistory || progressionHistory.length < 2) {
      return { trend: 'stable', change: 0, direction: 'stable' };
    }

    // Get last 5 data points or all available if less than 5
    const recentHistory = progressionHistory.slice(-5);
    
    // Calculate overall change from first to last point
    const firstValue = recentHistory[0].value;
    const lastValue = recentHistory[recentHistory.length - 1].value;
    const totalChange = lastValue - firstValue;
    
    // Calculate trend direction based on recent changes
    let positiveChanges = 0;
    let negativeChanges = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const change = recentHistory[i].value - recentHistory[i - 1].value;
      if (change > 0) positiveChanges++;
      else if (change < 0) negativeChanges++;
    }
    
    // Determine trend
    let trend = 'stable';
    let direction = 'stable';
    
    if (Math.abs(totalChange) >= 5) { // Significant change threshold
      if (totalChange > 0) {
        trend = 'improving';
        direction = 'up';
      } else {
        trend = 'declining';
        direction = 'down';
      }
    } else if (positiveChanges > negativeChanges) {
      trend = 'slightly improving';
      direction = 'up';
    } else if (negativeChanges > positiveChanges) {
      trend = 'slightly declining';
      direction = 'down';
    }
    
    return {
      trend,
      change: totalChange,
      direction,
      progressionRate: totalChange / recentHistory.length // Points per entry
    };
  }, []);

  // Get milestone achievements for progression display - MEMOIZED
  const getMilestones = useCallback((progressionHistory) => {
    if (!progressionHistory || progressionHistory.length === 0) {
      return [];
    }

    const milestones = [];
    const milestoneThresholds = [70, 80, 90];
    
    // Track which milestones have been achieved
    const achievedMilestones = new Set();
    
    progressionHistory.forEach((entry, index) => {
      milestoneThresholds.forEach(threshold => {
        // Check if this is the first time reaching this threshold
        if (entry.value >= threshold && !achievedMilestones.has(threshold)) {
          // Double-check that previous entries were below this threshold
          const previouslyBelowThreshold = index === 0 || 
            progressionHistory.slice(0, index).every(prev => prev.value < threshold);
          
          if (previouslyBelowThreshold) {
            milestones.push({
              value: threshold,
              date: entry.updatedAt,
              type: threshold >= 90 ? 'elite' : threshold >= 80 ? 'excellent' : 'good',
              label: threshold >= 90 ? 'Elite-Level erreicht' : 
                     threshold >= 80 ? 'Exzellent-Level erreicht' : 
                     'Gutes Level erreicht'
            });
            achievedMilestones.add(threshold);
          }
        }
      });
    });
    
    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, []);

  // Format progression data for charts - MEMOIZED
  const formatProgressionForChart = useCallback((progressionHistory, attributeName) => {
    if (!progressionHistory || progressionHistory.length === 0) {
      return [];
    }

    return progressionHistory.map((entry, index) => ({
      date: new Date(entry.updatedAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      timestamp: new Date(entry.updatedAt).getTime(),
      value: entry.value,
      change: entry.change || 0,
      notes: entry.notes || '',
      attributeName: attributeName,
      isSignificantChange: Math.abs(entry.change || 0) >= 5,
      index
    }));
  }, []);

  // Get date range presets for filtering - MEMOIZED
  const getDateRangePresets = useCallback(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    return [
      { label: '1 Monat', key: '1M', fromDate: oneMonthAgo, toDate: now },
      { label: '3 Monate', key: '3M', fromDate: threeMonthsAgo, toDate: now },
      { label: '6 Monate', key: '6M', fromDate: sixMonthsAgo, toDate: now },
      { label: '1 Jahr', key: '1Y', fromDate: oneYearAgo, toDate: now },
      { label: 'Alle', key: 'ALL', fromDate: null, toDate: null }
    ];
  }, []);

  // Calculate progression statistics - MEMOIZED
  const calculateProgressionStats = useCallback((progressionHistory) => {
    if (!progressionHistory || progressionHistory.length === 0) {
      return {
        totalEntries: 0,
        averageValue: 0,
        highestValue: 0,
        lowestValue: 0,
        totalImprovement: 0,
        averageImprovement: 0,
        plateauPeriods: 0
      };
    }

    const values = progressionHistory.map(entry => entry.value);
    const changes = progressionHistory.map(entry => entry.change || 0).filter(change => change !== 0);
    
    // Count plateau periods (consecutive entries with no significant change)
    let plateauPeriods = 0;
    let currentPlateauLength = 0;
    
    for (let i = 1; i < progressionHistory.length; i++) {
      const change = Math.abs(progressionHistory[i].change || 0);
      if (change < 3) { // Less than 3 points change considered plateau
        currentPlateauLength++;
      } else {
        if (currentPlateauLength >= 3) { // 3+ consecutive entries with minimal change
          plateauPeriods++;
        }
        currentPlateauLength = 0;
      }
    }
    
    // Check final plateau
    if (currentPlateauLength >= 3) {
      plateauPeriods++;
    }

    return {
      totalEntries: progressionHistory.length,
      averageValue: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
      highestValue: Math.max(...values),
      lowestValue: Math.min(...values),
      totalImprovement: values[values.length - 1] - values[0],
      averageImprovement: changes.length > 0 ? 
        Math.round((changes.reduce((sum, change) => sum + change, 0) / changes.length) * 100) / 100 : 0,
      plateauPeriods
    };
  }, []);

  // Add coach notes to progression entry - MEMOIZED
  const addCoachNote = useCallback(async (playerId, attributeName, entryDate, notes) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`/progress/note`, {
        playerId,
        attributeName,
        entryDate,
        notes
      });
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Hinzufügen der Notiz');
      console.error('Error adding coach note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export progress data as PDF - MEMOIZED
  const exportProgressReport = useCallback(async (playerId, fromDate = null, toDate = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (fromDate) params.from = fromDate.toISOString();
      if (toDate) params.to = toDate.toISOString();
      
      const response = await axios.post(`/progress/export/${playerId}`, params, {
        responseType: 'blob'
      });
      
      // Create blob link and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fortschrittsbericht_${playerId}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Exportieren des Berichts');
      console.error('Error exporting progress report:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get color for trend indicator - MEMOIZED
  const getTrendColor = useCallback((trend) => {
    switch (trend) {
      case 'improving':
        return 'success';
      case 'slightly improving':
        return 'info';
      case 'declining':
        return 'error';
      case 'slightly declining':
        return 'warning';
      default:
        return 'default';
    }
  }, []);

  // Get trend icon based on direction - MEMOIZED
  const getTrendIcon = useCallback((direction) => {
    switch (direction) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }, []);

  return (
    <ProgressContext.Provider
      value={{
        loading,
        error,
        fetchPlayerProgress,
        calculateAttributeTrend,
        getMilestones,
        formatProgressionForChart,
        getDateRangePresets,
        calculateProgressionStats,
        addCoachNote,
        exportProgressReport,
        getTrendColor,
        getTrendIcon,
        setError
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

ProgressProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default ProgressProvider;