import React, { useState, useEffect, useContext } from 'react';

import PropTypes from 'prop-types';

import {
  Box,
  Slider,
  Typography,
  TextField,
  FormHelperText,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import RatingBadge from './RatingBadge';
import { AttributeContext } from '../context/AttributeContext';

const RatingSlider = ({
  value = 50,
  onChange,
  label,
  attributeName,
  description,
  disabled = false,
  showInput = true,
  showBadge = true,
  error,
  helperText,
  variant = 'default',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [inputValue, setInputValue] = useState(String(value));
  const { validateRating, getRatingCategory } = useContext(AttributeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setLocalValue(value);
    setInputValue(String(value));
  }, [value]);

  const handleSliderChange = (event, newValue) => {
    setLocalValue(newValue);
    setInputValue(String(newValue));
    onChange && onChange(newValue);
  };

  const handleInputChange = (event) => {
    const newInputValue = event.target.value;
    setInputValue(newInputValue);

    const validation = validateRating(newInputValue);
    if (validation.isValid) {
      const numValue = Number(newInputValue);
      setLocalValue(numValue);
      onChange && onChange(numValue);
    }
  };

  const handleInputBlur = () => {
    const validation = validateRating(inputValue);
    if (!validation.isValid) {
      setInputValue(String(localValue));
    }
  };

  const { color } = getRatingCategory(localValue);

  const getSliderColor = () => {
    switch (color) {
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
        return theme.palette.primary.main;
    }
  };

  const isCompact = variant === 'compact';
  const displayLabel = label || attributeName;

  const marks = isCompact ? [] : [
    { value: 1, label: '1' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 75, label: '75' },
    { value: 99, label: '99' },
  ];

  return (
    <Box sx={{ mb: isCompact ? 1 : 2 }}>
      {/* Label and Badge */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={isCompact ? 0.5 : 1}>
        <Typography 
          variant={isCompact ? "body2" : "subtitle2"} 
          color="textPrimary" 
          fontWeight={isCompact ? 500 : 600}
        >
          {displayLabel}
        </Typography>
        {showBadge && (
          <RatingBadge 
            value={localValue} 
            size={isCompact || isMobile ? 'small' : 'medium'}
            showLabel={!isMobile && !isCompact}
          />
        )}
      </Box>

      {/* Description */}
      {description && !isCompact && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
      )}

      {/* Slider and Input Container */}
      <Box 
        display="flex" 
        alignItems="center" 
        gap={isCompact ? 1 : 2}
        sx={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
        }}
      >
        {/* Slider */}
        <Box sx={{ flex: 1, px: isMobile ? 0 : (isCompact ? 0.5 : 1) }}>
          <Slider
            value={localValue}
            onChange={handleSliderChange}
            min={1}
            max={99}
            step={1}
            marks={marks}
            disabled={disabled}
            sx={{
              color: getSliderColor(),
              height: isMobile ? 6 : (isCompact ? 3 : 4),
              '& .MuiSlider-thumb': {
                width: isMobile ? 24 : 20,
                height: isMobile ? 24 : 20,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: `0px 0px 0px 8px ${getSliderColor()}20`,
                },
              },
              '& .MuiSlider-track': {
                height: isMobile ? 6 : 4,
              },
              '& .MuiSlider-rail': {
                height: isMobile ? 6 : 4,
                opacity: 0.3,
              },
              '& .MuiSlider-mark': {
                height: isMobile ? 8 : 6,
                width: 2,
                backgroundColor: 'currentColor',
              },
              '& .MuiSlider-markLabel': {
                fontSize: isMobile ? '0.75rem' : '0.625rem',
                color: 'text.secondary',
              },
            }}
          />
        </Box>

        {/* Input Field */}
        {showInput && !isCompact && (
          <Box sx={{ width: isMobile ? '100%' : 80 }}>
            <TextField
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              type="number"
              size="small"
              disabled={disabled}
              inputProps={{
                min: 1,
                max: 99,
                step: 1,
                style: { textAlign: 'center' },
              }}
              error={!!error}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: error ? 'error.main' : getSliderColor(),
                  },
                  '&:hover fieldset': {
                    borderColor: error ? 'error.main' : getSliderColor(),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: error ? 'error.main' : getSliderColor(),
                  },
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Helper Text */}
      {(helperText || error) && (
        <FormHelperText error={!!error} sx={{ mt: 1, ml: 1 }}>
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

RatingSlider.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  label: PropTypes.string,
  attributeName: PropTypes.string,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  showInput: PropTypes.bool,
  showBadge: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'compact']),
};

export default RatingSlider;