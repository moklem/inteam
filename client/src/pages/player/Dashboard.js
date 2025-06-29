import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Event,
  Group,
  Check,
  Close,
  CalendarToday,
  LocationOn,
  SportsVolleyball,
  Notifications,
  AccessTime,
  Help
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PropTypes from 'prop-types';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, acceptInvitation, declineInvitation, loading: eventsLoading } = useContext(EventContext);
  const { teams, loading: teamsLoading } = useContext(TeamContext);
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [upcomingTrainingAndMatches, setUpcomingTrainingAndMatches] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter and organize events
  useEffect(() => {
    if (events.length > 0 && user && teams.length > 0) {
      const now = new Date();
      const userTeamsList = teams.filter(team => 
        team.players.some(p => p._id === user._id) || 
        team.coaches.some(c => c._id === user._id)
      );

      // Get user's teams only
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
          event.attendingPlayers.some(p => p._id === user._id)
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 3);
      
      setUpcomingEvents(upcoming);
      
      // Pending invitations - include ALL events where user can respond
      const pending = events
        .filter(event => {
          const isFuture = new Date(event.startTime) > now;
          const eventTeamId = event.team._id || event.team;
          const isUserTeamMember = userTeamIds.includes(eventTeamId);
          const isInvited = event.invitedPlayers.some(p => p._id === user._id);
          const isOpenAccess = event.isOpenAccess;
          const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
          const hasNotResponded = !event.attendingPlayers.some(p => p._id === user._id) && 
                                  !event.declinedPlayers.some(p => p._id === user._id);
          
          // Include if future event AND user hasn't responded AND (invited OR team member OR guest OR open access)
          return isFuture && hasNotResponded && (isInvited || isUserTeamMember || isGuest || isOpenAccess);
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
      await fetchEvents(); // Refresh events after accepting
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDecline = async (eventId) => {
    try {
      await declineInvitation(eventId);
      await fetchEvents(); // Refresh events after declining
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

  const getUserEventStatus = (event) => {
    if (!user) return null;
    
    const isAttending = event.attendingPlayers.some(p => p._id === user._id);
    const hasDeclined = event.declinedPlayers.some(p => p._id === user._id);
    const isInvited = event.invitedPlayers.some(p => p._id === user._id);
    const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
    
    // Check if user is a team member
    const userTeamIds = teams
      .filter(team => team.players.some(p => p._id === user._id))
      .map(team => team._id);
    const isTeamMember = userTeamIds.includes(event.team._id || event.team);
    
    if (isAttending) {
      return { status: 'attending', label: 'Zugesagt', color: 'success' };
    } else if (hasDeclined) {
      return { status: 'declined', label: 'Abgesagt', color: 'error' };
    } else if (isInvited || isGuest) {
      return { status: 'pending', label: 'Eingeladen', color: 'warning' };
    } else if (isTeamMember || event.isOpenAccess) {
      return { status: 'pending', label: 'Offen', color: 'info' };
    }
    
    return null;
  };

  const isYouthPlayer = () => {
    return user && user.role === 'YouthPlayer';
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
        {/* Open Invitations Section */}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" component="span">
                              {event.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              - {event.team.name}
                            </Typography>
                            <Chip 
                              label={event.type === 'Training' ? 'Training' : 'Spiel'} 
                              size="small" 
                              color={event.type === 'Training' ? 'primary' : 'secondary'} 
                              variant="outlined"
                            />
                            {event.guestPlayers?.some(g => g.player._id === user._id) && (
                              <Chip 
                                label="Als Gast" 
                                size="small" 
                                color="info" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {formatEventDate(event.startTime, event.endTime)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {event.location}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mt: { xs: 2, sm: 0 }, 
                      ml: { sm: 2 },
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-end', sm: 'flex-start' }
                    }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Check />}
                        onClick={(e) => {
                          e.preventDefault();
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
                          handleDecline(event._id);
                        }}
                      >
                        Absagen
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine offenen Einladungen vorhanden.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Training and Matches */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Nächste Trainings & Spiele
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {upcomingTrainingAndMatches.length > 0 ? (
              <Grid container spacing={2}>
                {upcomingTrainingAndMatches.map(event => {
                  const status = getUserEventStatus(event);
                  
                  return (
                    <Grid item xs={12} key={event._id}>
                      <EventCard
                        event={event}
                        status={status}
                        formatEventDate={formatEventDate}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        user={user}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine anstehenden Trainings oder Spiele.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* My Teams */}
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
                    <Chip 
                      label={team.type === 'Youth' ? 'Jugend' : 'Erwachsene'} 
                      size="small"
                      color={team.type === 'Youth' ? 'secondary' : 'primary'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Du bist noch keinem Team zugeordnet.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* My Accepted Events Section */}
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
                          {format(new Date(event.startTime), 'dd.MM.yyyy HH:mm', { locale: de })}
                          {' - '}
                          {event.team.name}
                        </>
                      }
                    />
                    <Chip 
                      label={event.type === 'Training' ? 'Training' : 'Spiel'} 
                      size="small"
                      color={event.type === 'Training' ? 'primary' : 'secondary'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine zugesagten Termine vorhanden.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// EventCard Component for the Training & Matches section
const EventCard = ({ event, status, formatEventDate, onAccept, onDecline, user }) => {
  return (
    <Card elevation={1} sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: '1.1rem' }}>
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
          
          {status && (
            <Chip 
              label={status.label} 
              color={status.color} 
              size="small"
              icon={status.status === 'attending' ? <Check /> : 
                    status.status === 'declined' ? <Close /> : 
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
        {status && status.status === 'pending' && (
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
        
        {status && status.status === 'declined' && (
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
        
        {status && status.status === 'attending' && (
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
      _id: PropTypes.string,
      name: PropTypes.string.isRequired
    }).isRequired,
    guestPlayers: PropTypes.array,
    attendingPlayers: PropTypes.array.isRequired,
    declinedPlayers: PropTypes.array.isRequired,
    invitedPlayers: PropTypes.array.isRequired,
    isOpenAccess: PropTypes.bool
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