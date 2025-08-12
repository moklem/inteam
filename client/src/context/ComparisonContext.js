import React, { createContext, useContext, useState, useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import PropTypes from 'prop-types';

import { useAuth } from './AuthContext';

const ComparisonContext = createContext();

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [privacyOptOut, setPrivacyOptOut] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // Load privacy settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('comparison-privacy-optout');
    if (saved === 'true') {
      setPrivacyOptOut(true);
    }
  }, []);

  // API configuration
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Fetch team percentiles for the current user
  const {
    data: percentileData,
    isLoading: isLoadingPercentiles,
    error: percentileError,
    refetch: refetchPercentiles
  } = useQuery({
    queryKey: ['team-percentiles', selectedTeamId, user?.id],
    queryFn: async () => {
      if (!selectedTeamId || privacyOptOut) return null;
      
      const response = await api.get(`/comparisons/team/${selectedTeamId}/percentiles`);
      return response.data;
    },
    enabled: !!selectedTeamId && !!token && !privacyOptOut,
    staleTime: 1000 * 60 * 60, // 1 hour cache
    cacheTime: 1000 * 60 * 60 * 2, // 2 hour cache retention
  });

  // Fetch team distribution data (anonymous)
  const {
    data: distributionData,
    isLoading: isLoadingDistribution,
    error: distributionError
  } = useQuery({
    queryKey: ['team-distribution', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId || privacyOptOut) return null;
      
      const response = await api.get(`/comparisons/team/${selectedTeamId}/distribution`);
      return response.data;
    },
    enabled: !!selectedTeamId && !!token && !privacyOptOut,
    staleTime: 1000 * 60 * 60, // 1 hour cache
    cacheTime: 1000 * 60 * 60 * 4, // 4 hour cache retention
  });

  // German attribute names mapping
  const attributeNames = {
    athletik: 'Athletik',
    aufschlag: 'Aufschlag',
    abwehr: 'Abwehr',
    angriff: 'Angriff',
    mental: 'Mental',
    grundTechnik: 'Grund-Technik',
    annahme: 'Annahme',
    positionsspezifisch: 'Positionsspezifisch'
  };

  // Get percentile category with German labels
  const getPercentileCategory = (percentile) => {
    if (percentile >= 90) return { label: 'Elite', color: '#1b5e20', description: 'Top 10%' };
    if (percentile >= 80) return { label: 'Sehr gut', color: '#2e7d32', description: 'Top 20%' };
    if (percentile >= 70) return { label: 'Gut', color: '#388e3c', description: 'Top 30%' };
    if (percentile >= 50) return { label: 'Durchschnitt', color: '#ffa000', description: 'Durchschnitt' };
    if (percentile >= 30) return { label: 'Entwicklungsbedarf', color: '#f57f17', description: 'Untere 50%' };
    if (percentile >= 10) return { label: 'Schwach', color: '#e65100', description: 'Untere 30%' };
    return { label: 'Kritisch', color: '#b71c1c', description: 'Untere 10%' };
  };

  // Get color for percentile visualization
  const getPercentileColor = (percentile) => {
    if (percentile >= 70) return '#4caf50'; // Green - strengths
    if (percentile >= 30) return '#ff9800'; // Orange - neutral
    return '#f44336'; // Red - improvements needed
  };

  // Handle privacy opt-out
  const handlePrivacyOptOut = (optOut) => {
    setPrivacyOptOut(optOut);
    localStorage.setItem('comparison-privacy-optout', optOut.toString());
    
    if (optOut) {
      // Clear all comparison data from cache
      queryClient.removeQueries(['team-percentiles']);
      queryClient.removeQueries(['team-distribution']);
    } else {
      // Refetch data when opting back in
      refetchPercentiles();
    }
  };

  // Get strengths and improvements with German names
  const getStrengthsAndImprovements = () => {
    if (!percentileData) return { strengths: [], improvements: [] };
    
    const strengths = percentileData.strengths?.map(attr => attributeNames[attr]) || [];
    const improvements = percentileData.improvements?.map(attr => attributeNames[attr]) || [];
    
    return { strengths, improvements };
  };

  // Check if sufficient team size for comparisons
  const hasSufficientTeamSize = () => {
    return percentileData?.teamSize >= 5;
  };

  // Get radar chart data
  const getRadarChartData = () => {
    if (!percentileData?.percentiles) return [];
    
    return Object.entries(percentileData.percentiles).map(([key, value]) => ({
      attribute: attributeNames[key] || key,
      percentile: value,
      color: getPercentileColor(value),
      category: getPercentileCategory(value)
    }));
  };

  // Get comparison summary
  const getComparisonSummary = () => {
    if (!percentileData) return null;
    
    const { strengths, improvements } = getStrengthsAndImprovements();
    const averagePercentile = Object.values(percentileData.percentiles || {})
      .reduce((sum, val) => sum + val, 0) / Object.keys(percentileData.percentiles || {}).length;
    
    return {
      teamSize: percentileData.teamSize,
      averagePercentile: Math.round(averagePercentile),
      strengthsCount: strengths.length,
      improvementsCount: improvements.length,
      overallCategory: getPercentileCategory(averagePercentile)
    };
  };

  const value = {
    // Data
    percentileData,
    distributionData,
    
    // Loading states
    isLoadingPercentiles,
    isLoadingDistribution,
    isLoading: isLoadingPercentiles || isLoadingDistribution,
    
    // Errors
    percentileError,
    distributionError,
    hasError: !!percentileError || !!distributionError,
    
    // Privacy settings
    privacyOptOut,
    handlePrivacyOptOut,
    
    // Team selection
    selectedTeamId,
    setSelectedTeamId,
    
    // Helper functions
    attributeNames,
    getPercentileCategory,
    getPercentileColor,
    getStrengthsAndImprovements,
    hasSufficientTeamSize,
    getRadarChartData,
    getComparisonSummary,
    
    // Actions
    refetchPercentiles,
    refetch: () => {
      refetchPercentiles();
      queryClient.refetchQueries(['team-distribution', selectedTeamId]);
    }
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
};

ComparisonProvider.propTypes = {
  children: PropTypes.node.isRequired
};