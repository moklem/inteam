import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Slide,
  Paper,
  Zoom,
  useTheme
} from '@mui/material';
import { Close, Share, EmojiEvents } from '@mui/icons-material';
import AchievementBadge from './AchievementBadge';
import Lottie from 'react-lottie';

// Simple celebration animation config (you can replace with actual Lottie files)
const celebrationAnimation = {
  loop: false,
  autoplay: true,
  animationData: null, // Add actual Lottie JSON here if available
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
};

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AchievementNotification = ({ 
  achievements = [], 
  open, 
  onClose,
  autoCloseDelay = 5000 
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnimation, setShowAnimation] = useState(true);

  // Auto-close timer
  useEffect(() => {
    if (open && achievements.length > 0 && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [open, achievements.length, autoCloseDelay, onClose]);

  // Cycle through multiple achievements
  useEffect(() => {
    if (achievements.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === achievements.length - 1 ? 0 : prevIndex + 1
        );
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [achievements.length]);

  // Hide animation after delay
  useEffect(() => {
    if (open && showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [open, showAnimation]);

  if (!open || achievements.length === 0) {
    return null;
  }

  const currentAchievement = achievements[currentIndex];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Neues Achievement freigeschaltet!',
        text: `Ich habe das Achievement "${currentAchievement.badgeName}" in der InTeam Volleyball App freigeschaltet!`,
        url: window.location.href
      });
    } else {
      // Fallback: Copy to clipboard
      const text = `Neues Achievement freigeschaltet: "${currentAchievement.badgeName}" - ${currentAchievement.badgeDescription}`;
      navigator.clipboard.writeText(text).then(() => {
        // Could show a toast notification here
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Background celebration animation */}
        {showAnimation && (
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              left: -50,
              right: -50,
              bottom: -50,
              zIndex: 1,
              pointerEvents: 'none'
            }}
          >
            {/* Simple CSS animation fallback */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.palette.primary.main}20 0%, transparent 70%)`,
                animation: 'pulse 1.5s ease-in-out infinite alternate'
              }}
            />
            <style jsx>{`
              @keyframes pulse {
                from {
                  transform: translate(-50%, -50%) scale(0.8);
                  opacity: 0.8;
                }
                to {
                  transform: translate(-50%, -50%) scale(1.2);
                  opacity: 0.2;
                }
              }
            `}</style>
          </Box>
        )}

        {/* Main notification card */}
        <Zoom in={open} timeout={500}>
          <Paper
            elevation={16}
            sx={{
              position: 'relative',
              zIndex: 2,
              p: 4,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
              border: `2px solid ${theme.palette.primary.main}`,
              borderRadius: 3
            }}
          >
            {/* Close button */}
            <IconButton
              onClick={onClose}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'text.secondary'
              }}
            >
              <Close />
            </IconButton>

            {/* Achievement unlocked header */}
            <Box sx={{ mb: 3 }}>
              <EmojiEvents 
                sx={{ 
                  fontSize: 48, 
                  color: 'primary.main',
                  mb: 1,
                  animation: showAnimation ? 'bounce 0.6s ease-in-out' : 'none'
                }} 
              />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Achievement Freigeschaltet!
              </Typography>
            </Box>

            {/* Achievement badge */}
            <Box sx={{ mb: 3 }}>
              <AchievementBadge
                achievement={currentAchievement}
                size="large"
                isUnlocked={true}
                showDescription={false}
              />
            </Box>

            {/* Achievement details */}
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              {currentAchievement.badgeName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {currentAchievement.badgeDescription}
            </Typography>

            {/* Multiple achievements indicator */}
            {achievements.length > 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {currentIndex + 1} von {achievements.length} neuen Achievements
              </Typography>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Share />}
                onClick={handleShare}
              >
                Teilen
              </Button>
              <Button
                variant="contained"
                onClick={onClose}
                sx={{ minWidth: 100 }}
              >
                Weiter
              </Button>
            </Box>

            {/* Progress dots for multiple achievements */}
            {achievements.length > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                {achievements.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: index === currentIndex ? 'primary.main' : 'grey.300',
                      transition: 'background-color 0.3s ease'
                    }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Zoom>
      </DialogContent>

      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0,-15px,0);
          }
          70% {
            transform: translate3d(0,-7px,0);
          }
          90% {
            transform: translate3d(0,-2px,0);
          }
        }
      `}</style>
    </Dialog>
  );
};

export default AchievementNotification;