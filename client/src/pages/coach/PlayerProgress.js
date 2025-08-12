import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link,
  Grid
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Home
} from '@mui/icons-material';

import { AuthContext } from '../../context/AuthContext';
import ProgressDashboard from '../../components/ProgressDashboard';
import axios from '../../utils/axios';

const PlayerProgress = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load player data
  useEffect(() => {
    const loadPlayer = async () => {
      if (!playerId) {
        setError('Keine Spieler-ID angegeben');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        // Fetch player details
        const response = await axios.get(`/users/${playerId}`);
        setPlayer(response.data);
        
      } catch (err) {
        console.error('Error loading player:', err);
        setError(
          err.response?.status === 404 
            ? 'Spieler nicht gefunden'
            : err.response?.data?.message || 'Fehler beim Laden der Spielerdaten'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [playerId]);

  // Handle navigation
  const handleBack = () => {
    navigate(-1);
  };

  const handlePlayerDetail = () => {
    navigate(`/coach/players/${playerId}`);
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ mt: 2, pb: 10 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={200} height={30} />
        </Box>
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ mt: 2, pb: 10 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button 
            startIcon={<ArrowBack />}
            onClick={handleBack}
            variant="outlined"
          >
            Zurück
          </Button>
        </Box>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Spieler nicht gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Der angeforderte Spieler konnte nicht gefunden werden oder Sie haben keine Berechtigung, diese Daten einzusehen.
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleBack}
          >
            Zurück
          </Button>
        </Paper>
      </Box>
    );
  }

  // Render no player state
  if (!player) {
    return (
      <Box sx={{ mt: 2, pb: 10 }}>
        <Alert severity="warning">
          Keine Spielerdaten verfügbar
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, pb: 10 }}>
      {/* Header Navigation */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator="›" sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/coach/dashboard')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              textDecoration: 'none',
              color: 'text.secondary',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <Home size="small" />
            Dashboard
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/coach/players')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              textDecoration: 'none',
              color: 'text.secondary',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <Person size="small" />
            Spieler
          </Link>
          <Typography variant="body2" color="text.primary">
            {player.name} - Fortschrittsverlauf
          </Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Button 
            startIcon={<ArrowBack />}
            onClick={handleBack}
            variant="outlined"
          >
            Zurück
          </Button>

          <Button
            startIcon={<Person />}
            onClick={handlePlayerDetail}
            variant="outlined"
            color="primary"
          >
            Spielerdetails
          </Button>
        </Box>
      </Box>

      {/* Main Progress Dashboard */}
      <ProgressDashboard
        playerId={playerId}
        playerName={player.name}
        playerPosition={player.position}
      />
    </Box>
  );
};

export default PlayerProgress;