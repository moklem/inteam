import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import { AttributeContext } from '../context/AttributeContext';

const RatingBadge = ({ value, size = 'medium', variant = 'filled', showLabel = true }) => {
  const { getRatingCategory } = useContext(AttributeContext);

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

  const { category, color, label } = getRatingCategory(value);

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

  const displayText = showLabel ? `${value} - ${category}` : `${value}`;

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
};

RatingBadge.propTypes = {
  value: PropTypes.number,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['filled', 'outlined']),
  showLabel: PropTypes.bool,
};

export default RatingBadge;