import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  InputAdornment
} from '@mui/material';
import {
  Group,
  Person,
  ArrowBack,
  SportsTennis,
  Email,
  Phone,
  Edit,
  Delete,
  Add,
  Search,
  Clear
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchTeam, removePlayerFromTeam, error, setError } = useContext(TeamContext);
  
  const [team, setTeam] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SportsTennis sx={{ mr: 1 }} />
            Trainer
          </Typography>
          {team.coaches && team.coaches.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {team.coaches.map((coach) => (
                <Chip
                  key={coach._id}
                  label={coach.name}
                  icon={<Person />}
                  color="primary"
                  variant="outlined"
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
    </Box>
  );
};

export default TeamDetail;