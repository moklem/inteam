import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search,
  Event,
  LocationOn,
  CalendarToday,
  FilterList,
  Clear,
  SportsVolleyball,
  Check,
  Close,
  Help
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PropTypes from 'prop-types';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Events = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, acceptInvitation, declineInvitation, markAsUnsure, loading: eventsLoading, error: eventsError } = useContext(EventContext);
  const { teams, loading: teamsLoading } = useContext(TeamContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0 && user) {
      let filtered = [...events];
      
      // Tab filter (upcoming/past)
      const now = new Date();
      if (tabValue === 0) {
        filtered = filtered.filter(event => new Date(event.startTime) > now);
      } else {
        filtered = filtered.filter(event => new Date(event.startTime) <= now);
      }
      
      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.team.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Team filter
      if (filterTeam) {
        filtered = filtered.filter(event => event.team._id === filterTeam);
      }
      
      // Type filter
      if (filterType) {
        filtered = filtered.filter(event => event.type === filterType);
      }
      
      // Sort events
      filtered.sort((a, b) => {
        if (tabValue === 1) { // Past events - newest first
          return new Date(b.startTime) - new Date(a.startTime);
        } else { // Upcoming events - soonest first
          return new Date(a.startTime) - new Date(b.startTime);
        }
      });
      
      setFilteredEvents(filtered);
    }
  }, [events, user, tabValue, searchTerm, filterTeam, filterType]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAccept = async (eventId) => {
    try {
      await acceptInvitation(eventId);
      // Events will be refreshed automatically due to the context
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDecline = async (eventId) => {
    try {
      await declineInvitation(eventId);
      // Events will be refreshed automatically due to the context
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTeam('');
    setFilterType('');
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const sameDay = start.getDate() === end.getDate() && 
                    start.getMonth() === end.getMonth() && 
                    start.getFullYear() === end.getFullYear();
    
    if (sameDay) {
      return `${format(start, 'EEEE, dd. MMMM yyyy', { locale: de })} | ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  };

  const getEventStatus = (event) => {
    if (event.attendingPlayers.some(p => p._id === user._id)) {
      return { label: 'Zugesagt', color: 'success', icon: <Check /> };
    } else if (event.declinedPlayers.some(p => p._id === user._id)) {
      return { label: 'Abgesagt', color: 'error', icon: <Close /> };
    } else if (event.unsurePlayers && event.unsurePlayers.some(p => p._id === user._id)) {
      return { label: 'Unsicher', color: 'warning', icon: <Help /> };
    } else if (event.invitedPlayers.some(p => p._id === user._id)) {
      return { label: 'Ausstehend', color: 'warning', icon: <Help /> };
    } else if (event.guestPlayers.some(g => g.player._id === user._id)) {
      return { label: 'Gast', color: 'info', icon: <SportsVolleyball /> };
    } else if (event.uninvitedPlayers && event.uninvitedPlayers.some(p => p._id === user._id)) {
      return { label: "You haven't been nominated", color: 'error', icon: <Close /> };
    } else{
      // Check if user is a team member
      const userTeams = teams.filter(team => 
        team.players.some(p => p._id === user._id)
      );
      const isTeamMember = userTeams.some(team => team._id === event.team._id);
      
      if (isTeamMember) {
        return { label: 'Team-Mitglied', color: 'default', icon: <SportsVolleyball /> };
      }
      
      return { label: 'Unbekannt', color: 'default', icon: null };
    }
  };

  // Check if user can respond to event
  const canRespondToEvent = (event, status) => {
    // Can always change response if already attending, declined, or unsure
    if (status.label === 'Zugesagt' || status.label === 'Abgesagt' || status.label === 'Unsicher') {
      return true;
    }
    
    // Can respond if invited, guest, or team member (but not yet responded)
    if (status.label === 'Ausstehend' || status.label === 'Gast' || status.label === 'Team-Mitglied') {
      return true;
    }
    
    // Can respond if event is open access
    if (event.isOpenAccess) {
      return true;
    }
    
    return false;
  };

  if (eventsLoading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Meine Termine
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="event tabs"
          sx={{ mb: 3 }}
        >
          <Tab label="Anstehende Termine" />
          <Tab label="Vergangene Termine" />
        </Tabs>
        
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Suche nach Terminen..."
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
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Team</InputLabel>
              <Select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                label="Team"
              >
                <MenuItem value="">Alle Teams</MenuItem>
                {teams.map(team => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
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
          
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              sx={{ height: '56px' }}
            >
              Filter zurücksetzen
            </Button>
          </Grid>
        </Grid>
        
        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            {tabValue === 0 
              ? 'Keine anstehenden Termine gefunden.' 
              : 'Keine vergangenen Termine gefunden.'}
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredEvents.map(event => {
              const status = getEventStatus(event);
              const canRespond = canRespondToEvent(event, status);
              const hasNotResponded = !event.attendingPlayers.some(p => p._id === user._id) && 
                                     !event.declinedPlayers.some(p => p._id === user._id);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={event._id}>
                  <EventCard
                    event={event}
                    status={status}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    formatEventDate={formatEventDate}
                    user={user}
                    canRespond={canRespond}
                    hasNotResponded={hasNotResponded}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

// EventCard Component
const EventCard = ({ event, status, onAccept, onDecline, formatEventDate, user, canRespond, hasNotResponded }) => {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" component="h3" gutterBottom>
          {event.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {event.team.name}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={event.type === 'Training' ? 'Training' : 'Spiel'} 
            color={event.type === 'Training' ? 'primary' : 'secondary'} 
            size="small"
            icon={<SportsVolleyball />}
          />
          
          {status.icon && (
            <Chip 
              label={status.label} 
              color={status.color} 
              size="small"
              icon={status.icon}
            />
          )}
          
          {event.guestPlayers.some(g => g.player._id === user._id) && (
            <Chip 
              label="Als Gast" 
              color="info" 
              size="small"
              variant="outlined"
            />
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
          to={`/player/events/${event._id}`}
        >
          Details
        </Button>
        
        {/* Show accept/decline buttons based on response status and permissions */}
        {canRespond && hasNotResponded && (
          <>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<Check />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAccept(event._id);
              }}
              sx={{ ml: 'auto' }}
            >
              Zusagen
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Close />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDecline(event._id);
              }}
            >
              Absagen
            </Button>
          </>
        )}
        
        {/* Show change response buttons for already responded events */}
        {canRespond && !hasNotResponded && (
          <>
            {status.label === 'Abgesagt' && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<Check />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAccept(event._id);
                }}
                sx={{ ml: 'auto' }}
              >
                Zusagen
              </Button>
            )}
            
            {status.label === 'Zugesagt' && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<Close />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDecline(event._id);
                }}
                sx={{ ml: 'auto' }}
              >
                Absagen
              </Button>
            )}
          </>
        )}
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
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    invitedPlayers: PropTypes.array.isRequired,
    attendingPlayers: PropTypes.array.isRequired,
    declinedPlayers: PropTypes.array.isRequired,
    guestPlayers: PropTypes.array.isRequired,
    isOpenAccess: PropTypes.bool
  }).isRequired,
  status: PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.element
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
  formatEventDate: PropTypes.func.isRequired,
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired
  }).isRequired,
  canRespond: PropTypes.bool.isRequired,
  hasNotResponded: PropTypes.bool.isRequired
};

export default Events;