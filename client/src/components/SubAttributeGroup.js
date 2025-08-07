import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

import RatingSlider from './RatingSlider';

const SubAttributeGroup = ({ 
  attributeName,
  subAttributes = [],
  subAttributeValues = {},
  onSubAttributeChange,
  calculatedMainValue,
  description,
  disabled = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localSubValues, setLocalSubValues] = useState(subAttributeValues);

  // Update local state when prop changes
  useEffect(() => {
    setLocalSubValues(subAttributeValues);
  }, [subAttributeValues]);

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleSubAttributeChange = (subAttrName, value) => {
    const newSubValues = {
      ...localSubValues,
      [subAttrName]: value
    };
    
    setLocalSubValues(newSubValues);
    
    if (onSubAttributeChange) {
      onSubAttributeChange(newSubValues);
    }
  };

  // Don't render if no sub-attributes
  if (!subAttributes || subAttributes.length === 0) {
    return null;
  }

  const hasAnySubValues = Object.keys(localSubValues).some(key => 
    localSubValues[key] !== null && localSubValues[key] !== undefined
  );

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        {/* Header with expand/collapse button */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={handleToggleExpanded}
        >
          <Box>
            <Typography variant="h6" component="div">
              {attributeName}
              {calculatedMainValue !== null && (
                <Typography 
                  variant="body2" 
                  component="span" 
                  sx={{ ml: 1, fontWeight: 'bold', color: 'primary.main' }}
                >
                  (Berechnet: {calculatedMainValue})
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          
          <IconButton>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Sub-attributes section */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Detailbewertungen:
            </Typography>
            
            <Grid container spacing={2}>
              {subAttributes.map((subAttrName) => (
                <Grid item xs={12} key={subAttrName}>
                  <RatingSlider
                    attributeName={subAttrName}
                    value={localSubValues[subAttrName] || null}
                    onChange={(value) => handleSubAttributeChange(subAttrName, value)}
                    disabled={disabled}
                    variant="compact"
                  />
                </Grid>
              ))}
            </Grid>

            {hasAnySubValues && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Der Hauptwert wird automatisch aus dem Durchschnitt aller Detailbewertungen berechnet.
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

SubAttributeGroup.propTypes = {
  attributeName: PropTypes.string.isRequired,
  subAttributes: PropTypes.arrayOf(PropTypes.string),
  subAttributeValues: PropTypes.object,
  onSubAttributeChange: PropTypes.func,
  calculatedMainValue: PropTypes.number,
  description: PropTypes.string,
  disabled: PropTypes.bool
};

export default SubAttributeGroup;