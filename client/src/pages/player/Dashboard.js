import React, { useContext, useEffect, useState } from 'react';
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
  CalendarMonth
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
      const userTeamIds = teams
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
      
      // Pending invitations from OTHER teams (not user's own teams)
      const pending = events
        .filter(event => {
          const isFuture = new Date(event.startTime) > now;
          const eventTeamId = event.team._id || event.team;
          const isFromOtherTeam = !userTeamIds.includes(eventTeamId);
          const isInvited = event.invitedPlayers.some(p => p._id === user._id);
          const isOpenAccess = event.isOpenAccess;
          const isGuest = event.guestPlayers?.some(g => g.player._id === user._id);
          const hasNotResponded = !event.attendingPlayers.some(p => p._id === user._id) && 
                                  !event.declinedPlayers.some(p => p._id === user._id);
          
          return isFuture && isFromOtherTeam && (isInvited || isOpenAccess || isGuest) && hasNotResponded;
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
    
    if (isAttending) {
      return { status: 'attending', label: 'Zugesagt', color: 'success' };
    } else if (hasDeclined) {
      return { status: 'declined', label: 'Abgesagt', color: 'error' };
    } else if (isInvited || event.isOpenAccess || isGuest) {
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" component="span">
                              {event.title}
                            </Typography>
                            <Chip 
                              label={event.team.name} 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1 }}
                            />
                            {event.isOpenAccess && (
                              <Chip 
                                label="Offenes Training" 
                                size="small" 
                                color="info" 
                                sx={{ ml: 1 }}
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
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mt: { xs: 2, sm: 0 },
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-end', sm: 'center' }
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

        {/* Upcoming Events Section */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Nächste Termine (Meine Teams)
              </Typography>
            </Box>
            
            {upcomingTrainingAndMatches.length > 0 ? (
              <List>
                {upcomingTrainingAndMatches.map(event => {
                  const eventStatus = getUserEventStatus(event);
                  return (
                    <ListItem 
                      key={event._id} 
                      alignItems="flex-start" 
                      sx={{ 
                        bgcolor: 'background.paper', 
                        mb: 1, 
                        borderRadius: 1, 
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        pr: 1 
                      }}
                    >
                      <Box 
                        component={RouterLink}
                        to={`/player/events/${event._id}`}
                        sx={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          display: 'flex',
                          flexGrow: 1,
                          alignItems: 'flex-start',
                          width: { xs: '100%', sm: 'auto' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main' }}>
                            <Event />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                              {eventStatus && (
                                <Chip 
                                  label={eventStatus.label} 
                                  size="small" 
                                  color={eventStatus.color}
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
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        ml: { xs: 0, sm: 2 },
                        mt: { xs: 2, sm: 0 },
                        width: { xs: '100%', sm: 'auto' },
                        justifyContent: { xs: 'flex-end', sm: 'center' }
                      }}>
                        {eventStatus && eventStatus.status === 'attending' ? (
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
                        ) : eventStatus && eventStatus.status === 'declined' ? (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Check />}
                            onClick={(e) => {
                              e.preventDefault();
                              handleAccept(event._id);
                            }}
                          >
                            Zusagen
                          </Button>
                        ) : (
                          <>
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
                          </>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine kommenden Termine vorhanden.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* User's Teams */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Group sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Meine Teams
              </Typography>
            </Box>
            
            {userTeams.length > 0 ? (
              <Grid container spacing={2}>
                {userTeams.map(team => (
                  <Grid item xs={12} md={6} key={team._id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {team.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip 
                            label={team.type === 'Youth' ? 'Jugend' : 'Erwachsene'} 
                            size="small"
                            color={team.type === 'Youth' ? 'secondary' : 'primary'}
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {team.players.length} Spieler
                          </Typography>
                        </Box>
                        {team.coaches && team.coaches.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Trainer: {team.coaches.map(c => c.name).join(', ')}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          component={RouterLink} 
                          to={`/player/teams/${team._id}`}
                        >
                          Details anzeigen
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Du bist noch keinem Team zugeordnet.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;