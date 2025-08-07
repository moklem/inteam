import React, { useContext, useEffect, useState } from 'react';

import {
  Search,
  Clear
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';

import PlayerRatingCard from '../../components/PlayerRatingCard';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const Attributes = () => {
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [playersInTeam, setPlayersInTeam] = useState([]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Extract players from selected team
  useEffect(() => {
    if (selectedTeam && teams.length > 0) {
      const team = teams.find(t => t._id === selectedTeam);
      if (team) {
        setPlayersInTeam(team.players || []);
      } else {
        setPlayersInTeam([]);
      }
    } else {
      setPlayersInTeam([]);
    }
  }, [selectedTeam, teams]);

  if (teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Spielerbewertungen
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="team-select-label">Team auswählen</InputLabel>
          <Select
            labelId="team-select-label"
            value={selectedTeam}
            label="Team auswählen"
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <MenuItem value="">
              <em>Team auswählen</em>
            </MenuItem>
            {teams.map(team => (
              <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedTeam ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Spieler durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')} edge="end">
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                size="small"
              />
            </Box>
            
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                Universelle Spielerbewertungen (1-99 Skala)
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
                Diese Bewertungen sind teamübergreifend und basieren auf den sechs Kernattributen des Volleyballs.
              </Typography>
              
              <Grid container spacing={3}>
                {playersInTeam
                  .filter(player => {
                    if (searchTerm) {
                      return player.name.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                    return true;
                  })
                  .map(player => (
                    <Grid item xs={12} md={6} lg={4} key={player._id}>
                      <PlayerRatingCard
                        player={player}
                        editable={true}
                        showOverallRating={true}
                        compact={true}
                        onSave={() => {
                          // Refresh data after save if needed
                          console.log('Player ratings updated');
                        }}
                      />
                    </Grid>
                  ))}
              </Grid>
              
              {playersInTeam.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Keine Spieler in diesem Team gefunden.
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Alert severity="info">
            Bitte wählen Sie ein Team aus, um die Spielerbewertungen anzuzeigen.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default Attributes;