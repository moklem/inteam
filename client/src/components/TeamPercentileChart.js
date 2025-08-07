import React from 'react';

import PropTypes from 'prop-types';

import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';

// Simple SVG Radar Chart Component using Material-UI and SVG
const RadarChart = ({ data, size = 300 }) => {
  const theme = useTheme();
  const center = size / 2;
  const radius = center - 40;
  const numAttributes = data.length;

  // Calculate points for each attribute
  const getPoint = (index, value) => {
    const angle = (index * 2 * Math.PI) / numAttributes - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Calculate label positions
  const getLabelPoint = (index) => {
    const angle = (index * 2 * Math.PI) / numAttributes - Math.PI / 2;
    const r = radius + 20;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Create concentric circles for scale
  const scaleCircles = [20, 40, 60, 80, 100].map((scale) => (
    <circle
      key={scale}
      cx={center}
      cy={center}
      r={(scale / 100) * radius}
      fill="none"
      stroke={theme.palette.grey[300]}
      strokeWidth="1"
      opacity="0.5"
    />
  ));

  // Create axis lines
  const axisLines = data.map((_, index) => {
    const point = getPoint(index, 100);
    return (
      <line
        key={index}
        x1={center}
        y1={center}
        x2={point.x}
        y2={point.y}
        stroke={theme.palette.grey[300]}
        strokeWidth="1"
        opacity="0.5"
      />
    );
  });

  // Create the data polygon
  const points = data.map((item, index) => {
    const point = getPoint(index, item.percentile);
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <svg width={size} height={size}>
        {/* Background circles */}
        {scaleCircles}
        
        {/* Axis lines */}
        {axisLines}
        
        {/* Scale labels */}
        <text x={center + 5} y={center - (0.8 * radius)} fontSize="10" fill={theme.palette.text.secondary}>80%</text>
        <text x={center + 5} y={center - (0.6 * radius)} fontSize="10" fill={theme.palette.text.secondary}>60%</text>
        <text x={center + 5} y={center - (0.4 * radius)} fontSize="10" fill={theme.palette.text.secondary}>40%</text>
        <text x={center + 5} y={center - (0.2 * radius)} fontSize="10" fill={theme.palette.text.secondary}>20%</text>
        
        {/* Data area */}
        <polygon
          points={points}
          fill={theme.palette.primary.main}
          fillOpacity="0.2"
          stroke={theme.palette.primary.main}
          strokeWidth="2"
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const point = getPoint(index, item.percentile);
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={item.color || theme.palette.primary.main}
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Attribute labels */}
        {data.map((item, index) => {
          const labelPoint = getLabelPoint(index);
          return (
            <text
              key={index}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill={theme.palette.text.primary}
              fontWeight="500"
            >
              {item.attribute}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

RadarChart.propTypes = {
  data: PropTypes.array.isRequired,
  size: PropTypes.number
};

const TeamPercentileChart = ({ 
  data, 
  isLoading = false, 
  teamSize = 0,
  title = "Deine Position im Team" 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="textSecondary">
              Keine Daten verfügbar
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Calculate average percentile for overall assessment
  const averagePercentile = data.reduce((sum, item) => sum + item.percentile, 0) / data.length;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Chip
            label={`${teamSize} Spieler`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        
        {/* Radar Chart */}
        <RadarChart data={data} size={isMobile ? 280 : 350} />
        
        {/* Overall Score */}
        <Box textAlign="center" mt={2} mb={3}>
          <Typography variant="body2" color="textSecondary">
            Durchschnittliche Position
          </Typography>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {Math.round(averagePercentile)}. Perzentil
          </Typography>
        </Box>
        
        {/* Attribute Details */}
        <Grid container spacing={1}>
          {data.map((item, index) => (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <Tooltip title={`${item.percentile}. Perzentil - ${item.category.description}`}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    textAlign: 'center',
                    cursor: 'help'
                  }}
                >
                  <Typography variant="body2" fontWeight="500" noWrap>
                    {item.attribute}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" mt={0.5}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: item.color,
                        mr: 0.5
                      }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      {item.percentile}%
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
        
        {/* Legend */}
        <Box mt={3}>
          <Typography variant="body2" color="textSecondary" textAlign="center">
            <strong>Grün:</strong> Stärken (Top 30%) • 
            <strong> Orange:</strong> Durchschnitt • 
            <strong> Rot:</strong> Verbesserungspotential
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

TeamPercentileChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      attribute: PropTypes.string.isRequired,
      percentile: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
      category: PropTypes.shape({
        label: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired
      }).isRequired
    })
  ),
  isLoading: PropTypes.bool,
  teamSize: PropTypes.number,
  title: PropTypes.string
};

export default TeamPercentileChart;