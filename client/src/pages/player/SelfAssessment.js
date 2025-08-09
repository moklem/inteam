import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { AuthContext } from '../../context/AuthContext';
import { AttributeContext } from '../../context/AttributeContext';
import RatingSlider from '../../components/RatingSlider';
import LevelProgressBar from '../../components/LevelProgressBar';
import RatingBadge from '../../components/RatingBadge';
import axios from 'axios';

const SelfAssessment = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { 
    getCoreAttributes, 
    getLeagueLevels,
    getPositionSpecificSubAttributes,
    calculateMainAttributeFromSubs
  } = useContext(AttributeContext);

  const [activeStep, setActiveStep] = useState(0);
  const [assessments, setAssessments] = useState({});
  const [subAssessments, setSubAssessments] = useState({});
  const [existingAssessments, setExistingAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeason());

  const coreAttributes = getCoreAttributes();
  const leagues = getLeagueLevels();

  function getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Frühjahr';
    if (month >= 5 && month <= 7) return 'Sommer';
    if (month >= 8 && month <= 10) return 'Herbst';
    return 'Winter';
  }

  useEffect(() => {
    loadExistingAssessments();
  }, []);

  const loadExistingAssessments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/self-assessment/${user._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const assessmentMap = {};
      const subAssessmentMap = {};
      if (response.data) {
        response.data.forEach(attr => {
          assessmentMap[attr.attributeName] = {
            selfLevel: attr.selfLevel,
            selfRating: attr.selfRating,
            selfAssessmentDate: attr.selfAssessmentDate,
            selfAssessmentSeason: attr.selfAssessmentSeason
          };
          if (attr.subAttributes) {
            subAssessmentMap[attr.attributeName] = attr.subAttributes;
          }
        });
      }
      
      setExistingAssessments(assessmentMap);
      setAssessments(assessmentMap);
      setSubAssessments(subAssessmentMap);
    } catch (error) {
      console.error('Error loading assessments:', error);
      setError('Fehler beim Laden der Selbsteinschätzungen');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = (attributeName, level, rating) => {
    setAssessments(prev => ({
      ...prev,
      [attributeName]: {
        ...prev[attributeName],
        selfLevel: level,
        selfRating: rating
      }
    }));
  };

  const handleSubAttributeChange = (attributeName, subAttrName, value) => {
    const newSubValues = {
      ...subAssessments[attributeName],
      [subAttrName]: value
    };
    
    setSubAssessments(prev => ({
      ...prev,
      [attributeName]: newSubValues
    }));

    // Calculate main value from sub-attributes
    const mainValue = calculateMainAttributeFromSubs(newSubValues);
    if (mainValue !== null) {
      const currentAssessment = assessments[attributeName] || {};
      handleLevelChange(attributeName, currentAssessment.selfLevel || 0, mainValue);
    }
  };


  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSaveAssessment = async (attributeName) => {
    const assessment = assessments[attributeName];
    if (!assessment || assessment.selfLevel === undefined) {
      setError('Bitte wählen Sie eine Liga');
      return;
    }
    
    // Get sub-attributes for validation
    const attr = coreAttributes.find(a => a.name === attributeName);
    let subAttributes = attr?.subAttributes;
    if (attributeName === 'Positionsspezifisch' && user.position) {
      subAttributes = getPositionSpecificSubAttributes(user.position);
    }
    
    // Check if sub-attributes are filled
    const subValues = subAssessments[attributeName] || {};
    if (subAttributes && subAttributes.length > 0) {
      const filledSubAttributes = subAttributes.filter(sa => subValues[sa] !== null && subValues[sa] !== undefined);
      if (filledSubAttributes.length === 0) {
        setError('Bitte bewerten Sie mindestens eine Detailbewertung');
        return;
      }
    }
    
    // Calculate main value from sub-attributes
    const calculatedMainValue = calculateMainAttributeFromSubs(subValues);
    const finalRating = calculatedMainValue !== null ? calculatedMainValue : assessment.selfRating || 50;

    try {
      setSaving(true);
      const payload = {
        playerId: user._id,
        attributeName,
        selfLevel: assessment.selfLevel,
        selfRating: finalRating
      };

      // Include sub-attributes if they exist
      if (subAssessments[attributeName]) {
        payload.subAttributes = subAssessments[attributeName];
      }

      await axios.post(
        `${process.env.REACT_APP_API_URL}/attributes/self-assessment`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setSuccess(`Selbsteinschätzung für ${attributeName} gespeichert`);
      handleNext();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError('Fehler beim Speichern der Selbsteinschätzung');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      for (const attr of coreAttributes) {
        const assessment = assessments[attr.name];
        if (assessment && assessment.selfLevel !== undefined && assessment.selfRating !== undefined) {
          const payload = {
            playerId: user._id,
            attributeName: attr.name,
            selfLevel: assessment.selfLevel,
            selfRating: assessment.selfRating
          };

          if (subAssessments[attr.name]) {
            payload.subAttributes = subAssessments[attr.name];
          }

          await axios.post(
            `${process.env.REACT_APP_API_URL}/attributes/self-assessment`,
            payload,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        }
      }
      
      setSuccess('Alle Selbsteinschätzungen wurden gespeichert');
      setTimeout(() => navigate('/player/dashboard'), 2000);
    } catch (error) {
      console.error('Error saving all assessments:', error);
      setError('Fehler beim Speichern der Selbsteinschätzungen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, pb: 10 }}>
      <Typography variant="h4" gutterBottom>
        Saisonale Selbsteinschätzung
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        Bewerten Sie Ihre eigenen Fähigkeiten für die Saison {selectedSeason}. 
        Diese Einschätzung dient als Ausgangspunkt für die Trainerbewertung.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} orientation="vertical">
                {coreAttributes.map((attr, index) => {
                  const assessment = assessments[attr.name] || {};
                  const hasAssessment = assessment.selfLevel !== undefined && assessment.selfRating !== undefined;
                  const leagueName = assessment.selfLevel !== undefined ? leagues[assessment.selfLevel]?.name : '';
                  
                  // Get sub-attributes for this attribute
                  let subAttributes = attr.subAttributes;
                  if (attr.name === 'Positionsspezifisch' && user.position) {
                    subAttributes = getPositionSpecificSubAttributes(user.position);
                  }
                  
                  const subValues = subAssessments[attr.name] || {};
                  const calculatedMainValue = calculateMainAttributeFromSubs(subValues);
                  
                  return (
                    <Step key={attr.name}>
                      <StepLabel
                        StepIconComponent={hasAssessment ? CheckCircleIcon : undefined}
                        optional={
                          hasAssessment && (
                            <Typography variant="caption">
                              {leagueName}, Bewertung: {assessment.selfRating}/99
                            </Typography>
                          )
                        }
                      >
                        {attr.name}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {attr.description}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Wählen Sie Ihre Liga:
                          </Typography>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel id={`liga-select-label-${attr.name}`}>Liga</InputLabel>
                            <Select
                              labelId={`liga-select-label-${attr.name}`}
                              value={assessment.selfLevel !== undefined ? assessment.selfLevel : ''}
                              onChange={(e) => handleLevelChange(attr.name, e.target.value, assessment.selfRating || 50)}
                              label="Liga"
                            >
                              {leagues.map((league, idx) => (
                                <MenuItem key={idx} value={idx}>
                                  {league.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          {assessment.selfLevel !== undefined && (
                            <>
                              {/* Show calculated main value if available */}
                              {calculatedMainValue !== null && (
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                  <Typography variant="subtitle2">
                                    Berechneter Hauptwert:
                                  </Typography>
                                  <RatingBadge 
                                    value={calculatedMainValue}
                                    size="small"
                                  />
                                </Box>
                              )}
                              
                              <LevelProgressBar
                                level={assessment.selfLevel}
                                levelRating={assessment.selfRating || 50}
                                leagueName={leagues[assessment.selfLevel]?.name}
                                nextLeague={leagues[assessment.selfLevel + 1]?.name}
                                compact={false}
                                animated={true}
                              />

                              {/* Sub-attributes section - always visible */}
                              {subAttributes && subAttributes.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                    Detailbewertungen:
                                  </Typography>
                                  
                                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                                      Bewerten Sie die einzelnen Unterbereiche. Der Hauptwert wird automatisch berechnet.
                                    </Typography>
                                    
                                    <Grid container spacing={2}>
                                      {subAttributes.map((subAttrName) => (
                                        <Grid item xs={12} key={subAttrName}>
                                          <RatingSlider
                                            attributeName={subAttrName}
                                            value={subValues[subAttrName] || null}
                                            onChange={(value) => handleSubAttributeChange(attr.name, subAttrName, value)}
                                            disabled={saving}
                                            variant="compact"
                                          />
                                        </Grid>
                                      ))}
                                    </Grid>
                                  </Box>
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleSaveAssessment(attr.name)}
                            sx={{ mt: 1, mr: 1 }}
                            disabled={!hasAssessment || saving}
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                          >
                            {saving ? 'Speichern...' : 'Speichern & Weiter'}
                          </Button>
                          <Button
                            disabled={index === 0}
                            onClick={handleBack}
                            sx={{ mt: 1, mr: 1 }}
                          >
                            Zurück
                          </Button>
                        </Box>
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
              
              {activeStep === coreAttributes.length && (
                <Paper square elevation={0} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Selbsteinschätzung abgeschlossen
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Sie haben alle Attribute bewertet. Ihre Selbsteinschätzung wird als 
                    Ausgangspunkt für die Trainerbewertung verwendet.
                  </Typography>
                  <Button 
                    onClick={() => setActiveStep(0)} 
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Überprüfen
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSaveAll}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {saving ? 'Speichern...' : 'Alle Speichern & Beenden'}
                  </Button>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <InfoIcon color="primary" />
                <Typography variant="h6">
                  Bewertungsleitfaden
                </Typography>
              </Box>
              
              <Typography variant="body2" paragraph>
                <strong>Liga-Ebenen:</strong>
              </Typography>
              
              {leagues.map((league, idx) => (
                <Box key={idx} sx={{ mb: 1.5 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ color: league.color, fontWeight: 'bold' }}
                  >
                    {league.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {idx === 0 && 'Anfänger / Hobby-Niveau'}
                    {idx === 1 && 'Fortgeschrittene Anfänger'}
                    {idx === 2 && 'Untere Amateurliga'}
                    {idx === 3 && 'Mittlere Amateurliga'}
                    {idx === 4 && 'Obere Amateurliga'}
                    {idx === 5 && 'Semi-Professionell'}
                    {idx === 6 && 'Professionell (3. Liga)'}
                    {idx === 7 && 'Elite-Niveau (Bundesliga)'}
                  </Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" paragraph>
                <strong>Bewertung innerhalb der Liga:</strong>
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                • 1-30: Unterdurchschnittlich für diese Liga<br />
                • 31-60: Durchschnittlich für diese Liga<br />
                • 61-89: Überdurchschnittlich für diese Liga<br />
                • 90+: Bereit für die nächste Liga
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Bei 90+ Punkten in einer Liga erfolgt automatisch der Aufstieg in die nächste Liga.
                </Typography>
              </Alert>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" paragraph>
                <strong>Detailbewertungen:</strong>
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                Bewerten Sie alle Detailbereiche. Der Hauptwert wird 
                automatisch aus dem Durchschnitt Ihrer Detailbewertungen berechnet.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SelfAssessment;