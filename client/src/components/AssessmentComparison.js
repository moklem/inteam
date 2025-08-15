import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Info as InfoIcon,
  TrackChanges as TargetIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { AttributeContext } from '../context/AttributeContext';
import axios from 'axios';

const AssessmentComparison = () => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { 
    getCoreAttributes, 
    fetchUniversalPlayerRatings,
    getPositionSpecificSubAttributes,
    calculateMainAttributeFromSubs,
    getPositionSpecificWeights,
    getLeagueLevels,
    calculateOverallRating
  } = useContext(AttributeContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);
  const [suggestedFocusAreas, setSuggestedFocusAreas] = useState([]);
  const [coachFeedbacks, setCoachFeedbacks] = useState({});
  const [saving, setSaving] = useState(false);
  const [overallPlayerValue, setOverallPlayerValue] = useState(null);
  const [loadingOverall, setLoadingOverall] = useState(true);

  useEffect(() => {
    if (user?._id) {
      loadComparisonData();
      loadSavedFocusAreas();
      loadOverallRating();
    }
  }, [user?._id]);

  // Helper function to get attribute weight for overall rating calculation
  const getAttributeWeight = (attributeName, position) => {
    const weights = getPositionSpecificWeights(position);
    // Weights are in percentages (e.g., 12.5), convert to decimal
    return (weights[attributeName] || 12.5) / 100;
  };

  const loadOverallRating = async () => {
    try {
      setLoadingOverall(true);
      const token = localStorage.getItem('token');
      
      // Use the same API call as PlayerRatingCard
      // For Universal players, determine effective position
      let effectivePosition = user.position;
      if (user.position === 'Universal') {
        if (user.primaryPosition) {
          effectivePosition = user.primaryPosition;
        } else {
          // Try to determine from loaded comparison data if available
          if (comparisonData) {
            const positionSpecificData = comparisonData.find(d => d.attributeName === 'Positionsspezifisch');
            if (positionSpecificData && positionSpecificData.selfRating) {
              const positions = ['Zuspieler', 'Außen', 'Mitte', 'Dia', 'Libero'];
              for (const pos of positions) {
                const subAttrs = getPositionSpecificSubAttributes(pos);
                if (subAttrs && subAttrs.length > 0 && positionSpecificData.subAttributes) {
                  const hasSubData = subAttrs.some(subAttr => 
                    positionSpecificData.subAttributes[subAttr] !== null && 
                    positionSpecificData.subAttributes[subAttr] !== undefined
                  );
                  if (hasSubData) {
                    effectivePosition = pos;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/attributes/calculate-overall`,
        { 
          playerId: user._id,
          playerPosition: effectivePosition
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data?.overallRating) {
        setOverallPlayerValue(Math.round(response.data.overallRating));
      }
    } catch (err) {
      console.log('Could not load overall rating:', err);
      // Fallback to manual calculation will happen in loadComparisonData
    } finally {
      setLoadingOverall(false);
    }
  };

  const loadSavedFocusAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading focus areas for player:', user._id, 'season:', new Date().getFullYear());
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/focus-areas/${user._id}?season=${new Date().getFullYear()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Loaded focus areas response:', response.data);
      
      if (response.data.focusAreas && response.data.focusAreas.length > 0) {
        const savedAreas = response.data.focusAreas.map(area => 
          `${area.attribute}_${area.subAttribute}`
        );
        setSelectedFocusAreas(savedAreas);
        console.log('Set selected focus areas:', savedAreas);
      } else {
        console.log('No focus areas found in response');
      }
    } catch (err) {
      console.error('Error loading focus areas:', err.response?.data || err);
    }
  };

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player's universal ratings which include both coach and self-assessment
      const attributes = await fetchUniversalPlayerRatings(user._id);
      
      if (!attributes || attributes.length === 0) {
        setError('Keine Bewertungen gefunden. Bitte führen Sie zuerst eine Selbsteinschätzung durch.');
        setLoading(false);
        return;
      }

      const comparisonMap = {};
      const feedbacks = {};
      const allSubAttributeGaps = [];
      const leagues = getLeagueLevels();

      attributes.forEach(attr => {
        // Check if both self-assessment and coach rating exist
        const hasSelfAssessment = attr.selfRating !== null && attr.selfRating !== undefined;
        const hasCoachRating = attr.numericValue !== null && attr.numericValue !== undefined;

        if (hasSelfAssessment) {
          comparisonMap[attr.attributeName] = {
            selfRating: attr.selfRating,
            selfLevel: attr.selfLevel,
            selfLeagueName: leagues[attr.selfLevel]?.name || 'Kreisliga',
            coachRating: hasCoachRating ? attr.numericValue : null,
            coachLevel: hasCoachRating ? (attr.level !== null && attr.level !== undefined ? attr.level : attr.selfLevel) : null,
            coachLeagueName: hasCoachRating && attr.level !== null && attr.level !== undefined ? leagues[attr.level]?.name : null,
            subAttributes: {}
          };

          // Store coach feedback if it exists
          if (attr.coachFeedback) {
            feedbacks[attr.attributeName] = attr.coachFeedback;
          }

          // Process sub-attributes
          if (attr.subAttributes) {
            Object.entries(attr.subAttributes).forEach(([subAttrName, subValue]) => {
              // When coach hasn't rated yet, subAttributes contains self-assessment values
              // When coach has rated, subAttributes contains coach values
              let selfSubValue = null;
              let coachSubValue = null;
              
              if (hasCoachRating) {
                // Coach has rated - subAttributes contains coach values
                coachSubValue = subValue;
                // Try to get self-assessment sub-value from history or assume it equals main self rating
                selfSubValue = attr.selfRating; // Fallback to main rating if no detailed self-assessment
              } else {
                // Coach hasn't rated - subAttributes contains self-assessment values
                selfSubValue = subValue;
                coachSubValue = null;
              }

              comparisonMap[attr.attributeName].subAttributes[subAttrName] = {
                selfValue: selfSubValue,
                coachValue: coachSubValue
              };

              // Calculate potential impact on overall rating if this sub-attribute improves
              if (hasCoachRating && coachSubValue !== null) {
                // Calculate how much improvement is possible (max 99)
                const currentValue = coachSubValue;
                const maxPossibleImprovement = 99 - currentValue;
                
                // Get the weight of this attribute for overall rating calculation
                // Position-specific attributes might have different weights
                // Use the same effective position logic as above
                let weightEffectivePosition = user.position;
                if (user.position === 'Universal') {
                  if (user.primaryPosition) {
                    weightEffectivePosition = user.primaryPosition;
                  } else {
                    // Try to determine from position-specific data
                    const positionSpecificData = comparisonData.find(d => d.attributeName === 'Positionsspezifisch');
                    if (positionSpecificData && positionSpecificData.selfRating) {
                      const positions = ['Zuspieler', 'Außen', 'Mitte', 'Dia', 'Libero'];
                      for (const pos of positions) {
                        const subAttrs = getPositionSpecificSubAttributes(pos);
                        if (subAttrs && subAttrs.length > 0 && positionSpecificData.subAttributes) {
                          const hasSubData = subAttrs.some(subAttr => 
                            positionSpecificData.subAttributes[subAttr] !== null && 
                            positionSpecificData.subAttributes[subAttr] !== undefined
                          );
                          if (hasSubData) {
                            weightEffectivePosition = pos;
                            break;
                          }
                        }
                      }
                    }
                  }
                }
                const attributeWeight = getAttributeWeight(attr.attributeName, weightEffectivePosition);
                
                // Calculate impact: improvement potential * attribute weight
                // Higher impact = more overall rating improvement
                const impactScore = maxPossibleImprovement * attributeWeight;
                
                allSubAttributeGaps.push({
                  attribute: attr.attributeName,
                  subAttribute: subAttrName,
                  currentValue: currentValue,
                  maxImprovement: maxPossibleImprovement,
                  impactScore: impactScore,
                  weight: attributeWeight
                });
              }
            });
          }
        }
      });

      // Sort by impact score (higher impact = more overall rating improvement potential)
      allSubAttributeGaps.sort((a, b) => b.impactScore - a.impactScore);
      
      // Suggest top 3 sub-attributes that would improve overall rating the most
      const suggested = allSubAttributeGaps.slice(0, 3).map(item => 
        `${item.attribute}_${item.subAttribute}`
      );
      setSuggestedFocusAreas(suggested);
      
      // Only pre-select if we haven't loaded saved focus areas yet
      if (selectedFocusAreas.length === 0) {
        setSelectedFocusAreas(suggested);
      }

      setComparisonData(comparisonMap);
      setCoachFeedbacks(feedbacks);
      setLoading(false);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError('Fehler beim Laden der Vergleichsdaten. Bitte versuchen Sie es später erneut.');
      setLoading(false);
    }
  };

  const handleFocusAreaToggle = (attributeName, subAttributeName) => {
    const key = `${attributeName}_${subAttributeName}`;
    setSelectedFocusAreas(prev => {
      if (prev.includes(key)) {
        return prev.filter(item => item !== key);
      } else if (prev.length < 3) {
        return [...prev, key];
      } else {
        // Maximum 3 focus areas
        alert('Sie können maximal 3 Fokusbereiche auswählen.');
        return prev;
      }
    });
  };

  const saveFocusAreas = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Parse selected areas into structured format
      const focusAreas = selectedFocusAreas.map(key => {
        const [attribute, ...subAttrParts] = key.split('_');
        return {
          attribute,
          subAttribute: subAttrParts.join('_')
        };
      });

      console.log('Saving focus areas:', {
        playerId: user._id,
        focusAreas,
        season: new Date().getFullYear()
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/attributes/focus-areas`,
        { 
          playerId: user._id,
          focusAreas,
          season: new Date().getFullYear()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Focus areas save response:', response.data);
      alert('Fokusbereiche erfolgreich gespeichert!');
      setSaving(false);
      
      // Reload to confirm they were saved
      loadSavedFocusAreas();
    } catch (err) {
      console.error('Error saving focus areas:', err.response?.data || err);
      alert('Fehler beim Speichern der Fokusbereiche: ' + (err.response?.data?.message || err.message));
      setSaving(false);
    }
  };

  const getRatingDifference = (selfRating, coachRating) => {
    if (coachRating === null || selfRating === null) return null;
    return coachRating - selfRating;
  };

  const getDifferenceColor = (diff) => {
    if (diff === null) return 'default';
    if (diff > 0) return theme.palette.success.main; // Coach rated higher
    if (diff < 0) return theme.palette.error.main; // Self rated higher
    return theme.palette.text.secondary;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!comparisonData || Object.keys(comparisonData).length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Keine Vergleichsdaten verfügbar. Bitte führen Sie zuerst eine Selbsteinschätzung durch.
      </Alert>
    );
  }

  const coreAttributes = getCoreAttributes();
  const hasCoachRatings = Object.values(comparisonData).some(data => data.coachRating !== null);

  return (
    <Box>
      {/* Overall Player Value */}
      {overallPlayerValue !== null && (
        <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" color="primary">
                  Gesamtspielerwert
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Berechnet aus allen Trainerbewertungen
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h2" component="div" color="primary">
                  {Math.round(overallPlayerValue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  von 99
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="subtitle2" gutterBottom>
          Vergleich Ihrer Selbsteinschätzung mit der Trainerbewertung
        </Typography>
        <Typography variant="body2">
          Hier sehen Sie, wie Ihre Selbsteinschätzung im Vergleich zur Bewertung Ihres Trainers abschneidet.
          {hasCoachRatings 
            ? ' Wählen Sie bis zu 3 Detailbewertungen aus, auf die Sie sich in den nächsten 6 Wochen konzentrieren möchten.'
            : ' Sobald Ihr Trainer Sie bewertet hat, können Sie hier die Unterschiede sehen und Fokusbereiche auswählen.'}
        </Typography>
      </Alert>

      {/* Main Comparison Cards */}
      <Grid container spacing={2}>
        {coreAttributes.map(attr => {
          const data = comparisonData[attr.name];
          if (!data) return null;

          const diff = getRatingDifference(data.selfRating, data.coachRating);
          const levelDiff = data.coachLevel !== null && data.selfLevel !== null ? data.coachLevel - data.selfLevel : null;
          const hasLargeDifference = Math.abs(diff) >= 20 || Math.abs(levelDiff) >= 1;
          const feedback = coachFeedbacks[attr.name];

          // Get position-specific sub-attributes if needed
          let subAttributes = attr.subAttributes;
          // For Universal players, determine effective position
          let effectivePosition = user.position;
          if (user.position === 'Universal') {
            if (user.primaryPosition) {
              effectivePosition = user.primaryPosition;
            } else {
              // Check if they have position-specific self-assessment data
              const positionSpecificData = comparisonData.find(d => d.attributeName === 'Positionsspezifisch');
              if (positionSpecificData && positionSpecificData.selfRating) {
                // Try to determine position from existing sub-attribute data
                const positions = ['Zuspieler', 'Außen', 'Mitte', 'Dia', 'Libero'];
                for (const pos of positions) {
                  const subAttrs = getPositionSpecificSubAttributes(pos);
                  if (subAttrs && subAttrs.length > 0) {
                    // Check if we have sub-attributes for this position
                    const hasSubData = positionSpecificData.subAttributes && 
                      subAttrs.some(subAttr => 
                        positionSpecificData.subAttributes[subAttr] !== null && 
                        positionSpecificData.subAttributes[subAttr] !== undefined
                      );
                    if (hasSubData) {
                      effectivePosition = pos;
                      break;
                    }
                  }
                }
              }
            }
          }
          
          if (attr.name === 'Positionsspezifisch' && effectivePosition && effectivePosition !== 'Universal') {
            subAttributes = getPositionSpecificSubAttributes(effectivePosition);
          }
          
          // Skip position-specific attribute for Universal players without any position data
          if (attr.name === 'Positionsspezifisch' && effectivePosition === 'Universal') {
            return null;
          }

          return (
            <Grid item xs={12} key={attr.name}>
              <Card variant="outlined">
                <CardContent>
                  {/* Attribute Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="div">
                      {attr.name === 'Positionsspezifisch' && effectivePosition && effectivePosition !== 'Universal' 
                        ? (user.position === 'Universal' ? 
                            (user.primaryPosition ? `${effectivePosition} (Primäre Position)` : `${effectivePosition} (Aus Selbsteinschätzung)`)
                            : effectivePosition)
                        : attr.name}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Tooltip title={`Liga: ${data.selfLeagueName}`}>
                        <Chip 
                          label={`Selbst: ${data.selfLeagueName} ${data.selfRating || '-'}`}
                          color="primary"
                          variant="outlined"
                        />
                      </Tooltip>
                      {data.coachRating !== null && (
                        <Tooltip title={`Liga: ${data.coachLeagueName || data.selfLeagueName}`}>
                          <Chip 
                            label={`Trainer: ${data.coachLeagueName || data.selfLeagueName} ${data.coachRating}`}
                            color="secondary"
                          />
                        </Tooltip>
                      )}
                      {diff !== null && (
                        <Chip 
                          icon={diff > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                          label={`${diff > 0 ? '+' : ''}${diff} Punkte`}
                          style={{ color: getDifferenceColor(diff) }}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {levelDiff !== null && levelDiff !== 0 && (
                        <Chip 
                          label={`${levelDiff > 0 ? '+' : ''}${levelDiff} Level`}
                          style={{ 
                            backgroundColor: Math.abs(levelDiff) >= 1 ? theme.palette.warning.light : theme.palette.grey[200],
                            color: Math.abs(levelDiff) >= 1 ? theme.palette.warning.contrastText : theme.palette.text.primary
                          }}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Coach Feedback if large difference */}
                  {hasLargeDifference && feedback && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Trainer-Feedback 
                        {levelDiff !== null && Math.abs(levelDiff) >= 1 && 
                          ` (${Math.abs(levelDiff)} Level-Unterschied)`}
                        {diff !== null && Math.abs(diff) >= 20 && 
                          ` (${Math.abs(diff)} Punkte Unterschied)`}:
                      </Typography>
                      <Typography variant="body2">
                        {feedback}
                      </Typography>
                    </Alert>
                  )}

                  {/* Sub-attributes */}
                  {subAttributes && subAttributes.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Detailbewertungen:
                      </Typography>
                      <List dense>
                        {subAttributes.map(subAttrName => {
                          const subData = data.subAttributes[subAttrName];
                          if (!subData) return null;

                          const subDiff = getRatingDifference(subData.selfValue, subData.coachValue);
                          const focusKey = `${attr.name}_${subAttrName}`;
                          const isSelected = selectedFocusAreas.includes(focusKey);
                          const isSuggested = suggestedFocusAreas.includes(focusKey);

                          return (
                            <ListItem key={subAttrName}>
                              {hasCoachRatings && (
                                <ListItemIcon>
                                  <Checkbox
                                    edge="start"
                                    checked={isSelected}
                                    onChange={() => handleFocusAreaToggle(attr.name, subAttrName)}
                                    disabled={!isSelected && selectedFocusAreas.length >= 3}
                                  />
                                </ListItemIcon>
                              )}
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2">
                                      {subAttrName}
                                    </Typography>
                                    {isSuggested && (
                                      <Tooltip title="Empfohlen: Hohe Auswirkung auf Gesamtwertung">
                                        <StarIcon color="warning" fontSize="small" />
                                      </Tooltip>
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Box display="flex" gap={1} mt={0.5}>
                                    <Chip 
                                      size="small"
                                      label={`S: ${subData.selfValue || '-'}`}
                                      variant="outlined"
                                    />
                                    {subData.coachValue !== null && (
                                      <>
                                        <Chip 
                                          size="small"
                                          label={`T: ${subData.coachValue}`}
                                        />
                                        {subDiff !== null && (
                                          <Chip 
                                            size="small"
                                            label={`${subDiff > 0 ? '+' : ''}${subDiff}`}
                                            style={{ 
                                              color: getDifferenceColor(subDiff),
                                              borderColor: getDifferenceColor(subDiff) 
                                            }}
                                            variant="outlined"
                                          />
                                        )}
                                      </>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Focus Areas Section */}
      {hasCoachRatings && (
        <Paper sx={{ mt: 3, p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TargetIcon color="primary" />
            <Typography variant="h6">
              Ihre Fokusbereiche für die nächsten 6 Wochen
            </Typography>
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Wichtig:</strong> Um die Fokusbereiche zu aktivieren, müssen Sie diese zum ersten Mal speichern. 
              Die vorgeschlagenen Bereiche basieren darauf, welche Verbesserungen die größte Auswirkung auf Ihre Gesamtwertung haben.
              Nach jedem Training erhalten Sie sofortiges Feedback zu diesen Bereichen.
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Wählen Sie bis zu 3 Detailbewertungen aus, auf die Sie sich konzentrieren möchten. 
            Die mit einem Stern markierten Bereiche haben die größte Auswirkung auf Ihre Gesamtwertung 
            und bieten das höchste Verbesserungspotenzial.
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="subtitle2">
              Ausgewählt: {selectedFocusAreas.length}/3
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={saveFocusAreas}
            disabled={selectedFocusAreas.length === 0 || saving}
            startIcon={<FitnessCenterIcon />}
          >
            {saving ? 'Speichern...' : 'Fokusbereiche speichern'}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default AssessmentComparison;