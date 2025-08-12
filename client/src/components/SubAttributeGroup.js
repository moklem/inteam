import React, { useState, useEffect } from 'react';

import PropTypes from 'prop-types';

import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Grid,
  Chip,
  Tooltip
} from '@mui/material';

import RatingSlider from './RatingSlider';
import RatingBadge from './RatingBadge';
import LevelProgressBar from './LevelProgressBar';
import LevelSelector from './LevelSelector';

const SubAttributeGroup = ({ 
  attributeName,
  subAttributes = [],
  subAttributeValues = {},
  onSubAttributeChange,
  calculatedMainValue,
  description,
  disabled = false,
  level = 0,
  levelRating = 0,
  leagueName = null,
  nextLeague = null,
  onLevelChange = null,
  selfAssessmentData = null,
  coachLevel = null,
  coachRating = null,
  coachLeagueName = null
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
        {/* Header with level badge and expand/collapse button */}
        <Box>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: 1
            }}
            onClick={handleToggleExpanded}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" component="div">
                {attributeName}
              </Typography>
              {calculatedMainValue !== null && (
                <Typography 
                  variant="body2" 
                  component="span" 
                  sx={{ fontWeight: 'bold', color: 'primary.main' }}
                >
                  ({calculatedMainValue})
                </Typography>
              )}
            </Box>
            
            <IconButton>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          {/* Assessment Badges - Moved inside card */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {/* Player Self Assessment Badge */}
            {selfAssessmentData && selfAssessmentData.selfLevel !== undefined && (
              <Chip
                size="small"
                label={`Selbst: ${selfAssessmentData.leagueName || 'Unbekannt'} ${selfAssessmentData.selfRating || 0}`}
                sx={{
                  backgroundColor: `${selfAssessmentData.leagueColor || '#757575'}20`,
                  borderColor: selfAssessmentData.leagueColor || '#757575',
                  border: '1px solid',
                  color: selfAssessmentData.leagueColor || '#757575',
                  fontWeight: 'bold'
                }}
              />
            )}
            {/* Coach Assessment Badge */}
            {coachLevel !== null && coachLevel !== undefined && (
              <Chip
                size="small"
                label={`Trainer: ${coachLeagueName || 'Unbekannt'} ${coachRating || 0}`}
                sx={{
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  fontWeight: 'bold'
                }}
              />
            )}
          </Box>
          
          {/* Level Progress Bar or Level Selector based on edit mode */}
          {onLevelChange ? (
            <LevelSelector
              level={level}
              levelRating={levelRating}
              onChange={onLevelChange}
              disabled={disabled}
              compact={false}
            />
          ) : (
            <LevelProgressBar
              level={level}
              levelRating={levelRating}
              leagueName={leagueName}
              nextLeague={nextLeague}
              compact={true}
              animated={true}
            />
          )}
          
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {description}
            </Typography>
          )}
        </Box>

        {/* Sub-attributes section */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Detailbewertungen:
            </Typography>
            
            <Grid container spacing={2}>
              {subAttributes.map((subAttrName) => {
                const selfSubValue = selfAssessmentData?.subAttributes?.[subAttrName];
                return (
                  <Grid item xs={12} key={subAttrName}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <RatingSlider
                          attributeName={subAttrName}
                          value={localSubValues[subAttrName] || null}
                          onChange={(value) => handleSubAttributeChange(subAttrName, value)}
                          disabled={disabled}
                          variant="compact"
                        />
                      </Box>
                      {selfSubValue !== null && selfSubValue !== undefined && (
                        <Tooltip title={`Selbsteinschätzung: ${selfSubValue}/99`}>
                          <Chip
                            size="small"
                            label={`S: ${selfSubValue}`}
                            sx={{
                              minWidth: '60px',
                              backgroundColor: 'info.light',
                              color: 'info.contrastText',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </Grid>
                );
              })}
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
  disabled: PropTypes.bool,
  level: PropTypes.number,
  levelRating: PropTypes.number,
  leagueName: PropTypes.string,
  nextLeague: PropTypes.string,
  onLevelChange: PropTypes.func,
  selfAssessmentData: PropTypes.object,
  coachLevel: PropTypes.number,
  coachRating: PropTypes.number,
  coachLeagueName: PropTypes.string
};

export default SubAttributeGroup;