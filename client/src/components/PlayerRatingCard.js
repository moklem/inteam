import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
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
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import { AttributeContext } from '../context/AttributeContext';
import RatingSlider from './RatingSlider';
import RatingBadge from './RatingBadge';

const PlayerRatingCard = ({ 
  player, 
  teamId, 
  onSave, 
  editable = true, 
  showOverallRating = true,
  compact = false 
}) => {
  const {
    getCoreAttributes,
    fetchPlayerAttributes,
    calculateOverallRating,
    updateAttribute,
    createAttribute,
    loading,
    error,
  } = useContext(AttributeContext);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [ratings, setRatings] = useState({});
  const [originalRatings, setOriginalRatings] = useState({});
  const [overallRating, setOverallRating] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const coreAttributes = getCoreAttributes();

  useEffect(() => {
    if (player?._id && teamId) {
      loadPlayerAttributes();
    }
  }, [player, teamId]);

  const loadPlayerAttributes = async () => {
    try {
      const attributes = await fetchPlayerAttributes(player._id, teamId);
      const ratingsMap = {};
      
      // Map existing attributes to ratings
      if (attributes) {
        attributes.forEach(attr => {
          if (attr.numericValue !== null && attr.numericValue !== undefined) {
            ratingsMap[attr.attributeName] = attr.numericValue;
          }
        });
      }

      // Initialize missing attributes with default values
      coreAttributes.forEach(attr => {
        if (!ratingsMap[attr.name]) {
          ratingsMap[attr.name] = 50; // Default rating
        }
      });

      setRatings(ratingsMap);
      setOriginalRatings({ ...ratingsMap });

      // Calculate overall rating
      if (showOverallRating) {
        const overall = await calculateOverallRating(player._id, teamId);
        setOverallRating(overall?.overallRating || null);
      }
    } catch (error) {
      console.error('Error loading player attributes:', error);
    }
  };

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
      const promises = coreAttributes.map(async (attr) => {
        const newValue = ratings[attr.name];
        const originalValue = originalRatings[attr.name];

        if (newValue !== originalValue) {
          // Check if attribute exists by trying to update first
          try {
            const existingAttributes = await fetchPlayerAttributes(player._id, teamId);
            const existingAttribute = existingAttributes?.find(
              a => a.attributeName === attr.name && a.team === teamId
            );

            if (existingAttribute) {
              // Update existing attribute
              return await updateAttribute(existingAttribute._id, {
                numericValue: newValue,
                notes: `Aktualisiert auf ${newValue} (1-99 Skala)`
              });
            } else {
              // Create new attribute
              return await createAttribute({
                player: player._id,
                team: teamId,
                attributeName: attr.name,
                category: 'Technical',
                numericValue: newValue,
                notes: `Erstbewertung: ${newValue} (1-99 Skala)`
              });
            }
          } catch (error) {
            console.error(`Error saving attribute ${attr.name}:`, error);
            throw error;
          }
        }
      });

      await Promise.all(promises);

      setOriginalRatings({ ...ratings });
      setIsEditing(false);

      // Recalculate overall rating
      if (showOverallRating) {
        const overall = await calculateOverallRating(player._id, teamId);
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
          {error && (
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
              {/* Core Attributes */}
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Kernbewertungen
              </Typography>

              <Grid container spacing={2}>
                {coreAttributes.map((attr) => (
                  <Grid 
                    item 
                    xs={12} 
                    sm={6} 
                    md={compact ? 6 : 4} 
                    key={attr.name}
                  >
                    <RatingSlider
                      value={ratings[attr.name] || 50}
                      onChange={(value) => handleRatingChange(attr.name, value)}
                      label={attr.name}
                      description={isEditing ? attr.description : undefined}
                      disabled={!isEditing || saveLoading}
                      showInput={isEditing}
                      showBadge={!isEditing}
                      error={validationErrors[attr.name]}
                      helperText={
                        isEditing ? `Gewichtung: ${(attr.weight * 100).toFixed(0)}%` : undefined
                      }
                    />
                  </Grid>
                ))}
              </Grid>

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
  }).isRequired,
  teamId: PropTypes.string.isRequired,
  onSave: PropTypes.func,
  editable: PropTypes.bool,
  showOverallRating: PropTypes.bool,
  compact: PropTypes.bool,
};

export default PlayerRatingCard;