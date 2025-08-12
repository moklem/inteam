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
    console.log('SelfRatingBanner - User:', user);
    // Check for both regular players and youth players
    if (user && (user.role === 'Spieler' || user.role === 'Jugendspieler')) {
      console.log('SelfRatingBanner - Checking self-rating status for player');
      checkSelfRatingStatus();
    } else {
      setLoading(false); // Not a player, don't show banner
    }
  }, [user]);

  const checkSelfRatingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('SelfRatingBanner - Token exists:', !!token);
      
      // Check if player has completed self-assessment
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/attributes/universal`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { playerId: user._id }
        }
      );

      console.log('SelfRatingBanner - Response:', response.data);

      // Check if any attribute has selfAssessmentCompleted flag
      const attributes = response.data || [];
      const hasCompleted = attributes.some(attr => 
        attr.selfAssessmentCompleted === true || 
        attr.selfLevel !== null || 
        attr.selfRating !== null
      );
      
      console.log('SelfRatingBanner - Has completed self-rating:', hasCompleted);
      console.log('SelfRatingBanner - User category:', user.category);
      
      setHasCompletedSelfRating(hasCompleted);

      // Determine if banner should show
      if (!hasCompleted) {
        // Check if user is a youth player based on role
        const isYouthPlayer = user.role === 'Jugendspieler' || user.category === 'youth';
        
        if (isYouthPlayer) {
          console.log('SelfRatingBanner - Youth player, showing banner');
          // Youth players: Always show if not completed
          setShow(true);
        } else {
          // Senior players: Check if already dismissed
          const dismissKey = `selfRatingBanner_dismissed_${user._id}`;
          const isDismissed = localStorage.getItem(dismissKey) === 'true';
          console.log('SelfRatingBanner - Senior player, dismissed:', isDismissed);
          
          if (!isDismissed) {
            console.log('SelfRatingBanner - Showing banner for senior player');
            setShow(true);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking self-rating status:', error);
      // If there's an error (like no attributes exist), show the banner
      console.log('SelfRatingBanner - Error occurred, showing banner anyway');
      const isYouthPlayer = user.role === 'Jugendspieler' || user.category === 'youth';
      
      if (isYouthPlayer) {
        setShow(true);
      } else {
        const dismissKey = `selfRatingBanner_dismissed_${user._id}`;
        const isDismissed = localStorage.getItem(dismissKey) === 'true';
        if (!isDismissed) {
          setShow(true);
        }
      }
      setLoading(false);
    }
  };

  const handleNavigateToSelfRating = () => {
    // Navigate directly to the self-assessment page
    navigate('/player/self-assessment');
  };

  const handleSkip = () => {
    setShow(false);
    
    // Check if user is a youth player
    const isYouthPlayer = user.role === 'Jugendspieler' || user.category === 'youth';
    
    // For senior players, remember dismissal permanently
    if (!isYouthPlayer) {
      const dismissKey = `selfRatingBanner_dismissed_${user._id}`;
      localStorage.setItem(dismissKey, 'true');
    }
    // For youth players, banner will show again next time
  };

  const handleClose = () => {
    setShow(false);
  };

  console.log('SelfRatingBanner - Final state:', { loading, show, userRole: user?.role });
  
  // Check for both regular players and youth players
  const isPlayer = user?.role === 'Spieler' || user?.role === 'Jugendspieler';
  
  if (loading || !show || !isPlayer) {
    console.log('SelfRatingBanner - Not showing banner:', { loading, show, userRole: user?.role, isPlayer });
    return null;
  }
  
  console.log('SelfRatingBanner - Showing banner!');

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
              {(user.role === 'Jugendspieler' || user.category === 'youth') ? 'Später' : 'Später erinnern'}
            </Button>
          </Stack>

          {(user.role === 'Jugendspieler' || user.category === 'youth') && (
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