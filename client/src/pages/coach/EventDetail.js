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
  
  const { events, loading: eventLoading, error: eventError, deleteEvent, addGuestPlayer } = useContext(EventContext);
  const { teams, loading: teamLoading } = useContext(TeamContext);
  const { user } = useContext(AuthContext);
  
  const [event, setEvent] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddGuestDialog, setOpenAddGuestDialog] = useState(false);
  const [deleteRecurring, setDeleteRecurring] = useState(false);
  const [selectedGuestPlayer, setSelectedGuestPlayer] = useState(null);
  const [guestFilterTeam, setGuestFilterTeam] = useState('');
  const [guestFilterPosition, setGuestFilterPosition] = useState('');
  const [guestFilterPlayerType, setGuestFilterPlayerType] = useState('');
  const [allPlayers, setAllPlayers] = useState([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState('');

  useEffect(() => {
    const foundEvent = events.find(e => e._id === id);
    setEvent(foundEvent);
  }, [events, id]);

  // Load all players when dialog opens
  useEffect(() => {
    const loadPlayers = async () => {
      if (openAddGuestDialog) {
        try {
          const response = await axios.get('/users/players');
          setAllPlayers(response.data);
        } catch (error) {
          console.error('Error loading players:', error);
        }
      }
    };
    loadPlayers();
  }, [openAddGuestDialog]);

  // Filter function for guest players
  const getFilteredGuestPlayers = () => {
    if (!event || !allPlayers) return [];
    
    // Only show players who don't already have access to the event
    // This excludes: invited players, existing guests, and team members
    return allPlayers.filter(player => {
      // Don't show players already invited to the event
      if (event.invitedPlayers.some(p => p._id === player._id)) {
        return false;
      }
      
      // Don't show players already added as guests
      if (event.guestPlayers?.some(g => g.player._id === player._id)) {
        return false;
      }
      
      // Don't show players who are members of the event's team
      // (they should already be invited if they need access)
      const eventTeamId = event.team._id || event.team;
      if (player.teams?.some(t => t._id === eventTeamId)) {
        return false;
      }
      
      // Apply team filter - show only players from selected team
      if (guestFilterTeam && !player.teams?.some(t => t._id === guestFilterTeam)) {
        return false;
      }
      
      // Apply position filter
      if (guestFilterPosition && player.position !== guestFilterPosition) {
        return false;
      }
      
      // Apply player type filter
      if (guestFilterPlayerType && player.role !== guestFilterPlayerType) {
        return false;
      }
      
      return true;
    });
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
    if (!selectedGuestPlayer) {
      setGuestError('Bitte wählen Sie einen Spieler aus');
      return;
    }

    setAddingGuest(true);
    setGuestError('');

    try {
      // Find the team from which the guest is being added
      const fromTeamId = selectedGuestPlayer.teams && selectedGuestPlayer.teams.length > 0 
        ? selectedGuestPlayer.teams[0]._id 
        : event.team._id;

      await addGuestPlayer(id, selectedGuestPlayer._id, fromTeamId);
      
      // Refresh the event data
      const response = await axios.get(`/events/${id}`);
      setEvent(response.data);
      
      // Reset form
      setSelectedGuestPlayer(null);
      setGuestFilterTeam('');
      setGuestFilterPosition('');
      setGuestFilterPlayerType('');
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
    
    return `${dateStr}, ${startTimeStr} - ${endTimeStr} Uhr`;
  };

  const getPlayerStatus = (player) => {
    if (event.attendingPlayers.some(p => p._id === player._id)) {
      return { label: 'Zugesagt', color: 'success', icon: <CheckCircle /> };
    }
    if (event.declinedPlayers.some(p => p._id === player._id)) {
      return { label: 'Abgesagt', color: 'error', icon: <Cancel /> };
    }
    return { label: 'Ausstehend', color: 'warning', icon: <Help /> };
  };

  const getPositionStatistics = () => {
    const positionCount = {};
    
    event.attendingPlayers.forEach(player => {
      const position = player.position || 'Keine Position';
      positionCount[position] = (positionCount[position] || 0) + 1;
    });
    
    // Sort by count descending
    return Object.entries(positionCount)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [position, count]) => {
        acc[position] = count;
        return acc;
      }, {});
  };

  if (eventLoading || teamLoading || !event) {
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

  const team = teams.find(t => t._id === event.team._id || t._id === event.team);
  const isCoach = team && team.coaches.some(c => c._id === user._id);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate('/coach/events')}
              sx={{ mr: 1 }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              {event.title}
            </Typography>
          </Box>
          {isCoach && (
            <Box>
              <IconButton
                component={RouterLink}
                to={`/coach/events/${id}/edit`}
                color="primary"
              >
                <Edit />
              </IconButton>
              <IconButton
                onClick={() => setOpenDeleteDialog(true)}
                color="error"
              >
                <Delete />
              </IconButton>
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={event.type === 'Training' ? 'Training' : 'Spiel'} 
            color={event.type === 'Training' ? 'primary' : 'secondary'}
          />
          <Chip 
            label={team ? team.name : 'Team nicht gefunden'} 
            icon={<Group />}
          />
          {event.isOpenAccess && (
            <Chip label="Offener Zugang" color="success" />
          )}
        </Box>
      </Paper>

      {/* Event Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Termindetails
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Event sx={{ mr: 1 }} />
                <Typography>{formatEventDate(event.startTime, event.endTime)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationOn sx={{ mr: 1 }} />
                <Typography>{event.location}</Typography>
              </Box>
              
              {event.description && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <Description sx={{ mr: 1, mt: 0.5 }} />
                  <Typography>{event.description}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Teilnehmerübersicht
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Eingeladen:</Typography>
                <Typography>{event.invitedPlayers.length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Zugesagt:</Typography>
                <Typography color="success.main">{event.attendingPlayers.length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Abgesagt:</Typography>
                <Typography color="error.main">{event.declinedPlayers.length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Ausstehend:</Typography>
                <Typography color="warning.main">
                  {event.invitedPlayers.length - event.attendingPlayers.length - event.declinedPlayers.length}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Antwortquote: {Math.round(((event.attendingPlayers.length + event.declinedPlayers.length) / event.invitedPlayers.length) * 100)}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Position Statistics */}
      {event.attendingPlayers.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Positionsstatistik
          </Typography>
          
          {event.invitedPlayers.length > (event.attendingPlayers.length + event.declinedPlayers.length) && (
            <Alert severity="info" sx={{ mb: 2 }}>
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
            Gast aus anderem Team hinzufügen
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
        onClose={() => {
          setOpenAddGuestDialog(false);
          setSelectedGuestPlayer(null);
          setGuestFilterTeam('');
          setGuestFilterPosition('');
          setGuestFilterPlayerType('');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gastspieler aus anderen Teams hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Filter Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Nach Team filtern</InputLabel>
                <Select
                  value={guestFilterTeam}
                  onChange={(e) => setGuestFilterTeam(e.target.value)}
                  label="Nach Team filtern"
                >
                  <MenuItem value="">Alle anderen Teams</MenuItem>
                  {teams.filter(t => t._id !== (event.team._id || event.team)).map(team => (
                    <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Position filtern</InputLabel>
                <Select
                  value={guestFilterPosition}
                  onChange={(e) => setGuestFilterPosition(e.target.value)}
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
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Spielertyp filtern</InputLabel>
                <Select
                  value={guestFilterPlayerType}
                  onChange={(e) => setGuestFilterPlayerType(e.target.value)}
                  label="Spielertyp filtern"
                >
                  <MenuItem value="">Alle Spielertypen</MenuItem>
                  <MenuItem value="Spieler">Spieler</MenuItem>
                  <MenuItem value="Jugendspieler">Jugendspieler</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            {/* Player List */}
            <Box sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {guestError && (
                <Alert severity="error" sx={{ m: 2 }}>
                  {guestError}
                </Alert>
              )}
              <List>
                {getFilteredGuestPlayers().length > 0 ? (
                  getFilteredGuestPlayers().map((player) => (
                    <ListItem
                      key={player._id}
                      button
                      selected={selectedGuestPlayer?._id === player._id}
                      onClick={() => setSelectedGuestPlayer(player)}
                      sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main' }}>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={player.name}
                        secondary={
                          <Box component="span">
                            {player.position && <Chip label={player.position} size="small" sx={{ mr: 1 }} />}
                            <Chip label={player.role} size="small" color={player.role === 'Jugendspieler' ? 'secondary' : 'default'} sx={{ mr: 1 }} />
                            {player.teams?.map(team => (
                              <Chip key={team._id} label={team.name} size="small" variant="outlined" sx={{ mr: 0.5 }} />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText 
                      primary="Keine Spieler gefunden" 
                      secondary="Nur Spieler aus anderen Teams können als Gäste hinzugefügt werden"
                      sx={{ textAlign: 'center' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
            
            {selectedGuestPlayer && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2">
                  Ausgewählt: <strong>{selectedGuestPlayer.name}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAddGuestDialog(false);
            setSelectedGuestPlayer(null);
            setGuestFilterTeam('');
            setGuestFilterPosition('');
            setGuestFilterPlayerType('');
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddGuest} 
            variant="contained"
            disabled={!selectedGuestPlayer || addingGuest}
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