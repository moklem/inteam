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
  useMediaQuery
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
  PersonAdd
} from '@mui/icons-material';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';
import { AuthContext } from '../../context/AuthContext';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { events, loading: eventLoading, error: eventError, deleteEvent, addGuestToEvent } = useContext(EventContext);
  const { teams, loading: teamLoading } = useContext(TeamContext);
  const { user } = useContext(AuthContext);
  
  const [event, setEvent] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddGuestDialog, setOpenAddGuestDialog] = useState(false);
  const [deleteRecurring, setDeleteRecurring] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState('');

  useEffect(() => {
    const foundEvent = events.find(e => e._id === id);
    setEvent(foundEvent);
  }, [events, id]);

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent(id, deleteRecurring);
      navigate('/coach/events');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) {
      setGuestError('Bitte geben Sie einen Namen ein');
      return;
    }

    setAddingGuest(true);
    setGuestError('');

    try {
      await addGuestToEvent(id, { 
        name: guestName.trim(), 
        position: guestPosition || 'Keine Position' 
      });
      
      // Refresh the event data
      const response = await axios.get(`/events/${id}`);
      setEvent(response.data);
      
      // Reset form
      setGuestName('');
      setGuestPosition('');
      setOpenAddGuestDialog(false);
    } catch (error) {
      console.error('Error adding guest:', error);
      setGuestError(error.response?.data?.message || 'Fehler beim Hinzufügen des Gastspielers');
    } finally {
      setAddingGuest(false);
    }
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
    
    return `${dateStr} | ${startTimeStr} - ${endTimeStr} Uhr`;
  };

  const getPlayerStatus = (player) => {
    if (event.attendingPlayers.some(p => p._id === player._id)) {
      return { label: 'Zugesagt', color: 'success', icon: <CheckCircle /> };
    } else if (event.declinedPlayers.some(p => p._id === player._id)) {
      return { label: 'Abgesagt', color: 'error', icon: <Cancel /> };
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
      <Box sx={{ mt: 2 }}>
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
      <Box sx={{ mt: 2 }}>
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
    <Box sx={{ pb: isMobile ? 8 : 2 }}>
      {/* Header without custom AppBar - just title and back button */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={() => navigate('/coach/events')} 
            sx={{ mr: 1 }}
            aria-label="Zurück"
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            Termindetails
          </Typography>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        {/* Event Info Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main', mr: 2 }}>
              <Event />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h2">
                {event.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip 
                  label={event.team.name} 
                  color="primary" 
                  size="small"
                  icon={<Group />}
                />
                <Chip 
                  label={event.type === 'Training' ? 'Training' : 'Spiel'} 
                  color={event.type === 'Training' ? 'primary' : 'secondary'} 
                  variant="outlined"
                  size="small"
                  icon={<SportsVolleyball />}
                />
              </Box>
            </Box>
          </Box>

          {/* Action buttons moved here for better mobile layout */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              component={RouterLink}
              to={`/coach/events/edit/${event._id}`}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
            >
              Bearbeiten
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setOpenDeleteDialog(true)}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
            >
              Löschen
            </Button>
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
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Teilnehmer ({event.attendingPlayers.length})
            </Typography>
            
            {event.attendingPlayers.length > 0 ? (
              <List dense>
                {event.attendingPlayers.map((player) => (
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
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Noch keine Zusagen
              </Typography>
            )}
          </Grid>
        </Grid>
        
        {event.isRecurring && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              Dieser Termin ist Teil einer wiederkehrenden Serie.
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Position Statistics - if there are attending players */}
      {event.attendingPlayers.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Positionsstatistik
          </Typography>
          
          {event.invitedPlayers.length > event.attendingPlayers.length + event.declinedPlayers.length && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Diese Statistik basiert auf {event.attendingPlayers.length} von {event.invitedPlayers.length} eingeladenen Spielern.
              Nicht alle Spieler haben bisher geantwortet.
            </Alert>
          )}
          
          <Grid container spacing={2}>
            {Object.entries(getPositionStatistics()).map(([position, count]) => (
              <Grid item xs={12} sm={6} md={4} key={position}>
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
        </List>
      </Paper>

      {/* Add Guest Dialog */}
      <Dialog 
        open={openAddGuestDialog} 
        onClose={() => setOpenAddGuestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gastspieler hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              error={!!guestError}
              helperText={guestError}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                value={guestPosition}
                onChange={(e) => setGuestPosition(e.target.value)}
                label="Position"
              >
                <MenuItem value="">Keine Position</MenuItem>
                <MenuItem value="Außenangreifer">Außenangreifer</MenuItem>
                <MenuItem value="Diagonalangreifer">Diagonalangreifer</MenuItem>
                <MenuItem value="Mittelblocker">Mittelblocker</MenuItem>
                <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                <MenuItem value="Libero">Libero</MenuItem>
                <MenuItem value="Universalspieler">Universalspieler</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddGuestDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddGuest} 
            variant="contained"
            disabled={addingGuest}
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
            Möchten Sie den Termin "{event.title}" wirklich löschen? 
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