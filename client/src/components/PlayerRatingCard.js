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
  TextField,
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
  compact = false,
  showSelfAssessment = false 
}) => {
  const {
    getCoreAttributes,
    fetchUniversalPlayerRatings,
    saveUniversalPlayerRatings,
    calculateOverallRating,
    getPositionSpecificSubAttributes,
    getPositionSpecificWeights,
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
  const [originalLevelData, setOriginalLevelData] = useState({});
  const [overallLevelData, setOverallLevelData] = useState(null);
  const [selfAssessments, setSelfAssessments] = useState({});
  const [feedbackRequired, setFeedbackRequired] = useState({});
  const [coachFeedbacks, setCoachFeedbacks] = useState({});

  // Create a stable reference for position-specific assessment data to avoid infinite loops
  const positionSpecificData = useMemo(() => {
    // For coach rating view, check loaded selfAssessments
    if (!showSelfAssessment && selfAssessments['Positionsspezifisch']) {
      return selfAssessments['Positionsspezifisch'];
    }
    // For self-assessment view, use player props data
    if (showSelfAssessment && player?.selfSubAssessmentData) {
      return { subAttributes: player.selfSubAssessmentData['Positionsspezifisch'] };
    }
    return null;
  }, [showSelfAssessment, selfAssessments, player?.selfSubAssessmentData]);

  // Determine effective position for Universal players - memoized to prevent infinite loops
  const effectivePosition = useMemo(() => {
    if (player?.position !== 'Universal') {
      return player?.position;
    }
    
    // First, try to use their saved primaryPosition
    if (player?.primaryPosition) {
      return player.primaryPosition;
    }
    
    // Fallback: Check if they have position-specific self-assessment data
    if (positionSpecificData && positionSpecificData.subAttributes) {
      // Try to determine position from existing sub-attribute data
      const positions = ['Zuspieler', 'Außen', 'Mitte', 'Dia', 'Libero'];
      for (const pos of positions) {
        const subAttrs = getPositionSpecificSubAttributes(pos);
        if (subAttrs && subAttrs.length > 0) {
          // Check if this position's sub-attributes have data
          const hasSubData = subAttrs.some(subAttr => 
            positionSpecificData.subAttributes[subAttr] !== null && 
            positionSpecificData.subAttributes[subAttr] !== undefined
          );
          if (hasSubData) {
            return pos;
          }
        }
      }
    }
    
    return 'Universal'; // No position data found
  }, [player?.position, player?.primaryPosition, positionSpecificData, getPositionSpecificSubAttributes, showSelfAssessment]);

  const coreAttributes = useMemo(() => {
    const attrs = getCoreAttributes();
    // Use the memoized effective position for weight calculations
    const weights = getPositionSpecificWeights(effectivePosition);
    
    // Add weights to each attribute (convert from percentage to decimal)
    return attrs.map(attr => ({
      ...attr,
      weight: (weights[attr.name] || 12.5) / 100 // Convert percentage to decimal
    }));
  }, [getCoreAttributes, getPositionSpecificWeights, effectivePosition]);

  const loadPlayerAttributes = useCallback(async () => {
    try {
      // If showing self-assessment data, use the data passed from parent
      if (showSelfAssessment && player.selfAssessmentData) {
        const ratingsMap = {};
        const subRatingsMap = {};
        const levelMap = {};
        const leagues = getLeagueLevels();
        
        // Use self-assessment data instead of coach ratings
        Object.entries(player.selfAssessmentData).forEach(([attrName, assessment]) => {
          // Make sure we have valid assessment data
          if (assessment && typeof assessment === 'object') {
            ratingsMap[attrName] = assessment.selfRating || 1;
            levelMap[attrName] = {
              level: assessment.selfLevel || 0,
              levelRating: assessment.selfRating || 1,
              leagueName: leagues[assessment.selfLevel || 0]?.name,
              progressToNextLevel: assessment.selfRating || 1
            };
          }
        });
        
        // Add sub-assessment data
        if (player.selfSubAssessmentData) {
          Object.entries(player.selfSubAssessmentData).forEach(([attrName, subData]) => {
            subRatingsMap[attrName] = subData || {};
          });
        }
        
        // Initialize missing attributes - keep them as null to show they weren't assessed
        coreAttributes.forEach(attr => {
          if (ratingsMap[attr.name] === undefined) {
            ratingsMap[attr.name] = null; // Keep as null to indicate not assessed
          }
          if (!subRatingsMap[attr.name]) {
            subRatingsMap[attr.name] = {};
          }
          // Only create level data if the attribute was assessed
          if (!levelMap[attr.name] && ratingsMap[attr.name] !== null) {
            levelMap[attr.name] = {
              level: 0,
              levelRating: ratingsMap[attr.name] || 1,
              leagueName: leagues[0]?.name,
              progressToNextLevel: ratingsMap[attr.name] || 1
            };
          }
        });
        
        setRatings(ratingsMap);
        setSubAttributeRatings(subRatingsMap);
        setOriginalRatings({ ...ratingsMap });
        setOriginalSubAttributeRatings({ ...subRatingsMap });
        setLevelData(levelMap);
        setOriginalLevelData({ ...levelMap });
        
        // Don't calculate overall rating for self-assessment view
        setOverallRating(null);
        return;
      }
      
      // Original code for coach ratings
      const attributes = await fetchUniversalPlayerRatings(player._id);
      const ratingsMap = {};
      const subRatingsMap = {};
      
      // Map existing attributes to ratings and self-assessments
      const selfAssessmentMap = {};
      let hasAnyCoachRatings = false;
      let initializedFromSelfAssessment = false;
      
      if (attributes) {
        attributes.forEach(attr => {
          // Check if coach has rated this attribute
          if (attr.numericValue !== null && attr.numericValue !== undefined) {
            ratingsMap[attr.attributeName] = attr.numericValue;
            hasAnyCoachRatings = true;
          }
          if (attr.subAttributes && Object.keys(attr.subAttributes).length > 0) {
            subRatingsMap[attr.attributeName] = attr.subAttributes;
            hasAnyCoachRatings = true;
          }
          // Store self-assessment data
          if (attr.selfLevel !== null && attr.selfLevel !== undefined) {
            selfAssessmentMap[attr.attributeName] = {
              selfLevel: attr.selfLevel,
              selfRating: attr.selfRating,
              selfAssessmentDate: attr.selfAssessmentDate,
              selfAssessmentSeason: attr.selfAssessmentSeason,
              // The sub-attributes from self-assessment are also stored in subAttributes
              // We need to extract them when the player did self-assessment but coach hasn't rated
              subAttributes: (!attr.numericValue && attr.subAttributes) ? attr.subAttributes : {}
            };
          }
        });
        setSelfAssessments(selfAssessmentMap);
      }

      // If coach hasn't rated yet but player has self-assessment, initialize from self-assessment
      if (!hasAnyCoachRatings && Object.keys(selfAssessmentMap).length > 0) {
        
        // Initialize ratings from self-assessment
        Object.entries(selfAssessmentMap).forEach(([attrName, assessment]) => {
          if (assessment.selfRating !== null && assessment.selfRating !== undefined) {
            ratingsMap[attrName] = assessment.selfRating;
          }
          if (assessment.subAttributes && Object.keys(assessment.subAttributes).length > 0) {
            subRatingsMap[attrName] = assessment.subAttributes;
          }
        });
        
        // Also initialize level data from self-assessment
        const levelMap = {};
        const leagues = getLeagueLevels();
        Object.entries(selfAssessmentMap).forEach(([attrName, assessment]) => {
          if (assessment.selfLevel !== null && assessment.selfLevel !== undefined) {
            levelMap[attrName] = {
              level: assessment.selfLevel,
              levelRating: assessment.selfRating || 1,
              leagueName: leagues[assessment.selfLevel]?.name,
              nextLeague: assessment.selfLevel < 7 ? leagues[assessment.selfLevel + 1]?.name : null
            };
          }
        });
        setLevelData(levelMap);
        setOriginalLevelData({ ...levelMap });
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
      if (showOverallRating && !showSelfAssessment) {
        // Use the memoized effective position
        const overall = await calculateOverallRating(player._id, effectivePosition);
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
              // In our system, levelRating should always equal numericValue
              // Use the numericValue from ratingsMap as the authoritative source
              const actualRating = ratingsMap[attr.attributeName] || attr.numericValue || attr.levelRating || 1;
              levelMap[attr.attributeName] = {
                level: attr.level || 0,
                levelRating: actualRating,  // Use actual rating, not potentially stale levelRating
                leagueName: attr.leagueName,
                nextLeague: attr.nextLeague,
                progressToNextLevel: actualRating  // Progress is the actual rating (1-99)
              };
            });
          }
          setLevelData(levelMap);
        setOriginalLevelData({ ...levelMap });
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
  }, [player?._id, player?.selfAssessmentData, player?.selfSubAssessmentData, showSelfAssessment, fetchUniversalPlayerRatings, calculateOverallRating, showOverallRating, coreAttributes, fetchLevelProgress, getLeagueLevels, effectivePosition]);

  useEffect(() => {
    if (player?._id) {
      loadPlayerAttributes();
    }
  }, [player?._id, loadPlayerAttributes]);

  const handleRatingChange = (attributeName, value) => {
    // Check if feedback is required based on self-assessment
    // Only require feedback when player OVERESTIMATED themselves (coach rating is lower)
    const selfAssessment = selfAssessments[attributeName];
    if (selfAssessment && selfAssessment.selfRating !== null && selfAssessment.selfRating !== undefined) {
      const ratingDiff = selfAssessment.selfRating - value; // Positive if player overestimated
      const currentLevel = levelData[attributeName]?.level || 0;
      const levelDiff = selfAssessment.selfLevel - currentLevel; // Positive if player overestimated level
      
      // Only require feedback if player overestimated themselves
      if ((levelDiff >= 1) || (ratingDiff >= 20)) {
        setFeedbackRequired(prev => ({
          ...prev,
          [attributeName]: {
            levelDiff,
            ratingDiff,
            newLevel: currentLevel,
            newRating: value,
            selfLevel: selfAssessment.selfLevel,
            selfRating: selfAssessment.selfRating,
            required: true
          }
        }));
        // Don't show dialog anymore - feedback field will appear inline
        // Still allow the rating to be updated
      } else {
        // Clear feedback requirement if player no longer overestimated
        setFeedbackRequired(prev => {
          const { [attributeName]: removed, ...rest } = prev;
          return rest;
        });
      }
    }
    
    setRatings(prev => ({
      ...prev,
      [attributeName]: value
    }));
    
    // Also update levelRating to match the new value
    // In our system, levelRating always equals numericValue (1-99)
    setLevelData(prev => ({
      ...prev,
      [attributeName]: {
        ...prev[attributeName],
        levelRating: value
      }
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
    // Check if any sub-attribute requires feedback based on self-assessment
    // Only require feedback when player OVERESTIMATED themselves
    const selfAssessment = selfAssessments[attributeName];
    if (selfAssessment && selfAssessment.subAttributes) {
      // Check each sub-attribute for significant changes
      for (const [subAttrName, newValue] of Object.entries(subAttributeValues)) {
        const selfSubValue = selfAssessment.subAttributes[subAttrName];
        if (selfSubValue !== null && selfSubValue !== undefined && newValue !== null && newValue !== undefined) {
          const ratingDiff = selfSubValue - newValue; // Positive if player overestimated
          
          // Only require feedback if player overestimated by 20+ points
          if (ratingDiff >= 20) {
            setFeedbackRequired(prev => ({
              ...prev,
              [attributeName]: {
                ...prev[attributeName],
                subAttributes: {
                  ...prev[attributeName]?.subAttributes,
                  [subAttrName]: {
                    ratingDiff,
                    newRating: newValue,
                    selfRating: selfSubValue,
                    required: true
                  }
                }
              }
            }));
            // Don't show dialog anymore - feedback field will appear inline
          } else {
            // Clear feedback requirement for this sub-attribute if no longer overestimated
            setFeedbackRequired(prev => {
              const newState = { ...prev };
              if (newState[attributeName]?.subAttributes?.[subAttrName]) {
                delete newState[attributeName].subAttributes[subAttrName];
                // If no sub-attributes require feedback, clean up
                if (Object.keys(newState[attributeName].subAttributes).length === 0) {
                  delete newState[attributeName].subAttributes;
                }
                // If nothing requires feedback for this attribute, remove it entirely
                if (!newState[attributeName].required && (!newState[attributeName].subAttributes || Object.keys(newState[attributeName].subAttributes).length === 0)) {
                  delete newState[attributeName];
                }
              }
              return newState;
            });
          }
        }
      }
    }
    
    // Update sub-attributes
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
      
      // Also update levelRating to match the new numericValue
      // In our system, levelRating always equals numericValue (1-99)
      setLevelData(prev => ({
        ...prev,
        [attributeName]: {
          ...prev[attributeName],
          levelRating: calculatedMainValue
        }
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
    // Check if feedback is required based on self-assessment
    // Only require feedback when player OVERESTIMATED themselves
    const selfAssessment = selfAssessments[attributeName];
    if (selfAssessment) {
      const levelDiff = selfAssessment.selfLevel - newLevel; // Positive if player overestimated level
      const ratingDiff = selfAssessment.selfRating - newRating; // Positive if player overestimated rating
      
      // Only require feedback if player overestimated themselves
      if (levelDiff >= 1 || ratingDiff >= 20) {
        setFeedbackRequired(prev => ({
          ...prev,
          [attributeName]: {
            levelDiff,
            ratingDiff,
            newLevel,
            newRating,
            selfLevel: selfAssessment.selfLevel,
            selfRating: selfAssessment.selfRating,
            required: true
          }
        }));
        // Don't show dialog anymore - feedback field will appear inline
      } else {
        // Clear feedback requirement if player no longer overestimated
        setFeedbackRequired(prev => {
          const { [attributeName]: removed, ...rest } = prev;
          return rest;
        });
      }
    }
    
    // When level changes manually, keep the same rating value
    // The rating should only change through attribute/sub-attribute changes
    const currentRating = ratings[attributeName] || newRating;
    
    setLevelData(prev => ({
      ...prev,
      [attributeName]: {
        ...prev[attributeName],
        level: newLevel,
        levelRating: currentRating, // Keep current rating
        leagueName: getLeagueLevels ? getLeagueLevels()[newLevel]?.name : null
      }
    }));
    
    // Also update the ratings to ensure consistency
    setRatings(prev => ({
      ...prev,
      [attributeName]: currentRating
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
        
        // Check if level data has changed by comparing with original level data
        const originalLevelInfo = originalLevelData[attr.name] || {};
        const hasLevelChanged = (attrLevelData.level !== originalLevelInfo.level) || 
                               (attrLevelData.levelRating !== originalLevelInfo.levelRating);
        
        // Debug logging to understand what's happening
        console.log(`Checking ${attr.name}:`, {
          newMainValue,
          originalMainValue,
          hasMainValueChanged,
          hasSubValuesChanged,
          hasLevelChanged,
          hasFeedback: !!coachFeedbacks[attr.name],
          currentLevelData: attrLevelData,
          originalLevelData: originalLevelInfo,
          newSubValues,
          originalSubValues
        });
        
        // Include attribute if it has a value (not null/undefined) to ensure it gets saved
        if (newMainValue !== null && newMainValue !== undefined && 
            (hasMainValueChanged || hasSubValuesChanged || hasLevelChanged || coachFeedbacks[attr.name])) {
          ratingsToSave.push({
            attributeName: attr.name,
            numericValue: newMainValue,
            subAttributes: newSubValues,
            level: attrLevelData.level,
            levelRating: attrLevelData.levelRating,
            coachFeedback: coachFeedbacks[attr.name] || null
          });
        }
      });

      console.log('Ratings to save:', ratingsToSave);

      if (ratingsToSave.length > 0) {
        // Convert to the format expected by saveUniversalPlayerRatings
        const ratingsObject = {};
        ratingsToSave.forEach(rating => {
          ratingsObject[rating.attributeName] = {
            value: rating.numericValue,
            subAttributes: rating.subAttributes,
            level: rating.level,
            levelRating: rating.levelRating,
            coachFeedback: rating.coachFeedback
          };
        });
        
        console.log('Sending to server:', { playerId: player._id, ratingsObject });
        await saveUniversalPlayerRatings(player._id, ratingsObject);
        console.log('Player ratings saved successfully');
      } else {
        console.log('No ratings to save - no changes detected');
      }

      setOriginalRatings({ ...ratings });
      setOriginalSubAttributeRatings({ ...subAttributeRatings });
      setOriginalLevelData({ ...levelData });
      setIsEditing(false);
      setCoachFeedbacks({});

      // Recalculate overall rating
      if (showOverallRating) {
        // Use the memoized effective position
        const overall = await calculateOverallRating(player._id, effectivePosition);
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
    setLevelData({ ...originalLevelData });
    setValidationErrors({});
    setIsEditing(false);
    setCoachFeedbacks({});
    setFeedbackRequired({});
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

          {/* Info block about self-assessment - always show for coaches */}
          {editable && Object.keys(selfAssessments).length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Hinweis zur Bewertung
              </Typography>
              <Typography variant="body2">
                Wenn Sie noch keine Bewertung für einen Spieler gesetzt haben, werden die Selbsteinschätzungen des Spielers 
                als Standardwerte für die Detailbewertungen übernommen. Sie können diese Werte anpassen und speichern, 
                um Ihre eigene Bewertung zu erstellen.
              </Typography>
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
                  // Use the memoized effective position
                  
                  if (attr.name === 'Positionsspezifisch' && effectivePosition && effectivePosition !== 'Universal') {
                    subAttributes = getPositionSpecificSubAttributes(effectivePosition);
                  }
                  
                  // Use position name instead of "Positionsspezifisch"
                  // For Universal players, show their primary position if available
                  let displayName = attr.name;
                  if (attr.name === 'Positionsspezifisch' && effectivePosition && effectivePosition !== 'Universal') {
                    if (player.position === 'Universal') {
                      if (player.primaryPosition) {
                        displayName = `${effectivePosition} (Primäre Position)`;
                      } else {
                        displayName = `${effectivePosition} (Aus Selbsteinschätzung)`;
                      }
                    } else {
                      displayName = effectivePosition;
                    }
                  }
                  
                  const calculatedMainValue = calculateMainAttributeFromSubs(subAttributeRatings[attr.name]);
                  const currentMainValue = ratings[attr.name];
                  const attributeLevelData = levelData[attr.name] || {};
                  const selfAssessment = selfAssessments[attr.name];
                  
                  // Skip attributes that weren't assessed in self-assessment view
                  if (showSelfAssessment && currentMainValue === null) {
                    return null;
                  }
                  
                  // For Universal players without any position data, show message for position-specific attribute
                  if (attr.name === 'Positionsspezifisch' && player.position === 'Universal' && effectivePosition === 'Universal') {
                    return (
                      <Box key={attr.name} sx={{ mb: 2 }}>
                        <Alert severity="info">
                          <Typography variant="subtitle2" gutterBottom>
                            Positionsspezifische Bewertung
                          </Typography>
                          <Typography variant="body2">
                            Dieser Spieler ist als Universal-Spieler eingetragen, hat aber noch keine primäre Position ausgewählt. 
                            Bitten Sie den Spieler, eine Selbsteinschätzung durchzuführen, um seine primäre Position festzulegen.
                          </Typography>
                        </Alert>
                      </Box>
                    );
                  }

                  // Prepare self-assessment data with league info
                  const selfAssessmentWithLeague = selfAssessment ? {
                    ...selfAssessment,
                    leagueName: getLeagueLevels()[selfAssessment.selfLevel]?.name,
                    leagueColor: getLeagueLevels()[selfAssessment.selfLevel]?.color
                  } : null;

                  return (
                    <Box key={attr.name}>
                      <SubAttributeGroup
                        attributeName={displayName}
                        subAttributes={subAttributes}
                        subAttributeValues={subAttributeRatings[attr.name] || {}}
                        onSubAttributeChange={(subValues) => handleSubAttributeChange(attr.name, subValues)}
                        calculatedMainValue={showSelfAssessment ? currentMainValue : calculatedMainValue}
                        description={`${attr.description}${!showSelfAssessment ? ` (Gewichtung: ${(attr.weight * 100).toFixed(0)}%)` : ''}`}
                        disabled={!isEditing || saveLoading}
                        level={attributeLevelData.level !== undefined ? attributeLevelData.level : (selfAssessment?.selfLevel || 0)}
                        levelRating={attributeLevelData.levelRating || currentMainValue || selfAssessment?.selfRating || 0}
                        leagueName={attributeLevelData.leagueName}
                        nextLeague={attributeLevelData.nextLeague}
                        onLevelChange={isEditing ? (newLevel, newRating) => handleLevelChange(attr.name, newLevel, newRating) : null}
                        showLevelSelector={isEditing}
                        selfAssessmentData={!showSelfAssessment ? selfAssessmentWithLeague : null}
                        coachLevel={!showSelfAssessment && attributeLevelData.level !== undefined ? attributeLevelData.level : null}
                        coachRating={!showSelfAssessment && (attributeLevelData.levelRating || currentMainValue) ? (attributeLevelData.levelRating || currentMainValue) : null}
                        coachLeagueName={!showSelfAssessment && attributeLevelData.leagueName ? attributeLevelData.leagueName : null}
                      />
                      
                      {/* Inline Feedback Field - only show when player overestimated and coach is editing */}
                      {isEditing && !showSelfAssessment && feedbackRequired[attr.name]?.required && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                            <strong>Feedback erforderlich</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Der Spieler hat sich in &ldquo;{displayName}&rdquo; überschätzt 
                            (Selbstbewertung: {feedbackRequired[attr.name]?.selfRating}, 
                            Trainer-Bewertung: {feedbackRequired[attr.name]?.newRating}). 
                            Bitte erklären Sie den Unterschied:
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            size="small"
                            placeholder="Erklären Sie, warum die Bewertung niedriger ist als die Selbsteinschätzung des Spielers..."
                            value={coachFeedbacks[attr.name] || ''}
                            onChange={(e) => setCoachFeedbacks(prev => ({
                              ...prev,
                              [attr.name]: e.target.value
                            }))}
                            variant="outlined"
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                bgcolor: 'background.paper'
                              }
                            }}
                          />
                        </Box>
                      )}

                      {/* Sub-attribute feedback fields */}
                      {isEditing && !showSelfAssessment && feedbackRequired[attr.name]?.subAttributes && 
                        Object.entries(feedbackRequired[attr.name].subAttributes).map(([subAttrName, subFeedback]) => (
                          subFeedback.required && (
                            <Box key={subAttrName} sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                              <Typography variant="subtitle2" color="info.dark" gutterBottom>
                                <strong>Feedback für {subAttrName} erforderlich</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Der Spieler hat sich in &ldquo;{subAttrName}&rdquo; überschätzt 
                                (Selbstbewertung: {subFeedback.selfRating}, 
                                Trainer-Bewertung: {subFeedback.newRating}). 
                                Bitte erklären Sie den Unterschied:
                              </Typography>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                placeholder="Erklären Sie, warum die Bewertung niedriger ist..."
                                value={coachFeedbacks[`${attr.name}_${subAttrName}`] || ''}
                                onChange={(e) => setCoachFeedbacks(prev => ({
                                  ...prev,
                                  [`${attr.name}_${subAttrName}`]: e.target.value
                                }))}
                                variant="outlined"
                                sx={{ 
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper'
                                  }
                                }}
                              />
                            </Box>
                          )
                        ))
                      }
                    </Box>
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
    primaryPosition: PropTypes.string,
    selfAssessmentData: PropTypes.object,
    selfSubAssessmentData: PropTypes.object,
  }).isRequired,
  onSave: PropTypes.func,
  editable: PropTypes.bool,
  showOverallRating: PropTypes.bool,
  compact: PropTypes.bool,
  showSelfAssessment: PropTypes.bool,
};

export default PlayerRatingCard;