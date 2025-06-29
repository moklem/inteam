import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
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
  Button,
  Divider,
  Tooltip,
  Grid,
  FormControlLabel,
  Checkbox
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
  Repeat
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
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteRecurring, setDeleteRecurring] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

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
      if (filterTeam) {
        filtered = filtered.filter(event => event.team._id === filterTeam);
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
    setFilterTeam('');
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
    
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    const dateStr = start.toLocaleDateString('de-DE', dateOptions);
    const startTimeStr = start.toLocaleTimeString('de-DE', timeOptions);
    const endTimeStr = end.toLocaleTimeString('de-DE', timeOptions);
    
    return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="event tabs">
            <Tab label="Kommende" />
            <Tab label="Vergangene" />
          </Tabs>
        </Box>
        
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
              <FormControl fullWidth>
                <InputLabel id="team-filter-label">Team</InputLabel>
                <Select
                  labelId="team-filter-label"
                  value={filterTeam}
                  label="Team"
                  onChange={(e) => setFilterTeam(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Alle Teams</em>
                  </MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="type-filter-label">Typ</InputLabel>
                <Select
                  labelId="type-filter-label"
                  value={filterType}
                  label="Typ"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Alle Typen</em>
                  </MenuItem>
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
                disabled={!searchTerm && !filterTeam && !filterType}
                sx={{ height: '56px' }}
              >
                Filter zurücksetzen
              </Button>
            </Grid>
          </Grid>
        </Box>

        {filteredEvents.length > 0 ? (
          <List>
            {filteredEvents.map(event => (
              <React.Fragment key={event._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: 'background.paper',
                    mb: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main' }}>
                      <Event />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                        {(event.isRecurring || event.isRecurringInstance) && (
                          <Tooltip title={event.isRecurring ? 'Wiederkehrender Termin (Haupttermin)' : 'Teil einer Terminserie'}>
                            <Chip
                              icon={<Repeat />}
                              label={event.isRecurring ? 'Serie' : 'Serientermin'}
                              size="small"
                              color="info"
                              variant={event.isRecurring ? 'filled' : 'outlined'}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {formatEventDate(event.startTime, event.endTime)}
                        </Typography>
                        <br />
                        {event.location}
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Chip
                            icon={<Check />}
                            label={`${event.attendingPlayers.length} Zusagen`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            icon={<Close />}
                            label={`${event.declinedPlayers.length} Absagen`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                          <Chip
                            icon={<Group />}
                            label={`${event.guestPlayers.length} Gäste`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Box>
                      </>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Event />}
                      component={RouterLink}
                      to={`/coach/events/${event._id}`}
                      sx={{ mr: 1 }}
                    >
                      Details
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      component={RouterLink}
                      to={`/coach/events/edit/${event._id}`}
                      sx={{ mr: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Delete />}
                      color="error"
                      onClick={() => setDeleteConfirm(event._id)}
                      disabled={deleteConfirm === event._id}
                    >
                      Löschen
                    </Button>
                  </Box>
                </ListItem>

                {deleteConfirm === event._id && (
                  <Box sx={{
                    p: 2,
                    mb: 1,
                    bgcolor: 'error.light',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box>
                      <Typography variant="body2" color="error.contrastText">
                        Möchten Sie diesen Termin wirklich löschen?
                      </Typography>
                      {(event.isRecurring || event.isRecurringInstance) && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={deleteRecurring}
                              onChange={(e) => setDeleteRecurring(e.target.checked)}
                              sx={{ color: 'error.contrastText' }}
                            />
                          }
                          label="Alle Termine der Serie löschen"
                          sx={{ color: 'error.contrastText', mt: 1 }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Button
                        variant="contained"
                        size="small"
                        color="error"
                        onClick={() => handleDeleteEvent(event._id)}
                        sx={{ mr: 1 }}
                      >
                        Bestätigen
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setDeleteConfirm(null);
                          setDeleteRecurring(false);
                        }}
                        sx={{ borderColor: 'error.contrastText', color: 'error.contrastText' }}
                      >
                        Abbrechen
                      </Button>
                    </Box>
                  </Box>
                )}
                
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Keine Termine gefunden.
          </Typography>
        )}
      </Paper>
      
    
    </Box>
  );
};

export default Events;
