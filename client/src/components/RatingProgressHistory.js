import React, { useState, useEffect, useContext } from 'react';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PropTypes from 'prop-types';

import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';

import RatingBadge from './RatingBadge';
import { AttributeContext } from '../context/AttributeContext';

const RatingProgressHistory = ({ playerId, attributeName, teamId }) => {
  const { getPlayerProgress, loading } = useContext(AttributeContext);
  const [progressData, setProgressData] = useState(null);
  const [error, setError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    if (playerId && attributeName) {
      loadProgressData();
    }
  }, [playerId, attributeName, teamId]);

  const loadProgressData = async () => {
    try {
      setError(null);
      const data = await getPlayerProgress(playerId, attributeName, teamId);
      setProgressData(data);
    } catch (err) {
      setError('Fehler beim Laden der Fortschrittsdaten');
      console.error('Error loading progress data:', err);
    }
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return <TrendingUpIcon color="success" />;
    } else if (change < 0) {
      return <TrendingDownIcon color="error" />;
    } else {
      return <RemoveIcon color="disabled" />;
    }
  };

  const getChangeColor = (change) => {
    if (change > 0) {
      return 'success';
    } else if (change < 0) {
      return 'error';
    } else {
      return 'default';
    }
  };

  const getChangeText = (change) => {
    if (change > 0) {
      return `+${change}`;
    } else if (change < 0) {
      return `${change}`;
    } else {
      return '0';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!progressData || !progressData.history || progressData.history.length === 0) {
    return (
      <Box textAlign="center" py={2}>
        <TimelineIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2" color="textSecondary">
          Keine Fortschrittsdaten für {attributeName} verfügbar
        </Typography>
      </Box>
    );
  }

  // Sort history by date (newest first) and calculate changes
  const sortedHistory = [...progressData.history]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((entry, index, array) => {
      let change = 0;
      if (index < array.length - 1) {
        const currentValue = typeof entry.value === 'number' ? entry.value : 0;
        const previousValue = typeof array[index + 1].value === 'number' ? array[index + 1].value : 0;
        change = currentValue - previousValue;
      }
      return {
        ...entry,
        change
      };
    });

  const currentValue = progressData.currentValue;
  const latestEntry = sortedHistory[0];
  const totalEntries = sortedHistory.length;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <TimelineIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Fortschritt: {attributeName}
            </Typography>
          </Box>
          <RatingBadge value={currentValue} size="medium" />
        </Box>

        {/* Summary */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
          p={2}
          sx={{
            backgroundColor: theme.palette.background.default,
            borderRadius: 1,
          }}
        >
          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Aktuell
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {currentValue || 'N/A'}
            </Typography>
          </Box>
          
          {latestEntry && latestEntry.change !== 0 && (
            <>
              <Box textAlign="center">
                <Typography variant="body2" color="textSecondary">
                  Letzte Änderung
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                  {getChangeIcon(latestEntry.change)}
                  <Chip
                    label={getChangeText(latestEntry.change)}
                    size="small"
                    color={getChangeColor(latestEntry.change)}
                    variant="outlined"
                  />
                </Box>
              </Box>
            </>
          )}
          
          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Einträge
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {totalEntries}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* History List */}
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          Verlauf
        </Typography>

        <List dense>
          {sortedHistory.map((entry, index) => (
            <React.Fragment key={index}>
              <ListItem
                sx={{
                  px: 0,
                  py: 1,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 1,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {entry.change !== 0 ? getChangeIcon(entry.change) : <RemoveIcon color="disabled" />}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <RatingBadge value={entry.value} size="small" showLabel={false} />
                      {entry.change !== 0 && (
                        <Chip
                          label={getChangeText(entry.change)}
                          size="small"
                          color={getChangeColor(entry.change)}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(entry.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </Typography>
                      {entry.notes && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {entry.notes}
                        </Typography>
                      )}
                      {entry.updatedBy && (
                        <Typography variant="caption" color="textSecondary">
                          von {entry.updatedBy.name}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              
              {index < sortedHistory.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

RatingProgressHistory.propTypes = {
  playerId: PropTypes.string.isRequired,
  attributeName: PropTypes.string.isRequired,
  teamId: PropTypes.string,
};

export default RatingProgressHistory;