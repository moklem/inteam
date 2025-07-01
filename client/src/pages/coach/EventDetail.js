import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Avatar,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  InputAdornment,
  ListItemButton,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack,
  Event,
  LocationOn,
  AccessTime,
  Group,
  Person,
  CheckCircle,
  Cancel,
  Help,
  Edit,
  Delete,
  Description,
  SportsVolleyball,
  Add,
  PersonAdd,
  Search,
  Clear
} from '@mui/icons-material';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';
import { AuthContext } from '../../context/AuthContext';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { events, loading: eventLoading, error: eventError, deleteEvent, addGuestPlayer } = useContext(EventContext);
  const { teams, loading: teamLoading } = useContext(TeamContext);
  const { user } = useContext(AuthContext);
  
  const [event, setEvent] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddGuestDialog, setOpenAddGuestDialog] = useState(false);
  const [deleteRecurring, setDeleteRecurring] = useState(false);
  
  // New states for player selection
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterPlayerType, setFilterPlayerType] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    const foundEvent = events.find(e => e._id === id);
    setEvent(foundEvent);
  }, [events, id]);

  // Fetch all players when dialog opens
  useEffect(() => {
    if (openAddGuestDialog) {
      fetchAvailablePlayers();
    }
  }, [openAddGuestDialog]);

  // Apply filters whenever they change
  useEffect(() => {
    if (openAddGuestDialog) {
      filterPlayers();
    }
  }, [searchTerm, filterTeam, filterPosition, filterPlayerType, allPlayers]);

  const fetchAvailablePlayers = async () => {
    setLoadingPlayers(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/users/players`);
      
      if (response.data && event) {
        // Filter out players who already have access to the event
        const playersWithAccess = [
          ...event.invitedPlayers.map(p => p._id),
          ...event.attendingPlayers.map(p => p._id),
          ...event.declinedPlayers.map(p => p._id),
          ...event.guestPlayers.map(g => g.player._id)
        ];
        
        // Filter out players from the event's team
        const eventTeam = teams.find(t => t._id === event.team._id);
        const teamPlayerIds = eventTeam ? eventTeam.players.map(p => p._id) : [];
        
        const availablePlayers = response.data.filter(player => 
          !playersWithAccess.includes(player._id) && 
          !teamPlayerIds.includes(player._id)
        );
        
        setAllPlayers(availablePlayers);
        setFilteredPlayers(availablePlayers);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      setGuestError('Fehler beim Laden der Spieler');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...allPlayers];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(term) ||
        (player.email && player.email.toLowerCase().includes(term))
      );
    }
    
    // Team filter
    if (filterTeam) {
      filtered = filtered.filter(player =>
        player.teams && player.teams.some(team => team._id === filterTeam)
      );
    }
    
    // Position filter
    if (filterPosition) {
      filtered = filtered.filter(player =>
        player.position === filterPosition
      );
    }
    
    // Player type filter
    if (filterPlayerType) {
      filtered = filtered.filter(player =>
        player.role === filterPlayerType
      );
    }
    
    setFilteredPlayers(filtered);
  };

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent(id, deleteRecurring);
      navigate('/coach/events');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleAddGuest = async () => {
    if (!selectedPlayer) {
      setGuestError('Bitte wählen Sie einen Spieler aus');
      return;
    }

    setAddingGuest(true);
    setGuestError('');

    try {
      // Find which team this player belongs to
      const playerTeam = selectedPlayer.teams && selectedPlayer.teams.length > 0 
        ? selectedPlayer.teams[0]._id 
        : teams[0]._id; // Fallback to first team if player has no teams
      
      await addGuestPlayer(id, selectedPlayer._id, playerTeam);
      
      // Reset dialog
      setSelectedPlayer(null);
      setSearchTerm('');
      setFilterTeam('');
      setFilterPosition('');
      setFilterPlayerType('');
      setOpenAddGuestDialog(false);
      
      // Refresh event data
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error adding guest:', error);
      setGuestError(error.response?.data?.message || 'Fehler beim Hinzufügen des Gastspielers');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleCloseGuestDialog = () => {
    setOpenAddGuestDialog(false);
    setSelectedPlayer(null);
    setSearchTerm('');
    setFilterTeam('');
    setFilterPosition('');
    setFilterPlayerType('');
    setGuestError('');
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    const dateStr = start.toLocaleDateString('de-DE', dateOptions);
    const startTimeStr = start.toLocaleTimeString('de-DE', timeOptions);
    const endTimeStr = end.toLocaleTimeString('de-DE', timeOptions);
    
    return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
  };

  const getPlayerStatus = (player) => {
    if (event.attendingPlayers.some(p => p._id === player._id)) {
      return { label: 'Zugesagt', color: 'success', icon: <CheckCircle /> };
    }
    if (event.declinedPlayers.some(p => p._id === player._id)) {
      return { label: 'Abgesagt', color: 'error', icon: <Cancel /> };
    }
    return { label: 'Keine Antwort', color: 'default', icon: <Help /> };
  };

  const getPositionStatistics = () => {
    const stats = {};
    event.attendingPlayers.forEach(player => {
      const position = player.position || 'Keine Position';
      stats[position] = (stats[position] || 0) + 1;
    });
    
    // Sort by count descending
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  if (eventLoading || teamLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (eventError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{eventError}</Alert>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">Termin nicht gefunden.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/events')}
          sx={{ mt: 2 }}
        >
          Zurück zur Übersicht
        </Button>
      </Box>
    );
  }

  const team = teams.find(t => t._id === event.team._id);
  const isCoach = team && team.coaches.some(coach => coach._id === user._id);

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/coach/events')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {event.title}
        </Typography>
        {isCoach && (
          <>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              component={RouterLink}
              to={`/coach/events/edit/${event._id}`}
              sx={{ mr: 1 }}
            >
              Bearbeiten
            </Button>
            <IconButton 
              color="error"
              onClick={() => setOpenDeleteDialog(true)}
            >
              <Delete />
            </IconButton>
          </>
        )}
      </Box>

      {/* Event Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={event.type === 'Training' ? 'Training' : 'Spiel'}
                    color={event.type === 'Training' ? 'primary' : 'secondary'}
                    icon={event.type === 'Training' ? <SportsVolleyball /> : <Event />}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Team: {team?.name}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTime sx={{ mr: 1, color: 'action.active' }} />
                  <Typography variant="body1">
                    {formatEventDate(event.startTime, event.endTime)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'action.active' }} />
                  <Typography variant="body1">{event.location}</Typography>
                </Box>
              </Grid>
              
              {event.description && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <Description sx={{ mr: 1, color: 'action.active', mt: 0.5 }} />
                    <Typography variant="body1">{event.description}</Typography>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <Box>
                    <Typography variant="h4">{event.attendingPlayers.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Zusagen</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4">{event.declinedPlayers.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Absagen</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4">
                      {event.invitedPlayers.length - event.attendingPlayers.length - event.declinedPlayers.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Offen</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Position Statistics */}
          {event.attendingPlayers.length > 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                Positionen der Zusagen
              </Typography>
              
              {event.invitedPlayers.length > event.attendingPlayers.length + event.declinedPlayers.length && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Nicht alle Spieler haben bisher geantwortet.
                </Alert>
              )}
              
              <Grid container spacing={2}>
                {Object.entries(getPositionStatistics()).map(([position, count]) => (
                  <Grid item xs={12} sm={6} md={12} key={position}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <SportsVolleyball sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle1" component="div">
                            {position}
                          </Typography>
                        </Box>
                        <Typography variant="h4">
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round((count / event.attendingPlayers.length) * 100)}% der Zusagen
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>
      
      {/* Player Status Section */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            Spielerübersicht
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAddGuestDialog(true)}
            size="small"
          >
            Gast hinzufügen
          </Button>
        </Box>
        
        <List>
          {event.invitedPlayers.map((player) => {
            const status = getPlayerStatus(player);
            return (
              <ListItem key={player._id}>
                <ListItemAvatar>
                  <Avatar>
                    <Person />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={player.name} 
                  secondary={player.position || 'Keine Position'}
                />
                <Chip 
                  label={status.label} 
                  color={status.color} 
                  size="small"
                  icon={status.icon}
                />
              </ListItem>
            );
          })}
          
          {event.guestPlayers.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ ml: 2, mb: 1 }}>
                Gäste ({event.guestPlayers.length})
              </Typography>
              {event.guestPlayers.map(({ player, fromTeam }) => (
                <ListItem key={player._id}>
                  <ListItemAvatar>
                    <Avatar>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={player.name} 
                    secondary={`${player.position || 'Keine Position'} • Von Team: ${fromTeam.name}`}
                  />
                  <Chip 
                    label="Gast" 
                    size="small"
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </>
          )}
        </List>
      </Paper>

      {/* Add Guest Dialog */}
      <Dialog 
        open={openAddGuestDialog} 
        onClose={handleCloseGuestDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gastspieler hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Spieler suchen..."
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
                  )
                }}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Team filtern</InputLabel>
                    <Select
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      label="Team filtern"
                    >
                      <MenuItem value="">Alle Teams</MenuItem>
                      {teams.filter(t => t._id !== event.team._id).map(team => (
                        <MenuItem key={team._id} value={team._id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Position filtern</InputLabel>
                    <Select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                      label="Position filtern"
                    >
                      <MenuItem value="">Alle Positionen</MenuItem>
                      <MenuItem value="Außenangreifer">Außenangreifer</MenuItem>
                      <MenuItem value="Diagonalangreifer">Diagonalangreifer</MenuItem>
                      <MenuItem value="Mittelblocker">Mittelblocker</MenuItem>
                      <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                      <MenuItem value="Libero">Libero</MenuItem>
                      <MenuItem value="Universalspieler">Universalspieler</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Spielertyp filtern</InputLabel>
                    <Select
                      value={filterPlayerType}
                      onChange={(e) => setFilterPlayerType(e.target.value)}
                      label="Spielertyp filtern"
                    >
                      <MenuItem value="">Alle Typen</MenuItem>
                      <MenuItem value="Trainer">Trainer</MenuItem>
                      <MenuItem value="Spieler">Spieler</MenuItem>
                      <MenuItem value="Jugendspieler">Jugendspieler</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
            
            {/* Player List */}
            {loadingPlayers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredPlayers.length > 0 ? (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredPlayers.map((player) => (
                  <ListItemButton
                    key={player._id}
                    selected={selectedPlayer?._id === player._id}
                    onClick={() => setSelectedPlayer(player)}
                    sx={{ borderRadius: 1, mb: 1 }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedPlayer?._id === player._id}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main' }}>
                        {player.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={player.name}
                      secondary={
                        <Box>
                          {player.position && (
                            <Chip label={player.position} size="small" sx={{ mr: 1 }} />
                          )}
                          <Chip 
                            label={player.role === 'Trainer' ? 'Trainer' : 
                                   player.role === 'Jugendspieler' ? 'Jugendspieler' : 'Spieler'} 
                            size="small" 
                            variant="outlined"
                          />
                          {player.teams && player.teams.length > 0 && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              Teams: {player.teams.map(t => t.name).join(', ')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Keine verfügbaren Spieler gefunden.
                </Typography>
              </Box>
            )}
            
            {guestError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {guestError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGuestDialog}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddGuest} 
            variant="contained"
            disabled={addingGuest || !selectedPlayer}
          >
            {addingGuest ? <CircularProgress size={20} /> : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Termin löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie den Termin &ldquo;{event.title}&rdquo; wirklich löschen? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteEvent} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

EventDetail.propTypes = {
  // No props are passed to this component
};

export default EventDetail;