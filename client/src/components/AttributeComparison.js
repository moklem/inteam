import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  useTheme,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NeutralIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useState } from 'react';

const AttributeComparisonCard = ({ 
  attribute, 
  percentile, 
  color, 
  category, 
  rank = null,
  isStrength = false,
  needsImprovement = false 
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (isStrength) return <TrendingUpIcon sx={{ color: theme.palette.success.main }} />;
    if (needsImprovement) return <TrendingDownIcon sx={{ color: theme.palette.error.main }} />;
    return <NeutralIcon sx={{ color: theme.palette.warning.main }} />;
  };

  const getProgressColor = () => {
    if (percentile >= 70) return 'success';
    if (percentile >= 30) return 'warning';
    return 'error';
  };

  const getBadgeText = () => {
    if (percentile >= 90) return 'Elite';
    if (percentile >= 70) return 'Sehr gut';
    if (percentile >= 50) return 'Gut';
    if (percentile >= 30) return 'Durchschnitt';
    return 'Verbesserung';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        border: isStrength ? `2px solid ${theme.palette.success.light}` :
               needsImprovement ? `2px solid ${theme.palette.error.light}` : 'none',
        position: 'relative'
      }}
    >
      {(isStrength || needsImprovement) && (
        <Chip
          icon={getTrendIcon()}
          label={isStrength ? 'Stärke' : 'Verbesserung'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: isStrength ? theme.palette.success.light : theme.palette.error.light,
            color: 'white'
          }}
        />
      )}
      
      <CardContent>
        <Typography variant="h6" gutterBottom noWrap>
          {attribute}
        </Typography>
        
        <Box display="flex" alignItems="center" mb={2}>
          <Box flexGrow={1}>
            <Typography variant="h4" color="primary" fontWeight="bold">
              {percentile}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Perzentil
            </Typography>
          </Box>
          
          <Chip
            label={getBadgeText()}
            size="small"
            sx={{
              bgcolor: color,
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>
        
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              Position im Team
            </Typography>
            {rank && (
              <Typography variant="body2" fontWeight="500">
                #{rank}
              </Typography>
            )}
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={percentile}
            color={getProgressColor()}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        
        <Typography variant="body2" color="textSecondary">
          {category.description}
        </Typography>
      </CardContent>
    </Card>
  );
};

AttributeComparisonCard.propTypes = {
  attribute: PropTypes.string.isRequired,
  percentile: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  category: PropTypes.object.isRequired,
  rank: PropTypes.number,
  isStrength: PropTypes.bool,
  needsImprovement: PropTypes.bool
};

const AttributeComparison = ({ 
  data = [], 
  strengths = [], 
  improvements = [], 
  teamSize = 0,
  showDetails = true 
}) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Attributvergleich
          </Typography>
          <Typography color="textSecondary">
            Keine Vergleichsdaten verfügbar
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Enhance data with strength/improvement flags
  const enhancedData = data.map(item => ({
    ...item,
    isStrength: strengths.includes(item.attribute),
    needsImprovement: improvements.includes(item.attribute),
    rank: Math.ceil((100 - item.percentile) * teamSize / 100) // Approximate rank
  }));

  // Sort by percentile descending (best first)
  const sortedData = [...enhancedData].sort((a, b) => b.percentile - a.percentile);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Detaillierter Attributvergleich
          </Typography>
          {showDetails && (
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
        
        <Collapse in={expanded}>
          <Grid container spacing={2}>
            {sortedData.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <AttributeComparisonCard {...item} />
              </Grid>
            ))}
          </Grid>
          
          {/* Summary Statistics */}
          <Box mt={3} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Zusammenfassung
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h3" color="success.main">
                    {strengths.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Stärken
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h3" color="warning.main">
                    {data.length - strengths.length - improvements.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Durchschnitt
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h3" color="error.main">
                    {improvements.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Verbesserungen
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          {/* Explanation */}
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>Perzentil:</strong> Zeigt an, wie viel Prozent der Teamkollegen schlechter abschneiden. 
              Ein 80. Perzentil bedeutet, dass 80% der Spieler schlechtere Werte haben.
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

AttributeComparison.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      attribute: PropTypes.string.isRequired,
      percentile: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
      category: PropTypes.object.isRequired
    })
  ),
  strengths: PropTypes.array,
  improvements: PropTypes.array,
  teamSize: PropTypes.number,
  showDetails: PropTypes.bool
};

export default AttributeComparison;