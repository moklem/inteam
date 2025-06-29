import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
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
  SportsVolleyball
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
        Termine
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Kommende" />
          <Tab label="Vergangene" />
          <Tab label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <span>Ausstehend</span>
              {events.filter(event => 
                isAfter(new Date(event.startTime), new Date()) && 
                event.invitedPlayers.some(p => p._id === user._id) &&
                !event.attendingPlayers.some(p => p._id === user._id) &&
                !event.declinedPlayers.some(p => p._id === user._id)
              ).length > 0 && (
                <Chip 
                  label={events.filter(event => 
                    isAfter(new Date(event.startTime), new Date()) && 
                    event.invitedPlayers.some(p => p._id === user._id) &&
                    !event.attendingPlayers.some(p => p._id === user._id) &&
                    !event.declinedPlayers.some(p => p._id === user._id)
                  ).length} 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          } />
        </Tabs>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
            size="small"
          />
          <IconButton 
            color={showFilters ? 'primary' : 'default'} 
            onClick={() => setShowFilters(!showFilters)}
            sx={{ ml: 1 }}
          >
            <FilterList />
          </IconButton>
        </Box>
        
        {showFilters && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="team-filter-label">Team</InputLabel>
              <Select
                labelId="team-filter-label"
                id="team-filter"
                value={filterTeam}
                label="Team"
                onChange={(e) => setFilterTeam(e.target.value)}
              >
                <MenuItem value="">Alle Teams</MenuItem>
                {teams.map(team => (
                  <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="type-filter-label">Typ</InputLabel>
              <Select
                labelId="type-filter-label"
                id="type-filter"
                value={filterType}
                label="Typ"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">Alle Typen</MenuItem>
                <MenuItem value="Training">Training</MenuItem>
                <MenuItem value="Game">Spiel</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              startIcon={<Clear />} 
              onClick={clearFilters}
              size="small"
            >
              Filter zurücksetzen
            </Button>
          </Box>
        )}
        
        {filteredEvents.length > 0 ? (
          <List>
            {filteredEvents.map(event => {
              const status = getEventStatus(event);
              const isPending = tabValue === 2 || (
                event.invitedPlayers.some(p => p._id === user._id) &&
                !event.attendingPlayers.some(p => p._id === user._id) &&
                !event.declinedPlayers.some(p => p._id === user._id)
              );
              
              return (
                <React.Fragment key={event._id}>
                  <ListItem 
                    alignItems="flex-start" 
                    sx={{ 
                      bgcolor: 'background.paper', 
                      borderRadius: 1,
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' }
                    }}
                    component={RouterLink}
                    to={`/player/events/${event._id}`}
                    button
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main' }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="subtitle1" component="span">
                            {event.title}
                          </Typography>
                          <Chip 
                            label={event.team.name} 
                            size="small" 
                            color="primary" 
                          />
                          <Chip 
                            label={event.type === 'Training' ? 'Training' : 'Spiel'} 
                            size="small" 
                            color={event.type === 'Training' ? 'primary' : 'secondary'} 
                            variant="outlined"
                          />
                          <Chip 
                            label={status.label} 
                            size="small" 
                            color={status.color} 
                            icon={status.icon}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {formatEventDate(event.startTime, event.endTime)}
                          </Typography>
                          <br />
                          {event.location}
                        </>
                      }
                    />
                    
                    {isPending && (
                      <Box sx={{ 
                        display: 'flex', 
                        mt: { xs: 2, sm: 0 },
                        ml: { xs: 0, sm: 2 }
                      }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<Check />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAccept(event._id);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Zusagen
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Close />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDecline(event._id);
                          }}
                        >
                          Absagen
                        </Button>
                      </Box>
                    )}
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                </React.Fragment>
              );
            })}
          </List>
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

export default Events;
