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
  MenuItem
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { AuthContext } from '../../context/AuthContext';
import { AttributeContext } from '../../context/AttributeContext';
import RatingSlider from '../../components/RatingSlider';
import LevelProgressBar from '../../components/LevelProgressBar';
import RatingBadge from '../../components/RatingBadge';
import PlayerRatingCard from '../../components/PlayerRatingCard';
import { VOLLEYBALL_POSITIONS } from '../../utils/constants';
import axios from 'axios';

const SelfAssessment = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const { 
    getCoreAttributes, 
    getLeagueLevels,
    getPositionSpecificSubAttributes,
    calculateMainAttributeFromSubs
  } = useContext(AttributeContext);

  const [activeStep, setActiveStep] = useState(0);
  const [assessments, setAssessments] = useState({});
  const [subAssessments, setSubAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSeason] = useState(getCurrentSeason());
  const [hasCompleted, setHasCompleted] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(user?.position === 'Universal' ? null : user?.position);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [positionSaving, setPositionSaving] = useState(false);

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
    checkAssessmentStatus();
    // Only show position dialog on mount if player has NO position at all
    // Universal players will be prompted when they reach position-specific attributes
    if (!user?.position) {
      setShowPositionDialog(true);
    }
  }, []);
  
  const checkAssessmentStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/self-assessment-status/${user._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const { hasCompleted: completed, canRedo: redo, attributes } = response.data;
      
      setHasCompleted(completed);
      setCanRedo(redo);
      
      // Always load existing assessments if completed
      if (completed) {
        await loadExistingAssessments();
        setEditMode(redo); // Only edit mode if redo is allowed
      } else {
        setEditMode(true);
        await loadExistingAssessments();
      }
    } catch (error) {
      console.error('Error checking assessment status:', error);
      setEditMode(true);
      loadExistingAssessments();
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAssessments = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/self-assessment/${user._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const assessmentMap = {};
      const subAssessmentMap = {};
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(attr => {
          // Store the assessment data
          assessmentMap[attr.attributeName] = {
            selfLevel: attr.selfLevel !== null ? attr.selfLevel : 0,
            selfRating: attr.selfRating !== null ? attr.selfRating : 1,
            selfAssessmentDate: attr.selfAssessmentDate,
            selfAssessmentSeason: attr.selfAssessmentSeason
          };
          // Store sub-attributes if they exist
          if (attr.subAttributes && Object.keys(attr.subAttributes).length > 0) {
            subAssessmentMap[attr.attributeName] = attr.subAttributes;
          }
        });
      }
      
      setAssessments(assessmentMap);
      setSubAssessments(subAssessmentMap);
    } catch (error) {
      console.error('Error loading assessments:', error);
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
    const nextStep = activeStep + 1;
    const nextAttr = coreAttributes[nextStep];
    
    // Check if next step is position-specific and Universal player hasn't selected position
    if (nextAttr?.name === 'Positionsspezifisch' && user?.position === 'Universal' && !selectedPosition) {
      setShowPositionDialog(true);
      return;
    }
    
    // For players with no position at all, show dialog
    if (nextAttr?.name === 'Positionsspezifisch' && !user?.position) {
      setShowPositionDialog(true);
      return;
    }
    
    setActiveStep(nextStep);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleGoToStep = (step) => {
    // Check if navigating to position-specific step without position
    const attr = coreAttributes[step];
    if (attr?.name === 'Positionsspezifisch') {
      // Universal player must select position first
      if (user?.position === 'Universal' && !selectedPosition) {
        setShowPositionDialog(true);
        // Don't change step yet, wait for position selection
        return;
      }
      // No position at all - show dialog
      if (!user?.position) {
        setShowPositionDialog(true);
        return;
      }
    }
    setActiveStep(step);
  };

  const handlePositionSave = async () => {
    if (!selectedPosition) {
      setError('Bitte wählen Sie eine Position');
      return;
    }

    // If user has Universal position, don't update database, just use for assessment
    if (user?.position === 'Universal') {
      setShowPositionDialog(false);
      // Jump to first attribute (index 0) after position selection
      setActiveStep(0);
      return;
    }

    // Only update database if user has no position set
    if (!user?.position) {
      try {
        setPositionSaving(true);
        // Update player's position in the database
        const response = await axios.put(
          `${process.env.REACT_APP_API_URL}/users/update-position`,
          { position: selectedPosition },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        // Update local user context if needed
        if (response.data.user) {
          // Properly update the user context using setUser
          const updatedUser = { 
            ...user, 
            ...response.data.user,
            token: user.token // Preserve the token
          };
          setUser(updatedUser);
          // Store in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // Close dialog
          setShowPositionDialog(false);
          // Jump to first attribute (index 0) after position selection
          setActiveStep(0);
        }
      } catch (error) {
        console.error('Error updating position:', error);
        setError('Fehler beim Speichern der Position');
      } finally {
        setPositionSaving(false);
      }
    } else {
      // For any other case, just close dialog and jump to first attribute
      setShowPositionDialog(false);
      setActiveStep(0);
    }
  };

  const validateAllAssessments = () => {
    for (const attr of coreAttributes) {
      // Check if Universal player needs to select position for position-specific attributes
      if (attr.name === 'Positionsspezifisch' && user?.position === 'Universal' && !selectedPosition) {
        return { valid: false, message: 'Bitte wählen Sie eine primäre Position für die positionsspezifischen Bewertungen' };
      }
      
      const assessment = assessments[attr.name];
      if (!assessment || assessment.selfLevel === undefined) {
        return { valid: false, message: `Bitte bewerten Sie ${attr.name}` };
      }
      
      // Check sub-attributes
      let subAttributes = attr.subAttributes;
      // For position-specific, use selectedPosition first (for Universal players), then user.position
      const effectivePosition = selectedPosition || (user.position !== 'Universal' ? user.position : null);
      if (attr.name === 'Positionsspezifisch' && effectivePosition) {
        subAttributes = getPositionSpecificSubAttributes(effectivePosition);
      }
      
      const subValues = subAssessments[attr.name] || {};
      if (subAttributes && subAttributes.length > 0) {
        const filledSubAttributes = subAttributes.filter(sa => 
          subValues[sa] !== null && subValues[sa] !== undefined
        );
        if (filledSubAttributes.length === 0) {
          return { valid: false, message: `Bitte bewerten Sie die Detailbewertungen für ${attr.name}` };
        }
      }
    }
    return { valid: true };
  };

  const handleFinalSave = async () => {
    const validation = validateAllAssessments();
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setShowWarningDialog(true);
  };

  const handleConfirmedSave = async () => {
    try {
      setSaving(true);
      setShowWarningDialog(false);
      
      for (const attr of coreAttributes) {
        const assessment = assessments[attr.name];
        if (assessment && assessment.selfLevel !== undefined) {
          // Calculate final rating from sub-attributes
          const subValues = subAssessments[attr.name] || {};
          const calculatedMainValue = calculateMainAttributeFromSubs(subValues);
          const finalRating = calculatedMainValue !== null ? calculatedMainValue : assessment.selfRating || 50;
          
          const payload = {
            playerId: user._id,
            attributeName: attr.name,
            selfLevel: assessment.selfLevel,
            selfRating: finalRating,
            subAttributes: subValues
          };

          await axios.post(
            `${process.env.REACT_APP_API_URL}/attributes/self-assessment`,
            payload,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        }
      }
      
      setSuccess('Selbsteinschätzung erfolgreich gespeichert!');
      setHasCompleted(true);
      setEditMode(false);
      
      // Immediately reload the assessments to show the correct view
      await loadExistingAssessments();
      
      // Optional: show success message for a bit longer
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error saving all assessments:', error);
      if (error.response?.data?.completed) {
        setError('Selbsteinschätzung bereits abgeschlossen. Bitten Sie Ihren Trainer um Erlaubnis, diese zu wiederholen.');
        setHasCompleted(true);
        setEditMode(false);
      } else {
        setError('Fehler beim Speichern der Selbsteinschätzungen');
      }
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

  // Show PlayerRatingCard view if assessment is completed and not in edit mode
  if (hasCompleted && !editMode) {
    // Prepare player data with self-assessment values
    const playerWithSelfAssessment = {
      ...user,
      selfAssessmentData: assessments,
      selfSubAssessmentData: subAssessments
    };

    return (
      <Container maxWidth="xl" sx={{ py: 1, pb: 10, px: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Ihre Selbsteinschätzung
        </Typography>
        
        <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
          <Typography variant="body1">
            Sie haben Ihre Selbsteinschätzung für die Saison {selectedSeason} abgeschlossen. 
            Die Bewertungen können nur mit Erlaubnis Ihres Trainers geändert werden.
          </Typography>
          {canRedo && (
            <Button 
              startIcon={<EditIcon />}
              onClick={() => {
                setEditMode(true);
                loadExistingAssessments();
              }}
              sx={{ mt: 1 }}
              variant="outlined"
              size="small"
            >
              Bewertung bearbeiten
            </Button>
          )}
        </Alert>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <PlayerRatingCard 
          player={playerWithSelfAssessment} 
          editable={false}
          showOverallRating={false}
          showSelfAssessment={true}
        />
      </Container>
    );
  }

  // Edit mode - show the stepper form
  return (
    <Container maxWidth="xl" sx={{ py: 1, pb: 10, px: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Saisonale Selbsteinschätzung
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
        Bewerten Sie Ihre eigenen Fähigkeiten für die Saison {selectedSeason}. 
        Sie können zwischen den Attributen wechseln und Ihre Bewertungen anpassen, bevor Sie alles speichern.
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

      <Grid container spacing={1}>
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
                  // For position-specific, use selectedPosition first (for Universal players), then user.position
                  const effectivePosition = selectedPosition || (user.position !== 'Universal' ? user.position : null);
                  if (attr.name === 'Positionsspezifisch' && effectivePosition) {
                    subAttributes = getPositionSpecificSubAttributes(effectivePosition);
                  }
                  
                  // Use position name instead of "Positionsspezifisch"
                  const displayName = attr.name === 'Positionsspezifisch' && effectivePosition 
                    ? effectivePosition 
                    : (attr.name === 'Positionsspezifisch' && user?.position === 'Universal' 
                      ? 'Position wählen' 
                      : attr.name);
                  
                  const subValues = subAssessments[attr.name] || {};
                  const calculatedMainValue = calculateMainAttributeFromSubs(subValues);
                  
                  return (
                    <Step key={attr.name}>
                      <StepLabel
                        StepIconComponent={hasAssessment ? CheckCircleIcon : undefined}
                        optional={
                          hasAssessment && (
                            <Typography variant="caption">
                              {leagueName}, Bewertung: {assessment.selfRating || calculatedMainValue}/99
                            </Typography>
                          )
                        }
                        onClick={() => handleGoToStep(index)}
                        sx={{ cursor: 'pointer' }}
                      >
                        {displayName}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {attr.description}
                        </Typography>
                        
                        {/* Show position selection for Universal players on position-specific step */}
                        {attr.name === 'Positionsspezifisch' && user?.position === 'Universal' && (
                          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Primäre Position für Bewertung:
                            </Typography>
                            <FormControl fullWidth sx={{ mt: 1 }}>
                              <InputLabel id="primary-position-select-label">Position auswählen</InputLabel>
                              <Select
                                labelId="primary-position-select-label"
                                value={selectedPosition || ''}
                                onChange={(e) => setSelectedPosition(e.target.value)}
                                label="Position auswählen"
                                required
                              >
                                {VOLLEYBALL_POSITIONS
                                  .filter(pos => pos !== 'Universal')
                                  .map((position) => (
                                    <MenuItem key={position} value={position}>
                                      {position}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                              Als Universal-Spieler wählen Sie bitte Ihre primäre Position für die positionsspezifischen Bewertungen.
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Only show rating controls if not position-specific OR if position is selected */}
                        {(attr.name !== 'Positionsspezifisch' || effectivePosition) && (
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
                                levelRating={assessment.selfRating || calculatedMainValue || 50}
                                leagueName={leagues[assessment.selfLevel]?.name}
                                nextLeague={leagues[assessment.selfLevel + 1]?.name}
                                compact={false}
                                animated={true}
                              />

                              {/* Sub-attributes section - only visible if we have sub-attributes to show */}
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
                        )}
                        
                        <Box sx={{ mb: 2 }}>
                          {index > 0 && (
                            <Button
                              onClick={handleBack}
                              sx={{ mt: 1, mr: 1 }}
                            >
                              Zurück
                            </Button>
                          )}
                          {index < coreAttributes.length - 1 && (
                            <Button
                              variant="contained"
                              onClick={handleNext}
                              sx={{ mt: 1 }}
                            >
                              Weiter
                            </Button>
                          )}
                          {index === coreAttributes.length - 1 && (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => setActiveStep(coreAttributes.length)}
                              sx={{ mt: 1 }}
                              startIcon={<CheckCircleIcon />}
                            >
                              Zur Überprüfung
                            </Button>
                          )}
                        </Box>
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
              
              {activeStep === coreAttributes.length && (
                <Paper square elevation={0} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Überprüfung
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Bitte überprüfen Sie Ihre Bewertungen. Sie können auf jedes Attribut klicken, 
                    um es nochmals zu bearbeiten.
                  </Typography>
                  
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Wichtig:</strong> Nach dem Speichern können Sie Ihre Bewertungen nur noch einsehen, 
                      aber nicht mehr ändern (außer Ihr Trainer erlaubt es).
                    </Typography>
                  </Alert>
                  
                  <Button 
                    onClick={() => setActiveStep(0)} 
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Bewertungen überprüfen
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleFinalSave}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {saving ? 'Speichern...' : 'Alles Speichern'}
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
      
      {/* Warning Dialog */}
      <Dialog
        open={showWarningDialog}
        onClose={() => setShowWarningDialog(false)}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Endgültige Speicherung</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography paragraph>
              <strong>Achtung:</strong> Sie sind dabei, Ihre Selbsteinschätzung endgültig zu speichern.
            </Typography>
            <Typography paragraph>
              Nach dem Speichern können Sie Ihre Bewertungen nur noch einsehen, aber nicht mehr ändern.
            </Typography>
            <Typography>
              Änderungen sind nur möglich, wenn Ihr Trainer Ihnen die Erlaubnis dazu erteilt.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarningDialog(false)} color="secondary">
            Zurück zur Überprüfung
          </Button>
          <Button 
            onClick={handleConfirmedSave}
            variant="contained" 
            color="warning"
            disabled={saving}
          >
            Endgültig Speichern
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Position Selection Dialog */}
      <Dialog
        open={showPositionDialog}
        onClose={() => {
          // Only allow closing if player has Universal position
          if (user?.position === 'Universal') {
            setShowPositionDialog(false);
          }
        }}
        disableEscapeKeyDown={!user?.position}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SportsSoccerIcon color="primary" />
            <Typography variant="h6">Primäre Position wählen</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography paragraph>
              {!user?.position ? (
                'Sie haben noch keine Position festgelegt. Bitte wählen Sie Ihre primäre Spielposition aus, um die positionsspezifischen Fähigkeiten bewerten zu können.'
              ) : (
                'Als Universal-Spieler können Sie eine primäre Position für die Bewertung Ihrer positionsspezifischen Fähigkeiten wählen.'
              )}
            </Typography>
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="position-select-label">Position</InputLabel>
            <Select
              labelId="position-select-label"
              value={selectedPosition || ''}
              onChange={(e) => setSelectedPosition(e.target.value)}
              label="Position"
            >
              {VOLLEYBALL_POSITIONS
                .map((position) => (
                  <MenuItem key={position} value={position}>
                    {position}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          
          {!user?.position && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Diese Position wird als Ihre Hauptposition gespeichert und in Statistiken verwendet.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {user?.position === 'Universal' && (
            <Button onClick={() => setShowPositionDialog(false)} color="secondary">
              Abbrechen
            </Button>
          )}
          <Button 
            onClick={handlePositionSave}
            variant="contained" 
            color="primary"
            disabled={!selectedPosition || positionSaving}
            startIcon={positionSaving ? <CircularProgress size={20} /> : null}
          >
            {positionSaving ? 'Speichern...' : 'Position wählen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SelfAssessment;