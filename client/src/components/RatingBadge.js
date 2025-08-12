import React, { useContext } from 'react';

import PropTypes from 'prop-types';

import { Chip } from '@mui/material';

import { AttributeContext } from '../context/AttributeContext';

const RatingBadge = ({ 
  value, 
  level, 
  levelRating, 
  leagueName,
  size = 'medium', 
  variant = 'filled', 
  showLabel = true,
  displayMode = 'auto' // 'legacy', 'level', 'auto'
}) => {
  const { getRatingCategory, getLeagueLevels } = useContext(AttributeContext);

  // Determine display mode
  const shouldShowLevel = displayMode === 'level' || 
    (displayMode === 'auto' && level !== undefined && level !== null);

  if (!shouldShowLevel) {
    // Legacy mode - show 1-99 rating
    if (!value || value === null || value === undefined) {
      return (
        <Chip
          label="N/A"
          size={size}
          variant={variant}
          sx={{
            backgroundColor: 'grey.300',
            color: 'text.secondary',
            fontWeight: 500,
          }}
        />
      );
    }

    const { category, color } = getRatingCategory(value);
    const displayText = showLabel ? `${value} - ${category}` : `${value}`;

    const getBackgroundColor = (colorName) => {
      switch (colorName) {
        case 'green':
          return '#4caf50';
        case 'lightGreen':
          return '#8bc34a';
        case 'yellow':
          return '#ffeb3b';
        case 'orange':
          return '#ff9800';
        case 'red':
          return '#f44336';
        default:
          return '#9e9e9e';
      }
    };

    const getTextColor = (colorName) => {
      switch (colorName) {
        case 'yellow':
          return '#000000';
        default:
          return '#ffffff';
      }
    };

    return (
      <Chip
        label={displayText}
        size={size}
        variant={variant}
        sx={{
          backgroundColor: getBackgroundColor(color),
          color: getTextColor(color),
          fontWeight: 600,
          minWidth: showLabel ? 120 : 50,
          '& .MuiChip-label': {
            fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          },
        }}
      />
    );
  }

  // Level mode - show German league level
  const leagueData = getLeagueLevels ? getLeagueLevels() : [
    { name: 'Kreisliga', color: '#9E9E9E' },
    { name: 'Bezirksklasse', color: '#795548' },
    { name: 'Bezirksliga', color: '#FF9800' },
    { name: 'Landesliga', color: '#4CAF50' },
    { name: 'Bayernliga', color: '#2196F3' },
    { name: 'Regionalliga', color: '#3F51B5' },
    { name: 'Dritte Liga', color: '#9C27B0' },
    { name: 'Bundesliga', color: '#FFD700' }
  ];

  const currentLeagueData = leagueData[level] || leagueData[0];
  const currentLeague = leagueName || currentLeagueData?.name || 'Kreisliga';
  const rating = levelRating || 0;

  // Use color from league data
  const levelColor = currentLeagueData?.color || '#9E9E9E';
  const displayText = showLabel ? `${currentLeague} (${rating})` : `${rating}`;

  const getBackgroundColor = (color) => {
    // If it's already a hex color, return it
    if (color && color.startsWith('#')) {
      return color;
    }
    // Legacy color name support
    switch (color) {
      case 'gold':
        return '#ffd700';
      case 'purple':
        return '#9c27b0';
      case 'blue':
        return '#2196f3';
      case 'green':
        return '#4caf50';
      case 'lightGreen':
        return '#8bc34a';
      case 'yellow':
        return '#ffeb3b';
      case 'orange':
        return '#ff9800';
      case 'red':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getTextColor = (color) => {
    // Handle hex colors - determine if light or dark
    if (color && color.startsWith('#')) {
      // Light colors that need dark text
      if (color === '#FFD700' || color === '#FFEB3B') {
        return '#000000';
      }
      return '#ffffff';
    }
    // Legacy color name support
    switch (color) {
      case 'yellow':
      case 'gold':
        return '#000000';
      default:
        return '#ffffff';
    }
  };

  return (
    <Chip
      label={displayText}
      size={size}
      variant={variant}
      sx={{
        backgroundColor: getBackgroundColor(levelColor),
        color: getTextColor(levelColor),
        fontWeight: 600,
        minWidth: showLabel ? 150 : 50,
        '& .MuiChip-label': {
          fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        },
      }}
    />
  );
};

RatingBadge.propTypes = {
  value: PropTypes.number,
  level: PropTypes.number,
  levelRating: PropTypes.number,
  leagueName: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['filled', 'outlined']),
  showLabel: PropTypes.bool,
  displayMode: PropTypes.oneOf(['legacy', 'level', 'auto']),
};

export default RatingBadge;