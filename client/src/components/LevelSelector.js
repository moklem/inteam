import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Grid,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { AttributeContext } from '../context/AttributeContext';

const LevelSelector = ({
  level = 0,
  levelRating = 0,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const { getLeagueLevels } = useContext(AttributeContext);
  const theme = useTheme();
  const leagues = getLeagueLevels();
  
  const [localLevel, setLocalLevel] = useState(level);
  const [localRating, setLocalRating] = useState(levelRating);

  useEffect(() => {
    setLocalLevel(level);
    setLocalRating(levelRating);
  }, [level, levelRating]);

  const handleLevelChange = (event) => {
    const newLevel = event.target.value;
    setLocalLevel(newLevel);
    
    // Keep current rating when changing level (don't reset)
    // Let the backend handle level-up logic
    onChange && onChange(newLevel, localRating);
  };

  const handleRatingChange = (event, newValue) => {
    setLocalRating(newValue);
    onChange && onChange(localLevel, newValue);
  };

  const getLeagueColor = (leagueLevel) => {
    const colors = [
      '#9e9e9e', // Kreisliga - gray
      '#795548', // Bezirksklasse - brown
      '#ff9800', // Bezirksliga - orange
      '#ff5722', // Landesliga - deep orange
      '#f44336', // Bayernliga - red
      '#9c27b0', // Regionalliga - purple
      '#3f51b5', // Dritte Liga - indigo
      '#ffd700', // Bundesliga - gold
    ];
    return colors[leagueLevel] || theme.palette.grey[500];
  };

  const currentColor = getLeagueColor(localLevel);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={leagues[localLevel]}
          size="small"
          sx={{
            backgroundColor: currentColor,
            color: 'white',
            fontWeight: 'bold'
          }}
        />
        <Typography variant="caption" color="textSecondary">
          {localRating}/99
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>Liga</InputLabel>
            <Select
              value={localLevel}
              onChange={handleLevelChange}
              label="Liga"
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                }
              }}
            >
              {leagues.map((league, index) => (
                <MenuItem key={index} value={index}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: getLeagueColor(index),
                      }}
                    />
                    {league}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={7}>
          <Box>
            <Tooltip title="Der Fortschritt kann nur durch Änderung der Attributwerte angepasst werden">
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Fortschritt in {leagues[localLevel]}: {localRating}/99 (nur durch Attribute änderbar)
              </Typography>
            </Tooltip>
            <Slider
              value={localRating}
              onChange={handleRatingChange}
              min={1}
              max={99}
              disabled={true}  // Always disabled - rating changes through attributes only
              sx={{
                color: currentColor,
                '& .MuiSlider-thumb': {
                  backgroundColor: currentColor,
                },
                '& .MuiSlider-track': {
                  backgroundColor: currentColor,
                },
              }}
              marks={[
                { value: 1, label: '1' },
                { value: 50, label: '50' },
                { value: 90, label: '90↑' },
                { value: 99, label: '99' }
              ]}
            />
            {localRating >= 90 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: theme.palette.success.main,
                  fontWeight: 'bold',
                  display: 'block',
                  mt: 0.5
                }}
              >
                ⚡ Bereit für Aufstieg in {localLevel < 7 ? leagues[localLevel + 1] : 'Weltklasse'}!
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

LevelSelector.propTypes = {
  level: PropTypes.number,
  levelRating: PropTypes.number,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  compact: PropTypes.bool,
};

export default LevelSelector;