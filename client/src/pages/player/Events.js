import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Button,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Event,
  Check,
  Close,
  Help,
  Search,
  FilterList,
  Clear,
  SportsVolleyball,
  CalendarToday,
  LocationOn
} from '@mui/icons-material';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Events = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, acceptInvitation, declineInvitation, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

  // Filter events based on tab, search term, and filters
  useEffect(() => {
    if (events.length > 0 && user) {
      const now = new Date();
      
      let filtered = [...events];
      
      // Filter by tab
      if (tabValue === 0) { // Upcoming
        filtered = filtered.filter(event => isAfter(new Date(event.startTime), now));
      } else if (tabValue === 1) { // Past
        filtered = filtered.filter(event => isBefore(new Date(event.startTime), now));
      } else if (tabValue === 2) { // Pending
        filtered = filtered.filter(event => 
          isAfter(new Date(event.startTime), now) && 
          event.invitedPlayers.some(p => p._id === user._id) &&
          !event.attendingPlayers.some(p => p._id === user._id) &&
          !event.declinedPlayers.some(p => p._id === user._id)
        );
      }
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(event => 
          event.title.toLowerCase().includes(term) ||
          event.location.toLowerCase().includes(term) ||
          event.team.name.toLowerCase().includes(term)
        );
      }
      
      // Filter by team
      if (filterTeam) {
        filtered = filtered.filter(event => event.team._id === filterTeam);
      }
      
      // Filter by type
      if (filterType) {
        filtered = filtered.filter(event => event.type === filterType);
      }
      
      // Sort by date
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
    } else if (event.invitedPlayers.some(p => p._id === user._id)) {
      return { label: 'Ausstehend', color: 'warning', icon: <Help /> };
    } else if (event.guestPlayers.some(g => g.player._id === user._id)) {
      return { label: 'Gast', color: 'info', icon: <SportsVolleyball /> };
    } else {
      return { label: 'Unbekannt', color: 'default', icon: null };
    }
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
          <Tab label="Kommende" />
          <Tab label="Vergangene" />
          <Tab label="Ausstehende Einladungen" />
        </Tabs>
        
        <Box sx={{ mb: 2 }}>
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
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    edge="end"
                  >
                    <FilterList />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {showFilters && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Team filtern</InputLabel>
                <Select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  label="Team filtern"
                >
                  <MenuItem value="">
                    <em>Alle Teams</em>
                  </MenuItem>
                  {teams.map(team => (
                    <MenuItem key={team._id} value={team._id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Typ filtern</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Typ filtern"
                >
                  <MenuItem value="">
                    <em>Alle Typen</em>
                  </MenuItem>
                  <MenuItem value="Training">Training</MenuItem>
                  <MenuItem value="Game">Spiel</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={clearFilters}
              >
                Filter zurücksetzen
              </Button>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {filteredEvents.length > 0 ? (
          <Grid container spacing={3}>
            {filteredEvents.map(event => {
              const status = getEventStatus(event);
              const isPending = tabValue === 2 || (
                event.invitedPlayers.some(p => p._id === user._id) &&
                !event.attendingPlayers.some(p => p._id === user._id) &&
                !event.declinedPlayers.some(p => p._id === user._id)
              );
              
              return (
                <Grid item xs={12} sm={6} md={4} key={event._id}>
                  <EventCard 
                    event={event}
                    status={status}
                    isPending={isPending}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    formatEventDate={formatEventDate}
                    user={user}
                  />
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {tabValue === 0 ? 'Keine kommenden Termine gefunden.' :
               tabValue === 1 ? 'Keine vergangenen Termine gefunden.' :
               'Keine ausstehenden Einladungen gefunden.'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

// Event Card Component
const EventCard = ({ event, status, isPending, onAccept, onDecline, formatEventDate, user }) => {
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
        
        {isPending && (
          <>
            {status.label === 'Ausstehend' && (
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
      name: PropTypes.string.isRequired
    }).isRequired,
    invitedPlayers: PropTypes.array.isRequired,
    attendingPlayers: PropTypes.array.isRequired,
    declinedPlayers: PropTypes.array.isRequired,
    guestPlayers: PropTypes.array.isRequired
  }).isRequired,
  status: PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.element
  }).isRequired,
  isPending: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
  formatEventDate: PropTypes.func.isRequired,
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired
  }).isRequired
};

export default Events;