import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Add,
  Search,
  Clear,
  Group,
  SportsVolleyball,
  Link as LinkIcon
} from '@mui/icons-material';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';
import InviteLinkDialog from '../../components/coach/InviteLinkDialog';

const AddPlayersToTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchTeam, addPlayerToTeam } = useContext(TeamContext); // Removed loading from context
  
  const [team, setTeam] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true); // Local loading state
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false); // add players dirctly with link

  // Separate effect for authorization check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user]); // Removed navigate from dependencies

  useEffect(() => {
    let mounted = true; // Cleanup flag

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch team details
        const teamData = await fetchTeam(id);
        
        if (!mounted) return; // Prevent updates if unmounted
        
        setTeam(teamData);

        // Check if user is a coach of this team
        if (!teamData.coaches.some(coach => coach._id === user._id)) {
          navigate(`/coach/teams/${id}`);
          return;
        }

        // Fetch all players
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/users/players`);
        
        if (!mounted) return; // Prevent updates if unmounted
        
        if (res.data) {
          setAllPlayers(res.data);
          
          // Filter out players who are already in the team
          const teamPlayerIds = teamData.players.map(p => p._id);
          const available = res.data.filter(player => !teamPlayerIds.includes(player._id));
          setAvailablePlayers(available);
          setFilteredPlayers(available);
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
  }, [id, user]); // Removed fetchTeam and navigate from dependencies

  // Filter players based on search term
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = availablePlayers.filter(player => 
        player.name.toLowerCase().includes(term) ||
        player.email?.toLowerCase().includes(term) ||
        player.position?.toLowerCase().includes(term) ||
        player.role?.toLowerCase().includes(term)
      );
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers(availablePlayers);
    }
  }, [searchTerm, availablePlayers]);

  const handleToggle = (playerId) => {
    const currentIndex = selectedPlayers.indexOf(playerId);
    const newSelected = [...selectedPlayers];

    if (currentIndex === -1) {
      newSelected.push(playerId);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedPlayers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === filteredPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map(p => p._id));
    }
  };

  const handleAddPlayers = async () => {
    if (selectedPlayers.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      // Add each selected player to the team
      const promises = selectedPlayers.map(playerId => 
        addPlayerToTeam(id, playerId)
      );

      await Promise.all(promises);
      
      // Navigate back to team detail page
      navigate(`/coach/teams/${id}`);
    } catch (error) {
      console.error('Error adding players:', error);
      setError('Fehler beim Hinzufügen der Spieler');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">Team nicht gefunden</Alert>
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
          onClick={() => navigate(`/coach/teams/${id}`)} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Spieler zu Team hinzufügen
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main', mr: 2 }}>
            <Group />
          </Avatar>
          <Box>
            <Typography variant="h6">{team.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Verfügbare Spieler ({availablePlayers.length})
          </Typography>
          
          <TextField
            fullWidth
            id="player-search"
            name="playerSearch"
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
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => setInviteDialogOpen(true)}
                fullWidth
              >
                Spieler per Link einladen
              </Button>
            </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              {selectedPlayers.length > 0 && (
                <Chip 
                  label={`${selectedPlayers.length} ausgewählt`}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
            <Button
              size="small"
              onClick={handleSelectAll}
              disabled={filteredPlayers.length === 0}
            >
              {selectedPlayers.length === filteredPlayers.length ? 'Keine auswählen' : 'Alle auswählen'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {filteredPlayers.length > 0 ? (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredPlayers.map((player) => (
              <ListItem
                key={player._id}
                button
                onClick={() => handleToggle(player._id)}
                sx={{ 
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main' }}>
                    src="" // Add this to prevent default image loading
                    <Person />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={player.name}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {player.position && (
                        <>
                          <SportsVolleyball sx={{ fontSize: 16 }} />
                          <span>{player.position}</span>
                        </>
                      )}
                      {player.position && player.role && <span>•</span>}
                      {player.role && <span>{player.role}</span>}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    id={`player-checkbox-${player._id}`}
                    name={`playerCheckbox-${player._id}`}
                    edge="end"
                    checked={selectedPlayers.indexOf(player._id) !== -1}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? 'Keine Spieler gefunden.' : 'Alle Spieler sind bereits im Team.'}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/coach/teams/${id}`)}
            disabled={submitting}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddPlayers}
            disabled={selectedPlayers.length === 0 || submitting}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `${selectedPlayers.length} Spieler hinzufügen`
            )}
          </Button>
        </Box>
      </Paper>
      <InviteLinkDialog
              open={inviteDialogOpen}
              onClose={() => setInviteDialogOpen(false)}
              preselectedTeam={id} // The team ID from the URL params
              teams={[team]} // Pass the current team
            />
    </Box>
  );
};

export default AddPlayersToTeam;
