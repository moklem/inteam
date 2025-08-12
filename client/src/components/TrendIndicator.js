import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Chip, 
  Typography, 
  Tooltip 
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat
} from '@mui/icons-material';

const TrendIndicator = ({ 
  trend, 
  change, 
  direction, 
  progressionRate, 
  size = 'medium',
  showLabel = true,
  showValue = true 
}) => {
  // Get trend icon based on direction
  const getTrendIcon = () => {
    switch (direction) {
      case 'up':
        return <TrendingUp />;
      case 'down':
        return <TrendingDown />;
      default:
        return <TrendingFlat />;
    }
  };

  // Get trend color based on trend type
  const getTrendColor = () => {
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
  };

  // Get trend label in German
  const getTrendLabel = () => {
    switch (trend) {
      case 'improving':
        return 'Stark verbessert';
      case 'slightly improving':
        return 'Leicht verbessert';
      case 'declining':
        return 'Verschlechtert';
      case 'slightly declining':
        return 'Leicht verschlechtert';
      default:
        return 'Stabil';
    }
  };

  // Format change value for display
  const formatChange = () => {
    if (change === 0) return '±0';
    return change > 0 ? `+${change}` : `${change}`;
  };

  // Create tooltip content
  const getTooltipContent = () => {
    let content = `Trend: ${getTrendLabel()}`;
    if (showValue && change !== undefined) {
      content += `\nVeränderung: ${formatChange()} Punkte`;
    }
    if (progressionRate !== undefined) {
      content += `\nRate: ${progressionRate.toFixed(1)} Punkte/Bewertung`;
    }
    return content;
  };

  return (
    <Tooltip title={getTooltipContent()} arrow placement="top">
      <Box 
        display="flex" 
        alignItems="center" 
        gap={0.5}
        sx={{ cursor: 'help' }}
      >
        <Chip
          icon={getTrendIcon()}
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              {showLabel && (
                <Typography 
                  variant={size === 'small' ? 'caption' : 'body2'}
                  component="span"
                >
                  {getTrendLabel()}
                </Typography>
              )}
              {showValue && change !== undefined && (
                <Typography 
                  variant={size === 'small' ? 'caption' : 'body2'}
                  component="span"
                  fontWeight="bold"
                  color={change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'}
                >
                  ({formatChange()})
                </Typography>
              )}
            </Box>
          }
          color={getTrendColor()}
          variant="outlined"
          size={size}
          sx={{
            '& .MuiChip-icon': {
              color: 'inherit'
            }
          }}
        />
      </Box>
    </Tooltip>
  );
};

TrendIndicator.propTypes = {
  trend: PropTypes.oneOf([
    'improving',
    'slightly improving', 
    'declining',
    'slightly declining',
    'stable'
  ]).isRequired,
  change: PropTypes.number,
  direction: PropTypes.oneOf(['up', 'down', 'stable']).isRequired,
  progressionRate: PropTypes.number,
  size: PropTypes.oneOf(['small', 'medium']),
  showLabel: PropTypes.bool,
  showValue: PropTypes.bool
};

export default TrendIndicator;