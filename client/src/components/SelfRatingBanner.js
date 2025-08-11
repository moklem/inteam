import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Typography,
  Paper,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const SelfRatingBanner = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [hasCompletedSelfRating, setHasCompletedSelfRating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'Spieler') {
      checkSelfRatingStatus();
    }
  }, [user]);

  const checkSelfRatingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if player has completed self-assessment
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/universal`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { playerId: user._id }
        }
      );

      // Check if any attribute has selfAssessmentCompleted flag
      const attributes = response.data || [];
      const hasCompleted = attributes.some(attr => 
        attr.selfAssessmentCompleted === true || 
        attr.selfLevel !== null || 
        attr.selfRating !== null
      );
      
      setHasCompletedSelfRating(hasCompleted);

      // Determine if banner should show
      if (!hasCompleted) {
        if (user.category === 'youth') {
          // Youth players: Always show if not completed
          setShow(true);
        } else {
          // Senior players: Check if already dismissed
          const dismissKey = `selfRatingBanner_dismissed_${user._id}`;
          const isDismissed = localStorage.getItem(dismissKey) === 'true';
          
          if (!isDismissed) {
            setShow(true);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking self-rating status:', error);
      setLoading(false);
    }
  };

  const handleNavigateToSelfRating = () => {
    // Navigate directly to the self-assessment page
    navigate('/player/self-assessment');
  };

  const handleSkip = () => {
    setShow(false);
    
    // For senior players, remember dismissal permanently
    if (user.category !== 'youth') {
      const dismissKey = `selfRatingBanner_dismissed_${user._id}`;
      localStorage.setItem(dismissKey, 'true');
    }
    // For youth players, banner will show again next time
  };

  const handleClose = () => {
    setShow(false);
  };

  if (loading || !show || user?.role !== 'Spieler') {
    return null;
  }

  return (
    <Collapse in={show}>
      <Paper 
        elevation={3}
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          m: 2,
          p: 3,
          borderRadius: 2,
          position: 'relative'
        }}
      >
        {/* Close button for temporary dismissal */}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              color: 'white'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ pr: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <TrophyIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Neues Bewertungssystem verfügbar! 🎯
              </Typography>
              <Typography variant="subtitle1">
                Verbessere deine Fähigkeiten mit personalisierten Feedback
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              <strong>Was ist neu?</strong>
            </Typography>
            <Stack spacing={1} sx={{ pl: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <StarIcon fontSize="small" />
                <Typography variant="body2">
                  Bewerte deine eigenen Fähigkeiten in 8 Hauptkategorien
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="body2">
                  Erhalte nach jedem Training personalisiertes Feedback vom Trainer
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <AssessmentIcon fontSize="small" />
                <Typography variant="body2">
                  Verfolge deine Fortschritte und erreiche neue Level
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Alert 
            severity="info" 
            sx={{ 
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white'
              }
            }}
          >
            <strong>Erster Schritt:</strong> Bewerte deine aktuellen Fähigkeiten, 
            damit dein Trainer dir gezieltes Feedback geben kann!
          </Alert>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={handleNavigateToSelfRating}
              startIcon={<AssessmentIcon />}
              sx={{
                backgroundColor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              Jetzt selbst bewerten
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={handleSkip}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.7)',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {user.category === 'youth' ? 'Später' : 'Später erinnern'}
            </Button>
          </Stack>

          {user.category === 'youth' && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 2, 
                opacity: 0.9 
              }}
            >
              Diese Erinnerung erscheint bis du deine Selbstbewertung abgeschlossen hast.
            </Typography>
          )}
        </Box>
      </Paper>
    </Collapse>
  );
};

export default SelfRatingBanner;