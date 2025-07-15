import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Event,
  Group,
  Check,
  Close,
  Help,
  SportsVolleyball,
  Notifications,
  CalendarMonth,
  CalendarToday,
  LocationOn
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Dashboard = () => {
  const { user, isYouthPlayer } = useContext(AuthContext);
  const { events, fetchEvents, acceptInvitation, declineInvitation, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [upcomingTrainingAndMatches, setUpcomingTrainingAndMatches] = useState([]);
  const [userTeams, setUserTeams] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

  // Filter events and teams
  useEffect(() => {
    if (events.length > 0 && user) {
      const now = new Date();
      
      // Get user's teams
      const userTeamsList = teams.filter(team => 
        team.players.some(p => p._id === user._id) || 
        team.coaches.some(c => c._id === user._id)
      );
      setUserTeams(userTeamsList);
      
      // Get upcoming training and matches for the user's teams only
      const userTeamIds = userTeamsList
        .filter(team => 
          team.players.some(p => p._id === user._id) || 
          team.coaches.some(c => c._id === user._id)
        )
        .map(team => team._id);

      // Upcoming events (attending)
      const upcoming = events
        .filter(event => 
          new Date(event.startTime) > now && 
          (event.attendingPlayers.some(p => p._id === user._id) ||
           (event.uninvitedPlayers && event.uninvitedPlayers.some(p => p._id === user._id)))
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 3);
      
      setUpcomingEvents(upcoming);
      
      // Pending invitations from OTHER teams (not user's own teams)
      // Pending invitations from OTHER teams (not user's own teams)
      const pending = events
        .filter(event => {
          const isFuture = new Date(event.startTime) > now;
          const eventTeamId = event.team._id || event.team;
          const isFromOtherTeam = !userTeamIds.includes(eventTeamId);
          const isInvited = event.invitedPlayers.some(p => p._id === user._id);
          const isOpenAccess = event.isOpenAccess;
          const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
          const isUninvited = event.uninvitedPlayers && event.uninvitedPlayers.some(p => p._id === user._id);
          const hasNotResponded = !event.attendingPlayers.some(p => p._id === user._id) && 
                                  !event.declinedPlayers.some(p => p._id === user._id);
          
          return isFuture && isFromOtherTeam && (isInvited || isOpenAccess || isGuest || isUninvited) && hasNotResponded;
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      
      setPendingEvents(pending);

      // Filter all future events for user's teams
      const futureTeamEvents = events
        .filter(event => {
          const eventTeamId = event.team._id || event.team;
          return new Date(event.startTime) > now && 
                 userTeamIds.includes(eventTeamId);
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      // Get next 2 training events from user's teams
      const nextTrainings = futureTeamEvents
        .filter(event => event.type === 'Training')
        .slice(0, 2);

      // Get next 2 match events from user's teams
      const nextMatches = futureTeamEvents
        .filter(event => event.type === 'Game')
        .slice(0, 2);

      // Combine and sort by date
      const combined = [...nextTrainings, ...nextMatches]
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      setUpcomingTrainingAndMatches(combined);
    } else {
      setUpcomingEvents([]);
      setPendingEvents([]);
      setUpcomingTrainingAndMatches([]);
    }
  }, [events, teams, user]);

  // Filter user teams
  useEffect(() => {
    if (teams.length > 0 && user) {
      const userTeams = teams.filter(team => 
        team.players.some(p => p._id === user._id) || 
        team.coaches.some(c => c._id === user._id)
      );
      
      setUserTeams(userTeams);
    }
  }, [teams, user]);

  const handleAccept = async (eventId) => {
    try {
      await acceptInvitation(eventId);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDecline = async (eventId) => {
    try {
      await declineInvitation(eventId);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const formatEventDate = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Check if it's the same day
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, 'EEEE, dd. MMMM', { locale: de })} | ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  };

  // FIXED FUNCTION - Now checks if user is a team member
  // FIXED FUNCTION - Now checks if user is a team member and uninvited status
  const getUserEventStatus = (event) => {
    if (!user) return null;
    
    const isAttending = event.attendingPlayers.some(p => p._id === user._id);
    const hasDeclined = event.declinedPlayers.some(p => p._id === user._id);
    const isInvited = event.invitedPlayers.some(p => p._id === user._id);
    const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
    const isUninvited = event.uninvitedPlayers && event.uninvitedPlayers.some(p => p._id === user._id);
    
    // Check if user is a member of the event's team
    const eventTeamId = event.team._id || event.team;
    const isTeamMember = userTeams.some(team => team._id === eventTeamId);
    
    if (isAttending) {
      return { status: 'attending', label: 'Zugesagt', color: 'success' };
    } else if (hasDeclined) {
      return { status: 'declined', label: 'Abgesagt', color: 'error' };
    } else if (isUninvited) {
      return { status: 'uninvited', label: "You haven't been nominated", color: 'error' };
    } else if (isInvited || event.isOpenAccess || isGuest || isTeamMember) {
      // Show as invited if user is invited, event is open, user is guest, OR user is a team member
      return { status: 'pending', label: 'Eingeladen', color: 'warning' };
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

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Dashboard
        </Typography>
        {isYouthPlayer() && (
          <Chip 
            label="Jugendspieler" 
            color="secondary" 
            icon={<SportsVolleyball />} 
            sx={{ ml: 2 }}
          />
        )}
      </Box>
      
      <Grid container spacing={3}>
        {/* Open Invitations from Other Teams */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Notifications sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h5" component="h2">
                Offene Einladungen
              </Typography>
            </Box>
            
            {pendingEvents.length > 0 ? (
              <List>
                {pendingEvents.map(event => (
                  <ListItem key={event._id} alignItems="flex-start" sx={{ 
                    bgcolor: 'background.paper', 
                    mb: 1, 
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexGrow: 1,
                      alignItems: 'flex-start',
                      width: { xs: '100%', sm: 'auto' }
                    }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main' }}>
                          <Event />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{event.title}</Typography>
                            <Chip 
                              label={event.type === 'Training' ? 'Training' : 'Spiel'} 
                              size="small" 
                              color={event.type === 'Training' ? 'primary' : 'secondary'}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {event.team.name}
                            </Typography>
                            {' - '}
                            {formatEventDate(event.startTime, event.endTime)}
                            {' - '}
                            {event.location}
                            {(event.isOpenAccess || event.guestPlayers?.some(g => g.player._id === user._id)) && (
                              <Chip 
                                label={event.isOpenAccess ? 'Offenes Event' : 'Als Gast'} 
                                size="small" 
                                sx={{ ml: 1 }}
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </>
                        }
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      alignItems: 'center',
                      mt: { xs: 2, sm: 0 },
                      ml: { xs: 0, sm: 2 },
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-end', sm: 'flex-start' }
                    }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Check />}
                        onClick={() => handleAccept(event._id)}
                      >
                        Zusagen
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Close />}
                        onClick={() => handleDecline(event._id)}
                      >
                        Absagen
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine ausstehenden Einladungen von anderen Teams.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Events Section - Updated with Card Layout */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Nächste Termine (Meine Teams)
              </Typography>
            </Box>
            
            {upcomingTrainingAndMatches.length > 0 ? (
              <Grid container spacing={2}>
                {upcomingTrainingAndMatches.map(event => {
                  const eventStatus = getUserEventStatus(event);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={event._id}>
                      <EventCard 
                        event={event}
                        status={eventStatus}
                        formatEventDate={formatEventDate}
                        user={user}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine anstehenden Termine für deine Teams.
              </Typography>
            )}
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button 
                component={RouterLink} 
                to="/player/events" 
                variant="outlined"
              >
                Alle Termine anzeigen
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* My Teams Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Group sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Meine Teams
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {userTeams.length > 0 ? (
              <List>
                {userTeams.map(team => (
                  <ListItem 
                    key={team._id} 
                    button 
                    component={RouterLink} 
                    to={`/player/teams/${team._id}`}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main' }}>
                        <Group />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={team.name}
                      secondary={`${team.players.length} Spieler`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Du bist noch keinem Team beigetreten.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Attending Events Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Check sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h5" component="h2">
                Zugesagte Termine
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map(event => (
                  <ListItem 
                    key={event._id} 
                    alignItems="flex-start"
                    button
                    component={RouterLink}
                    to={`/player/events/${event._id}`}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main' }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={event.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {event.team.name}
                          </Typography>
                          {' - '}
                          {formatEventDate(event.startTime, event.endTime)}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine zugesagten Termine.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Event Card Component
const EventCard = ({ event, status, formatEventDate, user, onAccept, onDecline }) => {
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
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main',
              mr: 1,
              width: 32,
              height: 32
            }}
          >
            <Event sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" component="div" sx={{ lineHeight: 1.2 }} noWrap>
              {event.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem' }}>
              {event.team.name}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={event.type === 'Training' ? 'Training' : 'Spiel'} 
            color={event.type === 'Training' ? 'primary' : 'secondary'} 
            size="small"
            icon={<SportsVolleyball />}
          />
          
          {status && (
            <Chip 
              label={status.label} 
              color={status.color} 
              size="small"
              icon={status.status === 'attending' ? <Check /> : 
                    status.status === 'declined' ? <Close /> :
                    status.status === 'uninvited' ? <Close /> : 
                    <Help />}
            />
          )}
          
          {event.guestPlayers?.some(g => g.player._id === user._id) && (
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
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {formatEventDate(event.startTime, event.endTime)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.875rem' }}>
            {event.location}
          </Typography>
        </Box>
      </CardContent>
      
      <Divider />
      
      <CardActions sx={{ flexWrap: 'wrap', gap: 1, padding: 1 }}>
        <Button 
          size="small" 
          component={RouterLink} 
          to={`/player/events/${event._id}`}
        >
          Details
        </Button>
        
        {/* Show accept/decline buttons based on status */}
        {status && status.label === 'Eingeladen' && status.status !== 'uninvited' && (
          <>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<Check />}
              onClick={(e) => {
                e.preventDefault();
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
                onDecline(event._id);
              }}
            >
              Absagen
            </Button>
          </>
        )}
        
        {status && status.label === 'Abgesagt' && (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<Check />}
            onClick={(e) => {
              e.preventDefault();
              onAccept(event._id);
            }}
            sx={{ ml: 'auto' }}
          >
            Zusagen
          </Button>
        )}
        
        {status && status.label === 'Zugesagt' && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Close />}
            onClick={(e) => {
              e.preventDefault();
              onDecline(event._id);
            }}
            sx={{ ml: 'auto' }}
          >
            Absagen
          </Button>
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
    guestPlayers: PropTypes.array
  }).isRequired,
  status: PropTypes.shape({
    status: PropTypes.string,
    label: PropTypes.string,
    color: PropTypes.string
  }),
  formatEventDate: PropTypes.func.isRequired,
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired
};

export default Dashboard;