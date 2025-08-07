import React from 'react';
import { Box, Chip, Typography, Tooltip, useTheme } from '@mui/material';
import {
  EmojiEvents,
  Star,
  Diamond,
  WorkspacePremium,
  Medal
} from '@mui/icons-material';

const AchievementBadge = ({ 
  achievement, 
  size = 'medium', 
  showDescription = false,
  isUnlocked = true,
  progress = null 
}) => {
  const theme = useTheme();
  
  const getRarityColor = (rarity) => {
    const colors = {
      Bronze: '#CD7F32',
      Silber: '#C0C0C0',
      Gold: '#FFD700',
      Platin: '#E5E4E2',
      Diamant: '#B9F2FF'
    };
    return colors[rarity] || '#gray';
  };

  const getRarityIcon = (rarity) => {
    const iconProps = { 
      sx: { 
        color: getRarityColor(rarity),
        fontSize: size === 'small' ? '1rem' : size === 'large' ? '1.5rem' : '1.2rem'
      }
    };
    
    switch (rarity) {
      case 'Bronze': return <Medal {...iconProps} />;
      case 'Silber': return <Star {...iconProps} />;
      case 'Gold': return <EmojiEvents {...iconProps} />;
      case 'Platin': return <WorkspacePremium {...iconProps} />;
      case 'Diamant': return <Diamond {...iconProps} />;
      default: return <Medal {...iconProps} />;
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { 
          width: 80, 
          height: 60,
          fontSize: '0.75rem',
          padding: 1
        };
      case 'large':
        return { 
          width: 160, 
          height: 120,
          fontSize: '1rem',
          padding: 2
        };
      default:
        return { 
          width: 120, 
          height: 90,
          fontSize: '0.875rem',
          padding: 1.5
        };
    }
  };

  const sizeProps = getSizeProps();
  const rarityColor = getRarityColor(achievement.rarity);

  const BadgeContent = () => (
    <Box
      sx={{
        ...sizeProps,
        backgroundColor: isUnlocked ? 'background.paper' : 'grey.100',
        border: `2px solid ${isUnlocked ? rarityColor : 'grey.300'}`,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        opacity: isUnlocked ? 1 : 0.6,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: isUnlocked ? 'scale(1.05)' : 'none',
          boxShadow: isUnlocked ? `0 4px 20px ${rarityColor}40` : 'none'
        }
      }}
    >
      {/* Rarity indicator */}
      <Chip
        label={achievement.rarity}
        size="small"
        sx={{
          position: 'absolute',
          top: -8,
          backgroundColor: rarityColor,
          color: achievement.rarity === 'Gold' || achievement.rarity === 'Diamant' ? 'black' : 'white',
          fontSize: '0.6rem',
          height: 16,
          '& .MuiChip-label': {
            padding: '0 6px'
          }
        }}
      />

      {/* Badge icon */}
      <Box sx={{ mb: 0.5 }}>
        {getRarityIcon(achievement.rarity)}
      </Box>

      {/* Badge name */}
      <Typography
        variant="body2"
        sx={{
          fontSize: sizeProps.fontSize,
          fontWeight: 'bold',
          color: isUnlocked ? 'text.primary' : 'text.secondary',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {achievement.badgeName || achievement.name}
      </Typography>

      {/* Progress indicator for unlocked badges */}
      {progress !== null && !isUnlocked && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            right: 4,
            height: 4,
            backgroundColor: 'grey.300',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: rarityColor,
              width: `${Math.min(progress, 100)}%`,
              transition: 'width 0.3s ease'
            }}
          />
        </Box>
      )}

      {/* Unlocked indicator */}
      {isUnlocked && achievement.unlockedAt && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 2,
            fontSize: '0.6rem',
            color: 'text.secondary',
            opacity: 0.8
          }}
        >
          {new Date(achievement.unlockedAt).toLocaleDateString('de-DE')}
        </Typography>
      )}
    </Box>
  );

  const tooltipTitle = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {achievement.badgeName || achievement.name}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {achievement.badgeDescription || achievement.description}
      </Typography>
      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.8 }}>
        Kategorie: {achievement.category} • Seltenheit: {achievement.rarity}
      </Typography>
      {progress !== null && !isUnlocked && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: rarityColor }}>
          Fortschritt: {Math.round(progress)}%
        </Typography>
      )}
      {isUnlocked && achievement.unlockedAt && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.8 }}>
          Freigeschaltet: {new Date(achievement.unlockedAt).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Typography>
      )}
    </Box>
  );

  if (showDescription) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Tooltip title={tooltipTitle} arrow placement="top">
          <div>
            <BadgeContent />
          </div>
        </Tooltip>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
          {achievement.badgeDescription || achievement.description}
        </Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <div>
        <BadgeContent />
      </div>
    </Tooltip>
  );
};

export default AchievementBadge;