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

  // Mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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
    if (selectedTeam && teams.length > 0) {
      const team = teams.find(t => t._id === selectedTeam);
      if (team) {
        // Filter out players who are already in the event
        const alreadyInEvent = [...event.attendingPlayers, ...event.declinedPlayers, ...event.invitedPlayers]
          .map(p => p._id);
        
        // Also filter out players who are already guests
        const alreadyGuests = event.guestPlayers.map(g => g.player._id);
        
        const availablePlayers = team.players.filter(player => 
          !alreadyInEvent.includes(player._id) && 
          !alreadyGuests.includes(player._id)
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
      return { status: 'attending', label: 'Zugesagt', color: 'success', icon: <Check /> };
    }
    if (event.declinedPlayers.some(p => p._id === player._id)) {
      return { status: 'declined', label: 'Abgesagt', color: 'error', icon: <Close /> };
    }
    return { status: 'pending', label: 'Ausstehend', color: 'warning', icon: <Help /> };
  };

  const getPositionStatistics = () => {
    const positions = {};
    
    // Count attending players by position
    event.attendingPlayers.forEach(player => {
      const position = player.position || 'Keine Position';
      positions[position] = (positions[position] || 0) + 1;
    });
    
    // Count guest players by position
    event.guestPlayers.forEach(guest => {
      const position = guest.player.position || 'Keine Position';
      positions[position] = (positions[position] || 0) + 1;
    });
    
    // Convert to array and sort by count
    return Object.entries(positions)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count);
  };

  if (eventLoading || teamLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (eventError) {
    return (
      <Box p={3}>
        <Alert severity="error">{eventError}</Alert>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box p={3}>
        <Alert severity="info">Termin nicht gefunden</Alert>
      </Box>
    );
  }

  const totalInvited = event.invitedPlayers.length;
  const totalAttending = event.attendingPlayers.length + event.guestPlayers.length;
  const totalDeclined = event.declinedPlayers.length;
  const totalPending = totalInvited - event.attendingPlayers.length - event.declinedPlayers.length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Termindetails
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/coach/events/${event._id}/edit`)}
            sx={{ mr: 2 }}
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
      </Box>

      {/* Event Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" mb={2}>
              <Event sx={{ mr: 2, color: 'primary.main' }} />
              <Box flex={1}>
                <Typography variant="h5" gutterBottom>
                  {event.title}
                </Typography>
                <Chip 
                  label={event.type} 
                  size="small" 
                  color={event.type === 'Training' ? 'primary' : 'secondary'}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={2}>
              <AccessTime sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography>{formatEventDate(event.startTime, event.endTime)}</Typography>
            </Box>
            
            <Box display="flex" alignItems="center" mb={2}>
              <LocationOn sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography>{event.location}</Typography>
            </Box>
            
            <Box display="flex" alignItems="center" mb={2}>
              <Group sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography>Team: {event.team.name}</Typography>
            </Box>
            
            {event.description && (
              <Box display="flex" alignItems="flex-start" mb={2}>
                <Description sx={{ mr: 2, color: 'text.secondary', mt: 0.5 }} />
                <Typography>{event.description}</Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Attendance Summary */}
            <Box p={2} bgcolor="background.default" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                Teilnehmerübersicht
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography color="success.main">Zugesagt:</Typography>
                  <Chip label={totalAttending} color="success" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography color="error.main">Abgesagt:</Typography>
                  <Chip label={totalDeclined} color="error" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography color="warning.main">Ausstehend:</Typography>
                  <Chip label={totalPending} color="warning" size="small" />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight="bold">Gesamt eingeladen:</Typography>
                  <Chip label={totalInvited} size="small" />
                </Box>
              </Box>
            </Box>
          </Grid>

          {event.notes && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<Description />}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Notizen (nur für Trainer sichtbar)
                </Typography>
                <Typography variant="body2">{event.notes}</Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Position Statistics */}
      {event.attendingPlayers.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Positionsstatistik
          </Typography>
          <Grid container spacing={2}>
            {getPositionStatistics().map(({ position, count }) => (
              <Grid item xs={12} sm={6} md={4} key={position}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <SportsVolleyball sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="subtitle1">{position}</Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="h6">{count}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round((count / totalAttending) * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={1}>
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

      {/* Player Lists */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Spielerliste
        </Typography>
        
        {/* Guest Players */}
        {event.guestPlayers.length > 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} mb={2}>
              <Typography variant="subtitle1" color="info.main">
                Gastspieler ({event.guestPlayers.length})
              </Typography>
            </Box>
            <List>
              {event.guestPlayers.map((guest) => (
                <ListItem key={guest.player._id}>
                  <ListItemAvatar>
                    <Avatar>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={guest.player.name}
                    secondary={`Von Team: ${guest.fromTeam.name} • ${guest.player.position || 'Keine Position'}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      color="error"
                      onClick={() => handleRemoveGuestPlayer(guest.player._id)}
                    >
                      <Close />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </>
        )}
        
        {/* Regular Players */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">
            Eingeladene Spieler
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
        
        <List>
          {event.invitedPlayers.map((player) => {
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
                  secondary={player.position || 'Keine Position'}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                    icon={status.icon}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Add Guest Dialog */}
      <Dialog 
        open={openGuestDialog} 
        onClose={() => setOpenGuestDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Gast hinzufügen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Wählen Sie ein Team und einen Spieler aus, um ihn als Gast zu diesem Termin hinzuzufügen.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            {isMobile ? (
              // Native selects for mobile
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Team
                  </Typography>
                  <select
                    value={selectedTeam}
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      setSelectedPlayer('');
                    }}
                    style={{
                      width: '100%',
                      padding: '16.5px 14px',
                      fontSize: '16px',
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Team auswählen</option>
                    {availableTeams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Spieler
                  </Typography>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    disabled={!selectedTeam}
                    style={{
                      width: '100%',
                      padding: '16.5px 14px',
                      fontSize: '16px',
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                      borderRadius: '4px',
                      backgroundColor: selectedTeam ? 'white' : '#f5f5f5',
                      cursor: selectedTeam ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      opacity: selectedTeam ? 1 : 0.6,
                    }}
                  >
                    <option value="">Spieler auswählen</option>
                    {availablePlayers.map((player) => (
                      <option key={player._id} value={player._id}>
                        {player.name} {player.role === 'Jugendspieler' ? '(Jugendspieler)' : ''}
                      </option>
                    ))}
                  </select>
                </Box>
              </>
            ) : (
              // Material-UI selects for desktop
              <>
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
              </>
            )}
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
  children: PropTypes.node
};

export default EventDetail;