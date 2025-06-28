import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  ArrowBack,
  Search,
  PersonAdd,
  SportsTennis,
  Person,
  Group
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const AddPlayersToTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchTeam, addPlayerToTeam } = useContext(TeamContext);
  
  // Local state - NOT using loading from context to avoid conflicts
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  // Separate effect for authorization check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user]); // Minimal dependencies - no navigate

  // Main data loading effect
  useEffect(() => {
    let mounted = true; // Cleanup flag

    const loadData = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);
        setError('');
        
        // Fetch team data
        const teamData = await fetchTeam(id);
        
        if (!mounted) return; // Prevent updates if unmounted
        
        setTeam(teamData);
        
        // Check if user is a coach
        const userIsCoach = teamData.coaches.some(coach => coach._id === user._id);
        setIsCoach(userIsCoach);
        
        if (!userIsCoach) {
          navigate(`/coach/teams/${id}`);
          return;
        }
        
        // Fetch all players (you might need to implement this in your API)
        // For now, using a mock implementation
        const response = await fetch(`${process.env.REACT_APP_API_URL}/users?role=Spieler`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const players = await response.json();
          if (!mounted) return;
          
          // Filter out players already in the team
          const availablePlayers = players.filter(
            player => !teamData.players.some(tp => tp._id === player._id)
          );
          
          setAllPlayers(availablePlayers);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (mounted) {
          setError('Fehler beim Laden der Daten');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [id, user]); // Minimal dependencies - removed fetchTeam and navigate

  const handleTogglePlayer = (playerId) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      return [...prev, playerId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedPlayers.length === 0) {
      setSubmitError('Bitte wählen Sie mindestens einen Spieler aus');
      return;
    }
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      // Add each selected player to the team
      for (const playerId of selectedPlayers) {
        await addPlayerToTeam(id, playerId);
      }
      
      // Navigate back to team detail
      navigate(`/coach/teams/${id}`);
    } catch (err) {
      console.error('Error adding players:', err);
      setSubmitError('Fehler beim Hinzufügen der Spieler');
      setSubmitting(false);
    }
  };

  // Filter players based on search term
  const filteredPlayers = allPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">Team nicht gefunden</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate(`/coach/teams/${id}`)}
          sx={{ mr: 2 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Spieler zu {team.name} hinzufügen
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                id="search-players"
                name="search"
                placeholder="Spieler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              
              {filteredPlayers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm ? 'Keine Spieler gefunden' : 'Keine verfügbaren Spieler'}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {filteredPlayers.map((player) => (
                    <ListItem
                      key={player._id}
                      dense
                      button
                      onClick={() => handleTogglePlayer(player._id)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Checkbox
                        edge="start"
                        checked={selectedPlayers.includes(player._id)}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 
                          'aria-labelledby': `checkbox-list-label-${player._id}`,
                          id: `player-checkbox-${player._id}`,
                          name: `player-checkbox-${player._id}`
                        }}
                      />
                      <ListItemText
                        id={`checkbox-list-label-${player._id}`}
                        primary={player.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              size="small" 
                              label={player.email}
                              variant="outlined"
                            />
                            {player.position && (
                              <Chip 
                                size="small" 
                                label={player.position}
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting || selectedPlayers.length === 0}
                  startIcon={<PersonAdd />}
                >
                  {submitting ? 'Hinzufügen...' : `${selectedPlayers.length} Spieler hinzufügen`}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/coach/teams/${id}`)}
                  disabled={submitting}
                >
                  Abbrechen
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Group />
                </Avatar>
                <Box>
                  <Typography variant="h6">{team.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {team.players.length} aktuelle Spieler
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SportsTennis sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {team.coaches.length} Trainer
                  </Typography>
                </Box>
              </Box>
              
              {team.description && (
                <Typography variant="body2" color="text.secondary">
                  {team.description}
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {selectedPlayers.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ausgewählte Spieler
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPlayers.map(playerId => {
                    const player = allPlayers.find(p => p._id === playerId);
                    return player ? (
                      <Chip
                        key={playerId}
                        label={player.name}
                        onDelete={() => handleTogglePlayer(playerId)}
                        color="primary"
                        size="small"
                      />
                    ) : null;
                  })}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddPlayersToTeam;