import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  useTheme,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  EmojiEvents as TrophyIcon,
  FitnessCenter as ImprovementIcon,
  Star as StarIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const StrengthItem = ({ attribute, percentile, icon }) => {
  const theme = useTheme();
  
  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: theme.palette.success.main }}>
          {icon || <TrendingUpIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight="500">
              {attribute}
            </Typography>
            <Chip
              label={`${percentile}%`}
              size="small"
              sx={{
                bgcolor: theme.palette.success.light,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
        }
        secondary={`Top ${100 - percentile}% im Team`}
      />
    </ListItem>
  );
};

const ImprovementItem = ({ attribute, percentile, icon }) => {
  const theme = useTheme();
  
  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: theme.palette.error.main }}>
          {icon || <TrendingDownIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight="500">
              {attribute}
            </Typography>
            <Chip
              label={`${percentile}%`}
              size="small"
              sx={{
                bgcolor: theme.palette.error.light,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
        }
        secondary={`Verbesserungspotential vorhanden`}
      />
    </ListItem>
  );
};

StrengthItem.propTypes = {
  attribute: PropTypes.string.isRequired,
  percentile: PropTypes.number.isRequired,
  icon: PropTypes.node
};

ImprovementItem.propTypes = {
  attribute: PropTypes.string.isRequired,
  percentile: PropTypes.number.isRequired,
  icon: PropTypes.node
};

const StrengthsWeaknessesCard = ({ 
  data = [], 
  strengths = [], 
  improvements = [],
  averagePercentile = 50
}) => {
  const theme = useTheme();
  
  // Get detailed data for strengths and improvements
  const strengthsData = data.filter(item => strengths.includes(item.attribute));
  const improvementsData = data.filter(item => improvements.includes(item.attribute));
  
  // Sort by percentile
  const sortedStrengths = strengthsData.sort((a, b) => b.percentile - a.percentile);
  const sortedImprovements = improvementsData.sort((a, b) => a.percentile - b.percentile);
  
  const getOverallAssessment = () => {
    if (averagePercentile >= 80) return {
      label: 'Sehr starker Spieler',
      color: theme.palette.success.main,
      icon: <TrophyIcon />
    };
    if (averagePercentile >= 60) return {
      label: 'Guter Spieler',
      color: theme.palette.success.light,
      icon: <StarIcon />
    };
    if (averagePercentile >= 40) return {
      label: 'Durchschnittlicher Spieler',
      color: theme.palette.warning.main,
      icon: <ImprovementIcon />
    };
    return {
      label: 'Entwicklungsspielr',
      color: theme.palette.error.main,
      icon: <WarningIcon />
    };
  };

  const assessment = getOverallAssessment();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Stärken & Verbesserungsbereiche
          </Typography>
          <Typography color="textSecondary">
            Keine Daten verfügbar
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Stärken & Verbesserungsbereiche
        </Typography>
        
        {/* Overall Assessment */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: `${assessment.color}15`,
            border: `1px solid ${assessment.color}40`
          }}
        >
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: assessment.color, mr: 2 }}>
              {assessment.icon}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {assessment.label}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Durchschnitt: {averagePercentile}. Perzentil
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Strengths Section */}
          <Grid item xs={12} md={6}>
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Stärken ({sortedStrengths.length})
                </Typography>
              </Box>
              
              {sortedStrengths.length > 0 ? (
                <List dense>
                  {sortedStrengths.map((item, index) => (
                    <StrengthItem
                      key={index}
                      attribute={item.attribute}
                      percentile={item.percentile}
                      icon={index === 0 ? <StarIcon /> : <TrendingUpIcon />}
                    />
                  ))}
                </List>
              ) : (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="textSecondary" textAlign="center">
                    Keine herausragenden Stärken identifiziert
                  </Typography>
                  <Typography variant="caption" color="textSecondary" textAlign="center" display="block">
                    (Top 30% erforderlich)
                  </Typography>
                </Paper>
              )}
            </Box>
          </Grid>
          
          {/* Improvements Section */}
          <Grid item xs={12} md={6}>
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingDownIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                <Typography variant="h6" color="error.main">
                  Verbesserungsbereiche ({sortedImprovements.length})
                </Typography>
              </Box>
              
              {sortedImprovements.length > 0 ? (
                <List dense>
                  {sortedImprovements.map((item, index) => (
                    <ImprovementItem
                      key={index}
                      attribute={item.attribute}
                      percentile={item.percentile}
                      icon={index === 0 ? <WarningIcon /> : <TrendingDownIcon />}
                    />
                  ))}
                </List>
              ) : (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="textSecondary" textAlign="center">
                    Keine kritischen Schwächen identifiziert
                  </Typography>
                  <Typography variant="caption" color="textSecondary" textAlign="center" display="block">
                    (Untere 30% erforderlich)
                  </Typography>
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {/* Action Recommendations */}
        {(sortedStrengths.length > 0 || sortedImprovements.length > 0) && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Empfehlungen:
            </Typography>
            
            {sortedStrengths.length > 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                <strong>Stärken:</strong> Nutze deine Stärken in {sortedStrengths[0].attribute} 
                {sortedStrengths.length > 1 && ` und ${sortedStrengths[1].attribute}`} für das Team.
              </Typography>
            )}
            
            {sortedImprovements.length > 0 && (
              <Typography variant="body2" color="textSecondary">
                <strong>Verbesserung:</strong> Konzentriere dich auf {sortedImprovements[0].attribute} 
                {sortedImprovements.length > 1 && ` und ${sortedImprovements[1].attribute}`} im Training.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

StrengthsWeaknessesCard.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      attribute: PropTypes.string.isRequired,
      percentile: PropTypes.number.isRequired
    })
  ),
  strengths: PropTypes.array,
  improvements: PropTypes.array,
  averagePercentile: PropTypes.number
};

export default StrengthsWeaknessesCard;