import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';

import PropTypes from 'prop-types';

import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import RatingBadge from './RatingBadge';
import RatingSlider from './RatingSlider';
import SubAttributeGroup from './SubAttributeGroup';
import LevelProgressBar from './LevelProgressBar';
import { AttributeContext } from '../context/AttributeContext';

const PlayerRatingCard = ({ 
  player, 
  onSave, 
  editable = true, 
  showOverallRating = true,
  compact = false 
}) => {
  const {
    getCoreAttributes,
    fetchUniversalPlayerRatings,
    saveUniversalPlayerRatings,
    calculateOverallRating,
    getPositionSpecificSubAttributes,
    calculateMainAttributeFromSubs,
    fetchLevelProgress,
    migratePlayerToLevelSystem,
    getLeagueLevels,
    loading,
    error,
  } = useContext(AttributeContext);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [ratings, setRatings] = useState({});
  const [subAttributeRatings, setSubAttributeRatings] = useState({});
  const [originalRatings, setOriginalRatings] = useState({});
  const [originalSubAttributeRatings, setOriginalSubAttributeRatings] = useState({});
  const [overallRating, setOverallRating] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [levelData, setLevelData] = useState({});
  const [overallLevelData, setOverallLevelData] = useState(null);

  const coreAttributes = useMemo(() => getCoreAttributes(), [getCoreAttributes]);

  const loadPlayerAttributes = useCallback(async () => {
    try {
      const attributes = await fetchUniversalPlayerRatings(player._id);
      const ratingsMap = {};
      const subRatingsMap = {};
      
      // Map existing attributes to ratings
      if (attributes) {
        attributes.forEach(attr => {
          if (attr.numericValue !== null && attr.numericValue !== undefined) {
            ratingsMap[attr.attributeName] = attr.numericValue;
          }
          if (attr.subAttributes) {
            subRatingsMap[attr.attributeName] = attr.subAttributes;
          }
        });
      }

      // Initialize missing attributes with default values
      coreAttributes.forEach(attr => {
        if (!ratingsMap[attr.name]) {
          ratingsMap[attr.name] = null; // No default rating - will be calculated from sub-attributes
        }
        if (!subRatingsMap[attr.name]) {
          subRatingsMap[attr.name] = {};
        }
      });

      setRatings(ratingsMap);
      setSubAttributeRatings(subRatingsMap);
      setOriginalRatings({ ...ratingsMap });
      setOriginalSubAttributeRatings({ ...subRatingsMap });

      // Calculate overall rating
      if (showOverallRating) {
        const overall = await calculateOverallRating(player._id);
        setOverallRating(overall?.overallRating || null);
      }

      // Fetch level progress data
      try {
        const levelProgress = await fetchLevelProgress(player._id);
        if (levelProgress) {
          // Map level data to attributes
          const levelMap = {};
          if (levelProgress.attributes) {
            levelProgress.attributes.forEach(attr => {
              levelMap[attr.attributeName] = {
                level: attr.level || 0,
                levelRating: attr.levelRating || 0,
                leagueName: attr.leagueName,
                nextLeague: attr.nextLeague,
                progressToNextLevel: attr.progressToNextLevel
              };
            });
          }
          setLevelData(levelMap);
          setOverallLevelData(levelProgress.overall);
        }
      } catch (levelError) {
        // Level system might not be migrated yet - this is ok
        console.log('Level data not available yet');
      }
    } catch (error) {
      console.error('Error loading player attributes:', error);
      // Don't show error to user if it's just API not deployed yet
    }
  }, [player?._id, fetchUniversalPlayerRatings, calculateOverallRating, showOverallRating, coreAttributes, fetchLevelProgress]);

  useEffect(() => {
    if (player?._id) {
      loadPlayerAttributes();
    }
  }, [player?._id, loadPlayerAttributes]);

  const handleRatingChange = (attributeName, value) => {
    setRatings(prev => ({
      ...prev,
      [attributeName]: value
    }));

    // Clear validation error for this attribute
    if (validationErrors[attributeName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[attributeName];
        return newErrors;
      });
    }
  };

  const handleSubAttributeChange = (attributeName, subAttributeValues) => {
    setSubAttributeRatings(prev => ({
      ...prev,
      [attributeName]: subAttributeValues
    }));

    // Calculate and update the main attribute value
    const calculatedMainValue = calculateMainAttributeFromSubs(subAttributeValues);
    if (calculatedMainValue !== null) {
      setRatings(prev => ({
        ...prev,
        [attributeName]: calculatedMainValue
      }));
    }

    // Clear validation error for this attribute
    if (validationErrors[attributeName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[attributeName];
        return newErrors;
      });
    }
  };

  const handleLevelChange = (attributeName, newLevel, newRating) => {
    setLevelData(prev => ({
      ...prev,
      [attributeName]: {
        ...prev[attributeName],
        level: newLevel,
        levelRating: newRating,
        leagueName: getLeagueLevels ? getLeagueLevels()[newLevel] : null
      }
    }));
  };

  const validateRatings = () => {
    const errors = {};
    let hasErrors = false;

    coreAttributes.forEach(attr => {
      const value = ratings[attr.name];
      if (value < 1 || value > 99 || !Number.isInteger(value)) {
        errors[attr.name] = 'Bewertung muss zwischen 1 und 99 liegen';
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSave = async () => {
    if (!validateRatings()) {
      return;
    }

    setSaveLoading(true);

    try {
      // Prepare ratings with sub-attributes
      const ratingsToSave = [];
      
      coreAttributes.forEach(attr => {
        const newMainValue = ratings[attr.name];
        const originalMainValue = originalRatings[attr.name];
        const newSubValues = subAttributeRatings[attr.name] || {};
        const originalSubValues = originalSubAttributeRatings[attr.name] || {};
        
        const hasMainValueChanged = newMainValue !== originalMainValue;
        const hasSubValuesChanged = JSON.stringify(newSubValues) !== JSON.stringify(originalSubValues);
        const attrLevelData = levelData[attr.name] || {};
        
        if (hasMainValueChanged || hasSubValuesChanged) {
          ratingsToSave.push({
            attributeName: attr.name,
            numericValue: newMainValue,
            subAttributes: newSubValues,
            level: attrLevelData.level,
            levelRating: attrLevelData.levelRating
          });
        }
      });

      if (ratingsToSave.length > 0) {
        // Convert to the format expected by saveUniversalPlayerRatings
        const ratingsObject = {};
        ratingsToSave.forEach(rating => {
          ratingsObject[rating.attributeName] = {
            value: rating.numericValue,
            subAttributes: rating.subAttributes,
            level: rating.level,
            levelRating: rating.levelRating
          };
        });
        
        await saveUniversalPlayerRatings(player._id, ratingsObject);
      }

      setOriginalRatings({ ...ratings });
      setOriginalSubAttributeRatings({ ...subAttributeRatings });
      setIsEditing(false);

      // Recalculate overall rating
      if (showOverallRating) {
        const overall = await calculateOverallRating(player._id);
        setOverallRating(overall?.overallRating || null);
      }

      onSave && onSave(ratings);

    } catch (error) {
      console.error('Error saving ratings:', error);
      alert('Fehler beim Speichern der Bewertungen. Bitte versuchen Sie es erneut.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setRatings({ ...originalRatings });
    setSubAttributeRatings({ ...originalSubAttributeRatings });
    setValidationErrors({});
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (compact) setExpanded(true);
  };

  if (!player) {
    return null;
  }

  return (
    <Card sx={{ mb: 2, boxShadow: compact ? 1 : 3 }}>
      {/* Header */}
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant={compact ? "subtitle1" : "h6"} fontWeight={600}>
              {player.name || `${player.firstName} ${player.lastName}`}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {showOverallRating && overallRating && (
                <RatingBadge 
                  value={overallRating} 
                  size={compact || isMobile ? 'small' : 'medium'}
                  showLabel={!isMobile}
                />
              )}
              {compact && (
                <IconButton
                  onClick={() => setExpanded(!expanded)}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Box>
          </Box>
        }
        subtitle={
          showOverallRating && overallRating && (
            <Typography variant="body2" color="textSecondary">
              Gesamtwertung: {overallRating}/99
            </Typography>
          )
        }
        action={
          editable && !isEditing && expanded ? (
            <IconButton onClick={handleEdit} color="primary">
              <EditIcon />
            </IconButton>
          ) : null
        }
        sx={{ pb: compact && !expanded ? 1 : 2 }}
      />

      {/* Content */}
      <Collapse in={expanded} timeout="auto">
        <CardContent sx={{ pt: 0 }}>
          {error && error.includes('neue Bewertungssystem') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Neues System wird bereitgestellt
              </Typography>
              <Typography variant="body2">
                {error} Die Seite wird nach der Bereitstellung automatisch funktionieren.
              </Typography>
            </Alert>
          )}
          
          {error && !error.includes('neue Bewertungssystem') && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Core Attributes with integrated Level display */}
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Kernbewertungen mit Liga-Stufen
              </Typography>

              <Box>
                {coreAttributes.map((attr) => {
                  // Get sub-attributes for this attribute
                  let subAttributes = attr.subAttributes;
                  if (attr.name === 'Positionsspezifisch' && player.position) {
                    subAttributes = getPositionSpecificSubAttributes(player.position);
                  }
                  
                  const calculatedMainValue = calculateMainAttributeFromSubs(subAttributeRatings[attr.name]);
                  const currentMainValue = ratings[attr.name];
                  const attributeLevelData = levelData[attr.name] || {};

                  return (
                    <SubAttributeGroup
                      key={attr.name}
                      attributeName={attr.name}
                      subAttributes={subAttributes}
                      subAttributeValues={subAttributeRatings[attr.name] || {}}
                      onSubAttributeChange={(subValues) => handleSubAttributeChange(attr.name, subValues)}
                      calculatedMainValue={calculatedMainValue}
                      description={`${attr.description} (Gewichtung: ${(attr.weight * 100).toFixed(0)}%)`}
                      disabled={!isEditing || saveLoading}
                      level={attributeLevelData.level || 0}
                      levelRating={attributeLevelData.levelRating || 0}
                      leagueName={attributeLevelData.leagueName}
                      nextLeague={attributeLevelData.nextLeague}
                      onLevelChange={isEditing ? (newLevel, newRating) => handleLevelChange(attr.name, newLevel, newRating) : null}
                    />
                  );
                })}
              </Box>

              {/* Action Buttons */}
              {editable && isEditing && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button
                      onClick={handleCancel}
                      color="secondary"
                      startIcon={<CancelIcon />}
                      disabled={saveLoading}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleSave}
                      variant="contained"
                      color="primary"
                      startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={saveLoading || Object.keys(validationErrors).length > 0}
                    >
                      {saveLoading ? 'Speichern...' : 'Speichern'}
                    </Button>
                  </Box>
                </>
              )}

              {/* Overall Rating Info */}
              {showOverallRating && !isEditing && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="textSecondary">
                      Die Gesamtwertung wird automatisch aus den gewichteten Einzelbewertungen berechnet
                    </Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

PlayerRatingCard.propTypes = {
  player: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    position: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func,
  editable: PropTypes.bool,
  showOverallRating: PropTypes.bool,
  compact: PropTypes.bool,
};

export default PlayerRatingCard;