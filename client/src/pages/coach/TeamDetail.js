import React, { useContext, useEffect, useState } from 'react';

import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Group,
  Person,
  ArrowBack,
  SportsVolleyball,
  Email,
  Phone,
  Edit,
  Delete,
  Add,
  Search,
  Clear
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';
import TrainingPoolManager from '../../components/TrainingPoolManager';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchTeam, removePlayerFromTeam, error, setError,addCoachToTeam } = useContext(TeamContext);
  
  const [team, setTeam] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [openAddCoachDialog, setOpenAddCoachDialog] = useState(false);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);

  const fetchAvailableCoaches = async () => {
    try {
      // Get token from user object in localStorage
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const token = userData?.token;
      
      if (!token) {
        console.error('No authentication token found');
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const allUsers = await response.json();
      
      // Filter users to get only coaches (role: 'Trainer')
      const allCoaches = allUsers.filter(user => user.role === 'Trainer');
      
      // Filter out coaches that are already part of the team
      if (team && team.coaches) {
        const teamCoachIds = team.coaches.map(coach => coach._id);
        const available = allCoaches.filter(coach => !teamCoachIds.includes(coach._id));
        setAvailableCoaches(available);
      } else {
        setAvailableCoaches(allCoaches);
      }
    } catch (error) {
      console.error('Error fetching available coaches:', error);
      setAvailableCoaches([]);
    }
};

  const handleOpenAddCoachDialog = () => {
    setOpenAddCoachDialog(true);
    fetchAvailableCoaches();
  };

  useEffect(() => {
    let mounted = true;
    
    const loadTeam = async () => {
      try {
        console.log('Starting to load team with ID:', id);
        setLoading(true);
        setLoadError(null);
        
        // Ensure we have a user before proceeding
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        // Fetch team data
        const teamData = await fetchTeam(id);
        console.log('Team data received:', teamData);
        
        if (!mounted) return;
        
        if (!teamData) {
          console.log('No team data found');
          setLoadError('Team nicht gefunden');
          setTimeout(() => navigate('/coach/teams'), 2000);
          return;
        }
        
        setTeam(teamData);
        
        // Check if user is a coach of this team
        const userIsCoach = teamData.coaches?.some(coach => coach._id === user._id) || false;
        console.log('User is coach:', userIsCoach);
        setIsCoach(userIsCoach);
        
        // Initialize filtered players
        setFilteredPlayers(teamData.players || []);
        
      } catch (error) {
        if (!mounted) return;
        console.error('Error loading team:', error);
        setLoadError(error.message || 'Fehler beim Laden des Teams');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    if (id && user) {
      loadTeam();
    } else if (!user) {
      setLoading(false);
    }
    
    return () => {
      mounted = false;
    };
  }, [id, user]);

  // Filter players based on search term
  useEffect(() => {
    if (team && team.players) {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = team.players.filter(player => 
          player.name?.toLowerCase().includes(term) ||
          player.position?.toLowerCase().includes(term) ||
          player.email?.toLowerCase().includes(term)
        );
        setFilteredPlayers(filtered);
      } else {
        setFilteredPlayers(team.players);
      }
    }
  }, [team, searchTerm]);

  const handleAddCoach = async () => {
  if (!selectedCoach) return;
  
  try {
    setAddingCoach(true);
    await addCoachToTeam(team._id, selectedCoach);
    // Reload team data to show the new coach
    const updatedTeam = await fetchTeam(id);
    setTeam(updatedTeam);
    setOpenAddCoachDialog(false);
    setSelectedCoach('');
    // Refresh available coaches
    fetchAvailableCoaches();
  } catch (error) {
    console.error('Error adding coach:', error);
  } finally {
    setAddingCoach(false);
  }
};

  const handleRemovePlayer = (player) => {
    setPlayerToRemove(player);
    setOpenRemoveDialog(true);
  };

  const confirmRemovePlayer = async () => {
    if (!playerToRemove) return;
    
    try {
      console.log('Removing player:', playerToRemove._id);
      await removePlayerFromTeam(team._id, playerToRemove._id);
      
      // Refresh team data
      const updatedTeam = await fetchTeam(id);
      setTeam(updatedTeam);
      setFilteredPlayers(updatedTeam.players || []);
      
      setOpenRemoveDialog(false);
      setPlayerToRemove(null);
    } catch (error) {
      console.error('Error removing player:', error);
      setLoadError('Fehler beim Entfernen des Spielers');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {loadError || error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/teams')}
          sx={{ mt: 2 }}
        >
          Zurück zur Teamübersicht
        </Button>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Team nicht gefunden.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/teams')}
          sx={{ mt: 2 }}
        >
          Zurück zur Teamübersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/teams')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Team Details
        </Typography>
        
        {isCoach && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            component={RouterLink}
            to={`/coach/teams/edit/${team._id}`}
          >
            Bearbeiten
          </Button>
        )}
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
            <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main', mr: 2 }}>
              <Group />
            </Avatar>
            <Typography variant="h5" component="h2">
              {team.name}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
              color={team.type === 'Youth' ? 'secondary' : 'primary'} 
              size="small"
            />
            <Chip 
              label={`${team.players?.length || 0} Spieler`} 
              variant="outlined" 
              size="small"
            />
          </Box>
        </Box>
        
        {team.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {team.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <SportsVolleyball sx={{ mr: 1 }} />
              Trainer ({team.coaches.length})
            </Typography>
            
            {isCoach && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  handleOpenAddCoachDialog();
                }}
              >
                Trainer hinzufügen
              </Button>
            )}
          </Box>
          
          {team.coaches && team.coaches.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {team.coaches.map((coach) => (
                <Chip
                  key={coach._id}
                  label={coach.name}
                  icon={<Person />}
                  color="primary"
                  variant="outlined"
                  onClick={() => {
                    // Optional: Add coach detail view navigation
                    // navigate(`/coach/users/${coach._id}`);
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Keine Trainer zugewiesen
            </Typography>
          )}
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1 }} />
            Spieler ({filteredPlayers.length})
          </Typography>
          
          {isCoach && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              component={RouterLink}
              to={`/coach/teams/${team._id}/add-players`}  // Changed from /coach/players?teamId=${team._id}
            >
              Spieler hinzufügen
            </Button>
          )}
        </Box>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Spieler suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
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
            ),
          }}
        />
        
        {filteredPlayers.length > 0 ? (
          <List>
            {filteredPlayers.map((player) => (
              <ListItem key={player._id} divider>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {player.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={player.name}
                  secondary={
                    <Box>
                      {player.position && (
                        <Chip 
                          label={player.position} 
                          size="small" 
                          sx={{ mr: 1 }} 
                        />
                      )}
                      {player.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Email sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption">{player.email}</Typography>
                        </Box>
                      )}
                      {player.phoneNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Phone sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption">{player.phoneNumber}</Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                {isCoach && (
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemovePlayer(player)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? 'Keine Spieler gefunden' : 'Keine Spieler im Team'}
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Dialog
        open={openRemoveDialog}
        onClose={() => setOpenRemoveDialog(false)}
      >
        <DialogTitle>Spieler entfernen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie {playerToRemove?.name} wirklich aus dem Team entfernen?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={confirmRemovePlayer} color="error">
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>

        {/* Add Coach Dialog */}
          <Dialog
            open={openAddCoachDialog}
            onClose={() => setOpenAddCoachDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Trainer hinzufügen</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Wählen Sie einen Trainer aus, der diesem Team hinzugefügt werden soll.
              </DialogContentText>
              
              {availableCoaches.length > 0 ? (
                <FormControl fullWidth>
                  <InputLabel id="coach-select-label">Trainer auswählen</InputLabel>
                  <Select
                    labelId="coach-select-label"
                    value={selectedCoach}
                    label="Trainer auswählen"
                    onChange={(e) => setSelectedCoach(e.target.value)}
                  >
                    {availableCoaches.map((coach) => (
                      <MenuItem key={coach._id} value={coach._id}>
                        {coach.name} ({coach.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Alert severity="info">
                  Keine weiteren Trainer verfügbar. Alle Trainer sind bereits diesem Team zugeordnet.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddCoachDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleAddCoach} 
                variant="contained"
                disabled={!selectedCoach || addingCoach}
              >
                {addingCoach ? <CircularProgress size={24} /> : 'Hinzufügen'}
              </Button>
            </DialogActions>
          </Dialog>

      {/* Training Pool Manager */}
      {isCoach && (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <TrainingPoolManager teamId={team._id} teamName={team.name} />
        </Paper>
      )}

    </Box>
  );
};

export default TeamDetail;
