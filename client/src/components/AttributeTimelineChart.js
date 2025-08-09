import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme,
  useMediaQuery 
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';

const AttributeTimelineChart = ({ 
  data, 
  attributeName, 
  height = 300,
  showGrid = true,
  showMilestones = true,
  milestones = []
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // League level definitions
  const leagues = [
    { min: 0, max: 99, name: 'Kreisliga', color: theme.palette.error.main },
    { min: 100, max: 199, name: 'Bezirksklasse', color: theme.palette.warning.dark },
    { min: 200, max: 299, name: 'Bezirksliga', color: theme.palette.warning.light },
    { min: 300, max: 399, name: 'Landesliga', color: '#8bc34a' },
    { min: 400, max: 499, name: 'Bayernliga', color: theme.palette.success.main },
    { min: 500, max: 599, name: 'Regionalliga', color: theme.palette.info.main },
    { min: 600, max: 699, name: 'Dritte Liga', color: '#9c27b0' },
    { min: 700, max: 800, name: 'Bundesliga', color: theme.palette.warning.main }
  ];

  // Get league for a given value
  const getLeagueForValue = (value) => {
    return leagues.find(league => value >= league.min && value <= league.max) || leagues[0];
  };

  // Color scheme for different rating ranges
  const getRatingColor = (value) => {
    const league = getLeagueForValue(value);
    return league.color;
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const league = getLeagueForValue(data.value);
      
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          <Typography variant="body2" color="primary.main" gutterBottom>
            <strong>{attributeName}: {data.value} Punkte</strong>
          </Typography>
          <Typography variant="body2" color="secondary.main" gutterBottom>
            <strong>Liga: {league.name}</strong>
          </Typography>
          {data.change !== 0 && (
            <Typography 
              variant="body2" 
              color={data.change > 0 ? 'success.main' : 'error.main'}
            >
              Änderung: {data.change > 0 ? '+' : ''}{data.change}
            </Typography>
          )}
          {data.notes && (
            <Typography variant="body2" color="text.secondary">
              Notiz: {data.notes}
            </Typography>
          )}
          {data.isSignificantChange && (
            <Typography variant="caption" color="primary.main">
              ⚡ Bedeutende Änderung
            </Typography>
          )}
          {data.isLevelUp && (
            <Typography variant="caption" color="warning.main">
              🏆 Level-Aufstieg!
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.arrayOf(PropTypes.shape({
      payload: PropTypes.shape({
        value: PropTypes.number,
        change: PropTypes.number,
        notes: PropTypes.string,
        isSignificantChange: PropTypes.bool,
        level: PropTypes.number,
        levelRating: PropTypes.number,
        isLevelUp: PropTypes.bool
      })
    })),
    label: PropTypes.string
  };

  // Custom dot for significant changes
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload?.isSignificantChange) {
      return (
        <Dot 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill={theme.palette.primary.main}
          stroke={theme.palette.background.paper}
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  CustomDot.propTypes = {
    cx: PropTypes.number,
    cy: PropTypes.number,
    payload: PropTypes.shape({
      isSignificantChange: PropTypes.bool
    })
  };

  // Get milestone markers
  const getMilestoneLines = () => {
    return milestones.map(milestone => (
      <ReferenceLine
        key={milestone.value}
        y={milestone.value}
        stroke={theme.palette.info.main}
        strokeDasharray="5 5"
        label={{
          value: `${milestone.value}+`,
          position: 'left',
          style: { fill: theme.palette.info.main, fontSize: '12px' }
        }}
      />
    ));
  };

  if (!data || data.length === 0) { // eslint-disable-line react/prop-types
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Keine Verlaufsdaten für {attributeName} verfügbar
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: isMobile ? 10 : 30,
            left: isMobile ? 10 : 20,
            bottom: 5,
          }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme.palette.divider}
            />
          )}
          <XAxis 
            dataKey="date"
            stroke={theme.palette.text.secondary}
            fontSize={isMobile ? 10 : 12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          <YAxis 
            domain={[0, 800]}
            stroke={theme.palette.text.secondary}
            fontSize={isMobile ? 10 : 12}
            tick={{ fill: theme.palette.text.secondary }}
            ticks={[0, 100, 200, 300, 400, 500, 600, 700, 800]}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Milestone reference lines */}
          {showMilestones && getMilestoneLines()}
          
          {/* League level labels without lines */}
          {leagues.map((league, index) => {
            // Position label in the middle of the range
            const labelPosition = (league.min + league.max) / 2;
            return (
              <ReferenceLine
                key={league.name}
                y={labelPosition}
                stroke="transparent" // No visible line
                label={{
                  value: league.name,
                  position: 'left',
                  style: { 
                    fill: league.color, 
                    fontSize: isMobile ? '10px' : '12px',
                    fontWeight: 'bold'
                  }
                }}
              />
            );
          })}
          
          {/* Horizontal lines at each 100-point boundary */}
          {[100, 200, 300, 400, 500, 600, 700].map(y => {
            // Make lines at 100, 300, 500, 700 more visible
            const isMainLine = [100, 300, 500, 700].includes(y);
            return (
              <ReferenceLine
                key={`line-${y}`}
                y={y}
                stroke={isMainLine ? theme.palette.text.secondary : theme.palette.divider}
                strokeDasharray="0" // All lines solid, no dashes
                strokeOpacity={isMainLine ? 0.4 : 0.2}
                strokeWidth={isMainLine ? 1.5 : 1}
              />
            );
          })}
          
          {/* Main data line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ 
              r: 6, 
              fill: theme.palette.primary.main,
              stroke: theme.palette.background.paper,
              strokeWidth: 2
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

AttributeTimelineChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    timestamp: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
    change: PropTypes.number,
    notes: PropTypes.string,
    attributeName: PropTypes.string.isRequired,
    isSignificantChange: PropTypes.bool,
    index: PropTypes.number
  })).isRequired,
  attributeName: PropTypes.string.isRequired,
  height: PropTypes.number,
  showGrid: PropTypes.bool,
  showMilestones: PropTypes.bool,
  milestones: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  }))
};

export default AttributeTimelineChart;