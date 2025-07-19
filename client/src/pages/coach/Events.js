import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Tooltip,
  FormControlLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Event,
  Add,
  Search,
  Clear,
  LocationOn,
  Check,
  Close,
  Group,
  Edit,
  Delete,
  Repeat,
  AccessTime,
  CalendarToday,
  SportsVolleyball,
  HelpOutline
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Events = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, deleteEvent, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteRecurring, setDeleteRecurring] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

  // Set default filter to coach's teams
  useEffect(() => {
    if (teams.length > 0 && user) {
      const coachTeams = teams.filter(team => 
        team.coaches.some(coach => coach._id === user._id)
      );
      // Set all coach's teams as default filter
      setFilterTeam(coachTeams.map(team => team._id));
    }
  }, [teams, user]);

  // Filter events based on tab, search term, and filters
  useEffect(() => {
    if (events.length > 0) {
      const now = new Date();

      let filtered = [...events];

      // Tab filter
      if (tabValue === 0) { // Upcoming
        filtered = filtered.filter(event => new Date(event.startTime) > now);
      } else if (tabValue === 1) { // Past
        filtered = filtered.filter(event => new Date(event.startTime) < now);
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(term) ||
          event.location.toLowerCase().includes(term) ||
          event.team.name.toLowerCase().includes(term)
        );
      }

      // Team filter
      if (filterTeam.length > 0) {
        filtered = filtered.filter(event => filterTeam.includes(event.team._id));
      }

      // Type filter
      if (filterType) {
        filtered = filtered.filter(event => event.type === filterType);
      }

      // Sort
      filtered.sort((a, b) => {
        if (tabValue === 1) { // Past events - newest first
          return new Date(b.startTime) - new Date(a.startTime);
        } else { // Upcoming events - soonest first
          return new Date(a.startTime) - new Date(b.startTime);
        }
      });

      setFilteredEvents(filtered);
    }
  }, [events, tabValue, searchTerm, filterTeam, filterType]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterTeam([]);
    setFilterType('');
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId, deleteRecurring);
      setDeleteConfirm(null);
      setDeleteRecurring(false);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    const dateStr = start.toLocaleDateString('de-DE', dateOptions);
    const startTimeStr = start.toLocaleTimeString('de-DE', timeOptions);
    const endTimeStr = end.toLocaleTimeString('de-DE', timeOptions);
    
    return `${dateStr} | ${startTimeStr} - ${endTimeStr}`;
  };

const getAttendanceStatusChip = (event) => {
  // Count attending players (includes both team members and guests who accepted)
  const attending = event.attendingPlayers.length;
  
  // Count declined players
  const declined = event.declinedPlayers ? event.declinedPlayers.length : 0;
  
  // Count unsure players
  const unsure = event.unsurePlayers ? event.unsurePlayers.length : 0;
  
  // Calculate pending team players (invited but not yet responded)
  const pendingTeamPlayers = event.invitedPlayers.filter(player => 
    !event.attendingPlayers.some(p => p._id === player._id) &&
    !event.declinedPlayers.some(p => p._id === player._id) &&
    !(event.unsurePlayers && event.unsurePlayers.some(p => p._id === player._id))
  ).length;
  
  // Calculate pending guest players
  const pendingGuests = event.guestPlayers ? 
    event.guestPlayers.filter(guest => 
      guest.status === 'invited'
    ).length : 0;
  
  const totalPending = pendingTeamPlayers + pendingGuests;
  
  // Calculate total potential attendees: all invited team players + all guest players
  const totalTeamPlayers = event.invitedPlayers.length;
  const totalGuests = event.guestPlayers ? event.guestPlayers.length : 0;
  const total = totalTeamPlayers + totalGuests;
  
  return (
    <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
      {/* Attending chip */}
      <Chip
        icon={<Check sx={{ fontSize: 16 }} />}
        label={attending}
        size="small"
        color="success"
        variant={attending > 0 ? "filled" : "outlined"}
        title={`${attending} Spieler haben zugesagt`}
        sx={{ minWidth: 50 }}
      />
      
      {/* Pending chip */}
      <Chip
        icon={<HelpOutline sx={{ fontSize: 16 }} />}
        label={totalPending}
        size="small"
        variant={totalPending > 0 ? "filled" : "outlined"}
        title={`${totalPending} Spieler haben noch nicht geantwortet`}
        sx={{ 
          minWidth: 50,
          backgroundColor: totalPending > 0 ? 'grey.500' : 'transparent',
          color: totalPending > 0 ? 'white' : 'grey.500',
          borderColor: 'grey.500',
          '& .MuiChip-icon': {
            color: totalPending > 0 ? 'white' : 'grey.500'
          }
        }}
      />
      
      {/* Unsure chip */}
      <Chip
        icon={<HelpOutline sx={{ fontSize: 16 }} />}
        label={unsure}
        size="small"
        color="warning"
        variant={unsure > 0 ? "filled" : "outlined"}
        title={`${unsure} Spieler sind unsicher`}
        sx={{ minWidth: 50 }}
      />
      
      {/* Declined chip */}
      <Chip
        icon={<Close sx={{ fontSize: 16 }} />}
        label={declined}
        size="small"
        color="error"
        variant={declined > 0 ? "filled" : "outlined"}
        title={`${declined} Spieler haben abgesagt`}
        sx={{ minWidth: 50 }}
      />
    </Box>
  );
};

  if (eventsLoading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Termine
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          component={RouterLink}
          to="/coach/events/create"
        >
          Neuer Termin
        </Button>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        {/* Tabs */}
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Kommende Termine" />
          <Tab label="Vergangene Termine" />
        </Tabs>
        
        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Termine durchsuchen..."
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
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Teams</InputLabel>
                <Select
                  multiple
                  value={filterTeam}
                  onChange={(e) => {
                    const value = e.target.value;
                    const lastValue = value[value.length - 1];
                    
                    // Check if "all" was selected
                    if (lastValue === 'all' || (value.includes('all') && value.length === 1)) {
                      const coachTeams = teams.filter(team => 
                        team.coaches.some(coach => coach._id === user?._id)
                      );
                      // If some teams are selected, select all. If all are selected, deselect all
                      if (filterTeam.length < coachTeams.length) {
                        setFilterTeam(coachTeams.map(team => team._id));
                      } else {
                        setFilterTeam([]);
                      }
                    } else {
                      // Remove 'all' from the array if it exists and set the regular selection
                      setFilterTeam(value.filter(v => v !== 'all'));
                    }
                  }}
                  input={<OutlinedInput label="Teams" />}
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return "Alle Teams";
                    }
                    const selectedTeamNames = teams
                      .filter(team => selected.includes(team._id))
                      .map(team => team.name);
                    return selectedTeamNames.join(', ');
                  }}
                >
                  <MenuItem value="all">
                    <Checkbox 
                      checked={filterTeam.length === teams.filter(team => 
                        team.coaches.some(coach => coach._id === user?._id)
                      ).length && filterTeam.length > 0} 
                    />
                    <ListItemText primary="Alle Teams auswählen" />
                  </MenuItem>
                  {teams.filter(team => 
                    team.coaches.some(coach => coach._id === user?._id)
                  ).map(team => (
                    <MenuItem key={team._id} value={team._id}>
                      <Checkbox checked={filterTeam.includes(team._id)} />
                      <ListItemText primary={team.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Typ</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Typ"
                >
                  <MenuItem value="">Alle Typen</MenuItem>
                  <MenuItem value="Training">Training</MenuItem>
                  <MenuItem value="Game">Spiel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<Clear />}
                sx={{ height: '56px' }}
              >
                Filter zurücksetzen
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <Grid container spacing={3}>
            {filteredEvents.map(event => (
              <Grid item xs={12} sm={6} md={4} key={event._id}>
                <EventCard 
                  event={event} 
                  onDelete={() => setDeleteConfirm(event)}
                  formatEventDate={formatEventDate}
                  getAttendanceStatusChip={getAttendanceStatusChip}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {tabValue === 0 ? 'Keine kommenden Termine gefunden.' : 'Keine vergangenen Termine gefunden.'}
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => {
          setDeleteConfirm(null);
          setDeleteRecurring(false);
        }}
      >
        <DialogTitle>Termin löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie den Termin &ldquo;{deleteConfirm?.title}&rdquo; wirklich löschen?
          </Typography>
          
          {(deleteConfirm?.isRecurring || deleteConfirm?.recurringGroupId) && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteRecurring}
                  onChange={(e) => setDeleteRecurring(e.target.checked)}
                />
              }
              label="Alle Termine der Serie löschen"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteConfirm(null);
            setDeleteRecurring(false);
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => handleDeleteEvent(deleteConfirm._id)} 
            color="error"
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
      

    </Box>
  );
};

// Event Card Component
const EventCard = ({ event, onDelete, formatEventDate, getAttendanceStatusChip }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main',
              mr: 1
            }}
          >
            <Event />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
              {event.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {event.team.name}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={event.type === 'Training' ? 'Training' : 'Spiel'} 
            color={event.type === 'Training' ? 'primary' : 'secondary'} 
            size="small"
            icon={<SportsVolleyball />}
          />
          
          {getAttendanceStatusChip(event)}
          
          {event.isRecurring && (
            <Tooltip title="Teil einer wiederkehrenden Serie">
              <Chip 
                label="Serie" 
                size="small" 
                icon={<Repeat />}
                variant="outlined"
              />
            </Tooltip>
          )}
          
          {event.isRecurringInstance && (
            <Tooltip title="Dies ist ein wiederkehrender Termin">
              <Chip 
                label="Serie" 
                size="small" 
                icon={<Repeat />}
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CalendarToday sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatEventDate(event.startTime, event.endTime)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {event.location}
          </Typography>
        </Box>
      </CardContent>
      
      <Divider />
      
      <CardActions>
        <Button 
          size="small" 
          component={RouterLink} 
          to={`/coach/events/${event._id}`}
        >
          Details
        </Button>
        <Button 
          size="small" 
          component={RouterLink} 
          to={`/coach/events/edit/${event._id}`}
          color="primary"
        >
          Bearbeiten
        </Button>
        <IconButton
          size="small"
          color="error"
          onClick={onDelete}
          sx={{ ml: 'auto' }}
        >
          <Delete />
        </IconButton>
      </CardActions>
    </Card>
  );
};

// PropTypes for EventCard component
EventCard.propTypes = {
  event: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    endTime: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    team: PropTypes.shape({
      name: PropTypes.string.isRequired
    }).isRequired,
    isRecurring: PropTypes.bool,
    isRecurringInstance: PropTypes.bool,
    attendingPlayers: PropTypes.array.isRequired,
    invitedPlayers: PropTypes.array.isRequired
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  formatEventDate: PropTypes.func.isRequired,
  getAttendanceStatusChip: PropTypes.func.isRequired
};

export default Events;