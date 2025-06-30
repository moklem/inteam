import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import {
  Event,
  LocationOn,
  Group,
  Person,
  Check,
  Close,
  ArrowBack,
  AccessTime,
  Description,
  Edit,
  Delete,
  Add,
  Help,
  SportsVolleyball
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';
import PropTypes from 'prop-types';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { events, fetchEvent, deleteEvent, addGuestPlayer, removeGuestPlayer, loading: eventLoading, error: eventError } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamLoading } = useContext(TeamContext);
  
  const [event, setEvent] = useState(null);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [openGuestDialog, setOpenGuestDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const eventData = await fetchEvent(id);
        setEvent(eventData);
        
        // Load teams for guest player selection
        await fetchTeams();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [id, fetchEvent, fetchTeams]);

  // Filter available teams for guest players
  useEffect(() => {
    if (teams.length > 0 && event) {
      // Exclude the current event's team
      const filtered = teams.filter(team => team._id !== event.team._id);
      setAvailableTeams(filtered);
    }
  }, [teams, event]);

  // Filter available players when a team is selected
  useEffect(() => {
  if (selectedTeam && teams.length > 0 && event) {
    const team = teams.find(t => t._id === selectedTeam);
    if (team) {
      // Filter out players who are already in the event
      const alreadyInEvent = [...event.attendingPlayers, ...event.declinedPlayers, ...event.invitedPlayers]
        .map(p => p._id);
      
      // Also filter out players who are already guests
      const alreadyGuests = event.guestPlayers.map(g => g.player._id);
      
      // Get the current event's team members
      const eventTeamPlayers = event.team.players ? event.team.players.map(p => p._id) : [];
      
      const availablePlayers = team.players.filter(player => 
        !alreadyInEvent.includes(player._id) && 
        !alreadyGuests.includes(player._id) &&
        !eventTeamPlayers.includes(player._id)  // NEW: Filter out members of the event's team
      );
      
      setAvailablePlayers(availablePlayers);
    }
  } else {
    setAvailablePlayers([]);
  }
}, [selectedTeam, teams, event]);

  const handleAddGuestPlayer = async () => {
    if (selectedTeam && selectedPlayer) {
      try {
        await addGuestPlayer(event._id, selectedPlayer, selectedTeam);
        // Refresh event data
        const updatedEvent = await fetchEvent(id);
        setEvent(updatedEvent);
        
        // Reset selection
        setSelectedTeam('');
        setSelectedPlayer('');
        setOpenGuestDialog(false);
      } catch (error) {
        console.error('Error adding guest player:', error);
      }
    }
  };

  const handleRemoveGuestPlayer = async (playerId) => {
    try {
      await removeGuestPlayer(event._id, playerId);
      // Refresh event data
      const updatedEvent = await fetchEvent(id);
      setEvent(updatedEvent);
    } catch (error) {
      console.error('Error removing guest player:', error);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent(event._id);
      navigate('/coach/events');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return start.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    }) + ' | ' + 
    start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' - ' + 
    end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getAttendanceStatus = (player) => {
    if (event.attendingPlayers.some(p => p._id === player._id)) {
      return { label: 'Zugesagt', color: 'success', icon: <Check /> };
    } else if (event.declinedPlayers.some(p => p._id === player._id)) {
      return { label: 'Abgesagt', color: 'error', icon: <Close /> };
    } else {
      return { label: 'Ausstehend', color: 'warning', icon: <Help /> };
    }
  };

  // Calculate position statistics for attending players
  const getPositionStatistics = () => {
    if (!event || !event.attendingPlayers) return {};
    
    const stats = event.attendingPlayers.reduce((acc, player) => {
      const position = player.position || 'Keine Position';
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {});
    
    // Sort by count (descending)
    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [position, count]) => {
        acc[position] = count;
        return acc;
      }, {});
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
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          Fehler beim Laden des Termins: {eventError}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/events')}
          sx={{ mt: 2 }}
        >
          Zurück zur Terminübersicht
        </Button>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Termin nicht gefunden.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/events')}
          sx={{ mt: 2 }}
        >
          Zurück zur Terminübersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/events')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Termindetails
        </Typography>
        
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Edit />}
          component={RouterLink}
          to={`/coach/events/edit/${event._id}`}
          sx={{ mr: 1 }}
        >
          Bearbeiten
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={() => setOpenDeleteDialog(true)}
        >
          Löschen
        </Button>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
            <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main', mr: 2 }}>
              <Event />
            </Avatar>
            <Typography variant="h5" component="h2">
              {event.title}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={event.team.name} 
              color="primary" 
              icon={<Group />}
            />
            <Chip 
              label={event.type === 'Training' ? 'Training' : 'Spiel'} 
              color={event.type === 'Training' ? 'primary' : 'secondary'} 
              variant="outlined"
              icon={<SportsVolleyball />}
            />
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" component="div">
                  Datum & Uhrzeit
                </Typography>
                <Typography variant="body1">
                  {formatEventDate(event.startTime, event.endTime)}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" component="div">
                  Ort
                </Typography>
                <Typography variant="body1">
                  {event.location}
                </Typography>
              </Box>
            </Box>
            
            {event.description && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" component="div">
                    Beschreibung
                  </Typography>
                  <Typography variant="body1">
                    {event.description}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {event.notes && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" component="div">
                    Notizen
                  </Typography>
                  <Typography variant="body1">
                    {event.notes}
                  </Typography>
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" component="div">
                  Erstellt von
                </Typography>
                <Typography variant="body1">
                  {event.createdBy.name}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" component="div">
                Teilnehmer ({event.attendingPlayers.length}/{event.invitedPlayers.length})
              </Typography>
              <Chip 
                label={`${Math.round((event.attendingPlayers.length / event.invitedPlayers.length) * 100)}%`} 
                color="primary"
                size="small"
              />
            </Box>
            
            {event.invitedPlayers.length > 0 ? (
              <List dense>
                {event.invitedPlayers.map(player => {
                  const status = getAttendanceStatus(player);
                  return (
                    <ListItem key={player._id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={player.name} 
                        secondary={player.position || 'Keine Position angegeben'}
                      />
                      <Chip 
                        label={status.label} 
                        size="small" 
                        color={status.color} 
                        icon={status.icon}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Keine Spieler eingeladen.
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 1 }}>
              <Typography variant="subtitle1" component="div">
                Gäste ({event.guestPlayers.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => setOpenGuestDialog(true)}
              >
                Gast hinzufügen
              </Button>
            </Box>
            
            {event.guestPlayers.length > 0 ? (
              <List dense>
                {event.guestPlayers.map(guest => (
                  <ListItem key={guest.player._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={guest.player.name} 
                      secondary={`Von Team: ${guest.fromTeam.name}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleRemoveGuestPlayer(guest.player._id)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Keine Gäste eingeladen.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Position Statistics */}
      {event.attendingPlayers.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SportsVolleyball sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h3">
              Positionsstatistik der Zusagen
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {Object.entries(getPositionStatistics()).map(([position, count]) => (
              <Grid item xs={12} sm={6} md={4} key={position}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      {position}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <Typography variant="h4" component="div" color="primary">
                        {count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round((count / event.attendingPlayers.length) * 100)}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {count === 1 ? 'Spieler' : 'Spieler'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {event.attendingPlayers.length < event.invitedPlayers.length && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Diese Statistik basiert auf {event.attendingPlayers.length} von {event.invitedPlayers.length} eingeladenen Spielern.
            </Alert>
          )}
        </Paper>
      )}
      
      {/* Add Guest Dialog */}
      <Dialog open={openGuestDialog} onClose={() => setOpenGuestDialog(false)}>
        <DialogTitle>Gast hinzufügen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Wählen Sie ein Team und einen Spieler aus, um ihn als Gast zu diesem Termin hinzuzufügen.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="team-select-label">Team</InputLabel>
              <Select
                labelId="team-select-label"
                value={selectedTeam}
                label="Team"
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setSelectedPlayer('');
                }}
              >
                <MenuItem value="">
                  <em>Team auswählen</em>
                </MenuItem>
                {availableTeams.map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth disabled={!selectedTeam}>
              <InputLabel id="player-select-label">Spieler</InputLabel>
              <Select
                labelId="player-select-label"
                value={selectedPlayer}
                label="Spieler"
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <MenuItem value="">
                  <em>Spieler auswählen</em>
                </MenuItem>
                {availablePlayers.map((player) => (
                  <MenuItem key={player._id} value={player._id}>
                    {player.name} {player.role === 'Jugendspieler' && '(Jugendspieler)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGuestDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleAddGuestPlayer} 
            variant="contained" 
            disabled={!selectedTeam || !selectedPlayer}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Termin löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diesen Termin löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
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
