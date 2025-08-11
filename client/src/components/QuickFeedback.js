import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  ButtonGroup,
  Tooltip,
  LinearProgress,
  Fade,
  DialogContentText
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  EmojiEvents as TrophyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { AttributeContext } from '../context/AttributeContext';
import axios from 'axios';

const QuickFeedback = ({ open, onClose, event, participants }) => {
  const { user } = useContext(AuthContext);
  const { saveUniversalPlayerRatings } = useContext(AttributeContext);
  
  const [playerFeedbacks, setPlayerFeedbacks] = useState({});
  const [focusAreas, setFocusAreas] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Feedback increment options
  const feedbackOptions = [
    { value: -3, label: '--', color: 'error', icon: '📉' },
    { value: -1, label: '-', color: 'warning', icon: '↘️' },
    { value: 0, label: '→', color: 'inherit', icon: '→', description: 'Wie erwartet' },
    { value: 1, label: '+', color: 'info', icon: '↗️' },
    { value: 5, label: '++', color: 'success', icon: '📈' },
  ];

  useEffect(() => {
    if (open && participants && participants.length > 0) {
      loadPlayerFocusAreas();
    }
  }, [open, participants]);

  const loadPlayerFocusAreas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Loading focus areas for participants:', participants.map(p => p.name));
      
      // Load focus areas for all participants
      const focusAreasPromises = participants.map(async (participant) => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/attributes/focus-areas/${participant._id}?season=${new Date().getFullYear()}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log(`Focus areas for ${participant.name}:`, response.data.focusAreas);
          
          return {
            playerId: participant._id,
            focusAreas: response.data.focusAreas || []
          };
        } catch (err) {
          console.error(`Error loading focus areas for player ${participant.name} (${participant._id}):`, err.response?.data || err.message);
          return {
            playerId: participant._id,
            focusAreas: []
          };
        }
      });

      const results = await Promise.all(focusAreasPromises);
      
      // Convert to object for easy lookup
      const focusAreasMap = {};
      results.forEach(result => {
        focusAreasMap[result.playerId] = result.focusAreas;
      });
      
      setFocusAreas(focusAreasMap);
      
      // Initialize feedback state
      const initialFeedback = {};
      participants.forEach(participant => {
        initialFeedback[participant._id] = {};
        if (focusAreasMap[participant._id]) {
          focusAreasMap[participant._id].forEach(area => {
            const key = `${area.attribute}_${area.subAttribute}`;
            initialFeedback[participant._id][key] = 0; // Default to no change
          });
        }
      });
      setPlayerFeedbacks(initialFeedback);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading focus areas:', error);
      setLoading(false);
    }
  };

  const handleFeedbackChange = (playerId, focusAreaKey, value) => {
    setPlayerFeedbacks(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [focusAreaKey]: value
      }
    }));
  };

  const handleSubmit = async () => {
    // Show confirmation dialog first
    setShowConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    try {
      setShowConfirmDialog(false);
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Process feedback for each player
      const updatePromises = Object.entries(playerFeedbacks).map(async ([playerId, feedbacks]) => {
        const playerFocusAreas = focusAreas[playerId] || [];
        
        // Skip if no focus areas
        if (playerFocusAreas.length === 0) return;
        
        // Get current ratings
        const ratingsResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/attributes/universal/${playerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const currentRatings = ratingsResponse.data || [];
        const updatedRatings = {};
        
        // Apply feedback to sub-attributes
        Object.entries(feedbacks).forEach(([focusAreaKey, feedbackValue]) => {
          const [attributeName, subAttributeName] = focusAreaKey.split('_');
          
          // Find the current attribute
          const currentAttr = currentRatings.find(attr => attr.attributeName === attributeName);
          if (currentAttr) {
            if (!updatedRatings[attributeName]) {
              updatedRatings[attributeName] = {
                value: currentAttr.numericValue,
                subAttributes: { ...currentAttr.subAttributes },
                level: currentAttr.level,
                levelRating: currentAttr.levelRating
              };
            }
            
            // Apply feedback to sub-attribute
            const currentSubValue = currentAttr.subAttributes?.[subAttributeName] || 50;
            const newSubValue = Math.max(1, Math.min(99, currentSubValue + feedbackValue));
            updatedRatings[attributeName].subAttributes[subAttributeName] = newSubValue;
            
            // Add progression history note
            if (feedbackValue !== 0) {
              updatedRatings[attributeName].progressNote = 
                `Quick Feedback nach ${event.type}: ${subAttributeName} ${feedbackValue > 0 ? '+' : ''}${feedbackValue}`;
            }
          }
        });
        
        // Save updated ratings if there are changes
        if (Object.keys(updatedRatings).length > 0) {
          await saveUniversalPlayerRatings(playerId, updatedRatings);
        }
        
        // Add participation bonus (+1 to all focus areas if attended)
        const participationBonus = 1;
        if (Object.values(feedbacks).every(v => v >= 0)) {
          // Player performed adequately, add small participation bonus
          Object.entries(feedbacks).forEach(([focusAreaKey]) => {
            const [attributeName, subAttributeName] = focusAreaKey.split('_');
            if (updatedRatings[attributeName]) {
              const currentValue = updatedRatings[attributeName].subAttributes[subAttributeName];
              updatedRatings[attributeName].subAttributes[subAttributeName] = 
                Math.min(99, currentValue + participationBonus);
            }
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      // Log feedback event
      await axios.post(
        `${process.env.REACT_APP_API_URL}/events/${event._id}/feedback`,
        { 
          feedbackProvided: true,
          feedbackDate: new Date(),
          coachId: user._id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Mark feedback as provided in localStorage with completion flag
      const feedbackKey = `feedback_shown_${event._id}`;
      localStorage.setItem(feedbackKey, JSON.stringify({
        completed: true,
        date: new Date().toISOString(),
        coachId: user._id
      }));
      
      setSubmitted(true);
      setTimeout(() => {
        onClose(true); // Pass true to indicate feedback was completed
        setSubmitted(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Fehler beim Speichern des Feedbacks');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Mark as shown for today to avoid repeated prompts (but not completed)
    const feedbackKey = `feedback_shown_${event._id}`;
    localStorage.setItem(feedbackKey, JSON.stringify({
      completed: false,
      skippedDate: new Date().toISOString(),
      coachId: user._id
    }));
    onClose(false); // Pass false to indicate feedback was skipped
  };

  const getParticipantWithFocus = () => {
    const participant = participants[currentPlayerIndex];
    const playerFocusAreas = focusAreas[participant._id] || [];
    return { ...participant, focusAreas: playerFocusAreas };
  };

  const handleNextPlayer = () => {
    if (currentPlayerIndex < participants.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setProgress(((currentPlayerIndex + 1) / participants.length) * 100);
    }
  };

  const handlePreviousPlayer = () => {
    if (currentPlayerIndex > 0) {
      setCurrentPlayerIndex(currentPlayerIndex - 1);
      setProgress((currentPlayerIndex / participants.length) * 100);
    }
  };

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const currentPlayer = participants[currentPlayerIndex];
  const playerFocusAreas = focusAreas[currentPlayer._id] || [];
  const hasPlayersWithFocus = Object.values(focusAreas).some(areas => areas.length > 0);

  if (!hasPlayersWithFocus) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Quick Feedback</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            Keine Spieler haben Fokusbereiche ausgewählt. 
            Spieler müssen zuerst ihre 3 Fokusbereiche in der Statistik-Seite auswählen.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Schließen</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleSkip}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <TrophyIcon color="primary" />
            <Typography variant="h6">
              Quick Feedback - {event.title}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <TimerIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              7 Tage verfügbar
            </Typography>
          </Box>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 1, borderRadius: 1 }}
        />
      </DialogTitle>
      
      <DialogContent>
        {submitted ? (
          <Fade in={submitted}>
            <Box display="flex" flexDirection="column" alignItems="center" p={4}>
              <CheckIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" color="success.main">
                Feedback erfolgreich gespeichert!
              </Typography>
            </Box>
          </Fade>
        ) : (
          <>
            {/* Player Card */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ width: 56, height: 56 }}>
                    {currentPlayer.name?.charAt(0)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6">
                      {currentPlayer.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentPlayer.position || 'Spieler'}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${currentPlayerIndex + 1}/${participants.length}`}
                    size="small"
                  />
                </Box>
                
                {playerFocusAreas.length === 0 ? (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Dieser Spieler hat keine Fokusbereiche ausgewählt.
                  </Alert>
                ) : (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Fokusbereiche bewerten:
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {playerFocusAreas.map((area) => {
                        const key = `${area.attribute}_${area.subAttribute}`;
                        const currentFeedback = playerFeedbacks[currentPlayer._id]?.[key] || 0;
                        
                        return (
                          <Grid item xs={12} key={key}>
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {area.attribute} - {area.subAttribute}
                              </Typography>
                              
                              <ButtonGroup 
                                fullWidth 
                                size="small"
                                sx={{ mt: 1 }}
                              >
                                {feedbackOptions.map((option) => (
                                  <Tooltip 
                                    key={option.value} 
                                    title={option.description || `${option.value > 0 ? '+' : ''}${option.value} Punkte`}
                                  >
                                    <Button
                                      variant={currentFeedback === option.value ? 'contained' : 'outlined'}
                                      color={option.color}
                                      onClick={() => handleFeedbackChange(currentPlayer._id, key, option.value)}
                                      sx={{ 
                                        fontSize: '1.2rem',
                                        minWidth: 'auto',
                                        flex: 1
                                      }}
                                    >
                                      {option.icon} {option.label}
                                    </Button>
                                  </Tooltip>
                                ))}
                              </ButtonGroup>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                    
                    <Alert severity="info" sx={{ mt: 2 }} icon={<TrophyIcon />}>
                      <Typography variant="caption">
                        Teilnahmebonus: Spieler erhalten +1 Punkt zusätzlich für konsistente Teilnahme
                      </Typography>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button
                onClick={handlePreviousPlayer}
                disabled={currentPlayerIndex === 0}
                startIcon={<TrendingDownIcon />}
              >
                Vorheriger
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                Spieler {currentPlayerIndex + 1} von {participants.length}
              </Typography>
              
              <Button
                onClick={handleNextPlayer}
                disabled={currentPlayerIndex === participants.length - 1}
                endIcon={<TrendingUpIcon />}
              >
                Nächster
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleSkip} 
          color="secondary"
          disabled={saving}
        >
          Später
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={saving || submitted}
          startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
        >
          {saving ? 'Speichern...' : 'Feedback speichern'}
        </Button>
      </DialogActions>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">Feedback-Bestätigung</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>Achtung:</strong> Sie können das Feedback nur einmal abgeben und es kann nachträglich nicht mehr geändert werden.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Sind Sie sicher, dass Sie die Bewertungen für alle Spieler jetzt endgültig speichern möchten?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmDialog(false)}
            color="secondary"
          >
            Zurück zur Überprüfung
          </Button>
          <Button 
            onClick={handleConfirmedSubmit}
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
          >
            Ja, endgültig speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

QuickFeedback.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  event: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
  }).isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    position: PropTypes.string
  })).isRequired
};

export default QuickFeedback;