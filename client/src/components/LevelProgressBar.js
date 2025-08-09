import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  Icon,
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  Stars as StarsIcon 
} from '@mui/icons-material';

const LevelProgressBar = ({
  level = 0,
  levelRating = 0,
  leagueName,
  nextLeague,
  attributeName,
  showLevelUp = true,
  compact = false,
  animated = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const leagues = [
    'Kreisliga', 'Bezirksklasse', 'Bezirksliga', 'Landesliga',
    'Bayernliga', 'Regionalliga', 'Dritte Liga', 'Bundesliga'
  ];

  const currentLeague = leagueName || leagues[level] || leagues[0];
  const nextLeagueName = nextLeague || (level < 7 ? leagues[level + 1] : null);
  const isMaxLevel = level >= 7;
  const progress = Math.min(100, Math.max(0, levelRating));
  
  // Check if close to level-up
  const isCloseToLevelUp = progress >= 85 && !isMaxLevel;
  
  // Get league color
  const getLeagueColor = (lvl) => {
    switch(lvl) {
      case 7: return theme.palette.warning.main; // Gold - Bundesliga
      case 6: return '#9c27b0'; // Purple - Dritte Liga
      case 5: return theme.palette.info.main; // Blue - Regionalliga
      case 4: return theme.palette.success.main; // Green - Bayernliga
      case 3: return '#8bc34a'; // Light Green - Landesliga
      case 2: return theme.palette.warning.light; // Yellow - Bezirksliga
      case 1: return theme.palette.warning.dark; // Orange - Bezirksklasse
      default: return theme.palette.error.main; // Red - Kreisliga
    }
  };

  const currentColor = getLeagueColor(level);
  const nextColor = level < 7 ? getLeagueColor(level + 1) : currentColor;

  if (compact) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            {currentLeague}
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              backgroundColor: currentColor,
              transition: animated ? 'transform 0.5s ease' : 'none',
            },
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
      {/* Header with attribute name and current league */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {attributeName && (
            <Typography variant="subtitle2" fontWeight="bold">
              {attributeName}
            </Typography>
          )}
          <Chip
            label={currentLeague}
            size="small"
            sx={{
              backgroundColor: currentColor,
              color: '#fff',
              fontWeight: 600,
            }}
            icon={isMaxLevel ? <TrophyIcon sx={{ color: '#fff' }} /> : null}
          />
        </Box>
        
        {/* Level-up indicator */}
        {showLevelUp && isCloseToLevelUp && (
          <Fade in={true}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <StarsIcon sx={{ fontSize: 16, color: nextColor }} />
              <Typography variant="caption" sx={{ color: nextColor, fontWeight: 600 }}>
                Level-Aufstieg nahe!
              </Typography>
            </Box>
          </Fade>
        )}
      </Box>

      {/* Progress bar */}
      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: isMobile ? 10 : 12,
            borderRadius: 6,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: isCloseToLevelUp 
                ? `linear-gradient(90deg, ${currentColor}, ${nextColor})`
                : currentColor,
              transition: animated ? 'transform 0.5s ease' : 'none',
            },
          }}
        />
        
        {/* Progress text overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: progress > 50 ? '#fff' : 'text.primary',
              fontWeight: 600,
              fontSize: isMobile ? '0.7rem' : '0.75rem',
            }}
          >
            {progress} / 100
          </Typography>
        </Box>
      </Box>

      {/* Footer with next level info */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
        <Typography variant="caption" color="textSecondary">
          Fortschritt in {currentLeague}
        </Typography>
        
        {!isMaxLevel && nextLeagueName && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingUpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="textSecondary">
              Nächste Liga: {nextLeagueName}
            </Typography>
          </Box>
        )}
        
        {isMaxLevel && (
          <Typography variant="caption" sx={{ color: theme.palette.warning.main, fontWeight: 600 }}>
            Höchste Liga erreicht!
          </Typography>
        )}
      </Box>

      {/* Level-up celebration effect */}
      {isCloseToLevelUp && animated && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': {
                boxShadow: `0 0 0 0 ${nextColor}40`,
              },
              '70%': {
                boxShadow: `0 0 0 10px ${nextColor}00`,
              },
              '100%': {
                boxShadow: `0 0 0 0 ${nextColor}00`,
              },
            },
          }}
        />
      )}
    </Box>
  );
};

LevelProgressBar.propTypes = {
  level: PropTypes.number,
  levelRating: PropTypes.number,
  leagueName: PropTypes.string,
  nextLeague: PropTypes.string,
  attributeName: PropTypes.string,
  showLevelUp: PropTypes.bool,
  compact: PropTypes.bool,
  animated: PropTypes.bool,
};

export default LevelProgressBar;