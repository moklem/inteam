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
  CircularProgress,
  Divider,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Event,
  Check,
  Close,
  Help,
  AccessTime,
  CalendarToday
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Events = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, acceptInvitation, declineInvitation, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

  useEffect(() => {
    if (events.length > 0 && user) {
      const now = new Date();
      
      // Get user's team IDs
      const userTeamIds = teams
        .filter(team => 
          team.players.some(p => p._id === user._id) || 
          team.coaches.some(c => c._id === user._id)
        )
        .map(team => team._id);
      
      // Filter events based on user's involvement
      const userEvents = events.filter(event => {
        const eventTeamId = event.team._id || event.team;
        const isUserTeam = userTeamIds.includes(eventTeamId);
        const isInvited = event.invitedPlayers.some(p => p._id === user._id);
        const isOpenAccess = event.isOpenAccess;
        const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
        
        return isUserTeam || isInvited || isOpenAccess || isGuest;
      });
      
      // Categorize events
      const upcoming = userEvents
        .filter(event => new Date(event.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      
      const past = userEvents
        .filter(event => new Date(event.startTime) <= now)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      const pending = userEvents
        .filter(event => {
          const isFuture = new Date(event.startTime) > now;
          const hasNotResponded = !event.attendingPlayers.some(p => p._id === user._id) && 
                                  !event.declinedPlayers.some(p => p._id === user._id);
          return isFuture && hasNotResponded;
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      
      setUpcomingEvents(upcoming);
      setPastEvents(past);
      setPendingEvents(pending);
    }
  }, [events, teams, user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAccept = async (eventId) => {
    try {
      await acceptInvitation(eventId);
      await fetchEvents();
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDecline = async (eventId) => {
    try {
      await declineInvitation(eventId);
      await fetchEvents();
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const formatEventDate = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return `${format(start, 'EEEE, dd. MMMM', { locale: de })} | ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  };

  const getUserEventStatus = (event) => {
    if (!user) return null;
    
    const isAttending = event.attendingPlayers.some(p => p._id === user._id);
    const hasDeclined = event.declinedPlayers.some(p => p._id === user._id);
    const isInvited = event.invitedPlayers.some(p => p._id === user._id);
    const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
    
    if (isAttending) {
      return { status: 'attending', label: 'Zugesagt', color: 'success', icon: <Check /> };
    } else if (hasDeclined) {
      return { status: 'declined', label: 'Abgesagt', color: 'error', icon: <Close /> };
    } else if (isInvited || event.isOpenAccess || isGuest) {
      return { status: 'pending', label: 'Offen', color: 'warning', icon: <Help /> };
    }
    
    return null;
  };

  const renderEventActions = (event, status) => {
    const isPast = new Date(event.startTime) <= new Date();
    
    // Don't show actions for past events
    if (isPast) return null;
    
    // Show different actions based on current status
    if (status?.status === 'attending') {
      return (
        <Tooltip title="Doch absagen">
          <IconButton
            color="error"
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDecline(event._id);
            }}
          >
            <Close />
          </IconButton>
        </Tooltip>
      );
    } else if (status?.status === 'declined') {
      return (
        <Tooltip title="Doch zusagen">
          <IconButton
            color="success"
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAccept(event._id);
            }}
          >
            <Check />
          </IconButton>
        </Tooltip>
      );
    } else if (status?.status === 'pending') {
      return (
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Zusagen">
            <IconButton
              color="success"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAccept(event._id);
              }}
              sx={{ mr: 1 }}
            >
              <Check />
            </IconButton>
          </Tooltip>
          <Tooltip title="Absagen">
            <IconButton
              color="error"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDecline(event._id);
              }}
            >
              <Close />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }
    
    return null;
  };

  if (eventsLoading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const getEventsList = () => {
    switch (tabValue) {
      case 0:
        return upcomingEvents;
      case 1:
        return pastEvents;
      case 2:
        return pendingEvents;
      default:
        return [];
    }
  };

  const eventsList = getEventsList();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Termine
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            label={`Kommende (${upcomingEvents.length})`} 
            icon={<AccessTime />} 
            iconPosition="start" 
          />
          <Tab 
            label={`Vergangene (${pastEvents.length})`} 
            icon={<CalendarToday />} 
            iconPosition="start" 
          />
          <Tab 
            label={`Ausstehend (${pendingEvents.length})`} 
            icon={<Help />} 
            iconPosition="start" 
          />
        </Tabs>
        
        {eventsList.length > 0 ? (
          <List sx={{ p: 2 }}>
            {eventsList.map((event, index) => {
              const status = getUserEventStatus(event);
              const isPending = status?.status === 'pending';
              
              return (
                <React.Fragment key={event._id}>
                  <ListItem
                    alignItems="flex-start"
                    component={RouterLink}
                    to={`/player/events/${event._id}`}
                    button
                    sx={{
                      borderRadius: 1,
                      mb: 1,
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
                          {status && (
                            <Chip 
                              label={status.label} 
                              size="small" 
                              color={status.color} 
                              icon={status.icon}
                            />
                          )}
                          {event.isOpenAccess && (
                            <Chip 
                              label="Offenes Training" 
                              size="small" 
                              color="info" 
                              variant="outlined"
                            />
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
                        </>
                      }
                    />
                    {renderEventActions(event, status)}
                  </ListItem>
                  {index < eventsList.length - 1 && <Divider sx={{ my: 1 }} />}
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