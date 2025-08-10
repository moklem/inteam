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
    getPositionSpecificWeights
  } = useContext(AttributeContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);
  const [suggestedFocusAreas, setSuggestedFocusAreas] = useState([]);
  const [coachFeedbacks, setCoachFeedbacks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?._id) {
      loadComparisonData();
      loadSavedFocusAreas();
    }
  }, [user?._id]);

  // Helper function to get attribute weight for overall rating calculation
  const getAttributeWeight = (attributeName, position) => {
    const weights = getPositionSpecificWeights(position);
    // Weights are in percentages (e.g., 12.5), convert to decimal
    return (weights[attributeName] || 12.5) / 100;
  };

  const loadSavedFocusAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/focus-areas/${user._id}?season=${new Date().getFullYear()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.focusAreas && response.data.focusAreas.length > 0) {
        const savedAreas = response.data.focusAreas.map(area => 
          `${area.attribute}_${area.subAttribute}`
        );
        setSelectedFocusAreas(savedAreas);
      }
    } catch (err) {
      console.log('No saved focus areas found or error loading them');
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

      attributes.forEach(attr => {
        // Check if both self-assessment and coach rating exist
        const hasSelfAssessment = attr.selfRating !== null && attr.selfRating !== undefined;
        const hasCoachRating = attr.numericValue !== null && attr.numericValue !== undefined;

        if (hasSelfAssessment) {
          comparisonMap[attr.attributeName] = {
            selfRating: attr.selfRating,
            selfLevel: attr.selfLevel,
            coachRating: hasCoachRating ? attr.numericValue : null,
            coachLevel: hasCoachRating ? attr.level : null,
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
                const attributeWeight = getAttributeWeight(attr.attributeName, user.position);
                
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

      await axios.post(
        `${process.env.REACT_APP_API_URL}/attributes/focus-areas`,
        { 
          playerId: user._id,
          focusAreas,
          season: new Date().getFullYear()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Fokusbereiche erfolgreich gespeichert!');
      setSaving(false);
    } catch (err) {
      console.error('Error saving focus areas:', err);
      alert('Fehler beim Speichern der Fokusbereiche.');
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
          const hasLargeDifference = Math.abs(diff) >= 20;
          const feedback = coachFeedbacks[attr.name];

          // Get position-specific sub-attributes if needed
          let subAttributes = attr.subAttributes;
          if (attr.name === 'Positionsspezifisch' && user.position && user.position !== 'Universal') {
            subAttributes = getPositionSpecificSubAttributes(user.position);
          }

          return (
            <Grid item xs={12} key={attr.name}>
              <Card variant="outlined">
                <CardContent>
                  {/* Attribute Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="div">
                      {attr.name === 'Positionsspezifisch' && user.position !== 'Universal' 
                        ? user.position 
                        : attr.name}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={`Selbst: ${data.selfRating || '-'}`}
                        color="primary"
                        variant="outlined"
                      />
                      {data.coachRating !== null && (
                        <Chip 
                          label={`Trainer: ${data.coachRating}`}
                          color="secondary"
                        />
                      )}
                      {diff !== null && (
                        <Chip 
                          icon={diff > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                          label={`${diff > 0 ? '+' : ''}${diff}`}
                          style={{ color: getDifferenceColor(diff) }}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Coach Feedback if large difference */}
                  {hasLargeDifference && feedback && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Trainer-Feedback:
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