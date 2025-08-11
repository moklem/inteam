import React, { useContext, useMemo } from 'react';

import { format, isAfter, startOfDay, endOfWeek, startOfWeek, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Event,
  Group,
  Person,
  SportsVolleyball,
  Schedule,
  LocationOn,
  CalendarToday,
  Check, 
  HelpOutline, 
  Close,
  Feedback as FeedbackIcon,
  ArrowForward
} from '@mui/icons-material';
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
  CircularProgress,
  Alert
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import { useCoachTeams } from '../../hooks/useTeams';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Use React Query hooks for data fetching
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useCoachTeams();
  const { data: events = [], isLoading: eventsLoading } = useEvents();

  // Find events that need quick feedback (ended within last 7 days, not yet provided)
  const eventsNeedingFeedback = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const coachTeamIds = teams.map(team => team._id);
    
    return events.filter(event => {
      // Only show events for teams the coach manages
      const eventTeamId = event.team?._id || event.team;
      if (!coachTeamIds.includes(eventTeamId)) {
        return false;
      }
      
      const eventEndTime = new Date(event.date || event.startTime);
      eventEndTime.setHours(eventEndTime.getHours() + 2); // Assume 2-hour duration
      
      // Check if event ended between 7 days ago and now
      if (eventEndTime < sevenDaysAgo || eventEndTime > now) {
        return false;
      }
      
      // Check if feedback was already completed (using localStorage)
      const feedbackKey = `feedback_shown_${event._id}`;
      const feedbackData = localStorage.getItem(feedbackKey);
      
      if (feedbackData) {
        try {
          const parsed = JSON.parse(feedbackData);
          // Only exclude if feedback was actually completed
          if (parsed.completed === true) {
            return false;
          }
          // If it was skipped, check if it was today (allow re-prompting next day)
          if (parsed.skippedDate) {
            const skippedDate = new Date(parsed.skippedDate).toDateString();
            const today = new Date().toDateString();
            // If skipped today, don't show again today
            if (skippedDate === today) {
              return false;
            }
          }
        } catch (e) {
          // Handle old format (backward compatibility)
          if (feedbackData === 'true') {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [events, teams]);

  // AttendanceStatusChip
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
        title={`${totalPending} Antworten ausstehend`}
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

// Memoized calculations for better performance
  const { stats, upcomingEvents, nextTraining, nextMatch } = useMemo(() => {
    const coachTeamIds = teams.map(team => team._id);
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Calculate stats
    let totalPlayers = 0;
    let totalYouthPlayers = 0;
    const uniquePlayers = new Set();
    const uniqueYouthPlayers = new Set();
    
    teams.forEach(team => {
      if (team.players && Array.isArray(team.players)) {
        team.players.forEach(player => {
          uniquePlayers.add(player._id);
          if (player.role === 'Jugendspieler') {
            uniqueYouthPlayers.add(player._id);
          }
        });
      }
    });
    
    totalPlayers = uniquePlayers.size;
    totalYouthPlayers = uniqueYouthPlayers.size;
    
    // Filter events for coach's teams
    const coachEvents = events.filter(event => {
      const eventTeamId = event.team._id || event.team;
      return coachTeamIds.includes(eventTeamId);
    });
    
    // Find next training and match
    const nextTraining = coachEvents
      .filter(event => event.type === 'Training' && new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
      
    const nextMatch = coachEvents
      .filter(event => event.type === 'Spiel' && new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
    
    // Get upcoming events for this week
    const upcoming = coachEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    return {
      stats: {
        totalTeams: teams.length,
        totalPlayers,
        totalYouthPlayers,
        upcomingEvents: upcoming.length
      },
      upcomingEvents: upcoming.slice(0, 5),
      nextTraining,
      nextMatch
    };
  }, [teams, events]);


  if (eventsLoading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (teamsError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Seite neu laden
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trainer Dashboard
      </Typography>

      {/* Quick Feedback Reminder */}
      {eventsNeedingFeedback.length > 0 && (
        <Alert 
          severity="info" 
          icon={<FeedbackIcon />}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Quick Feedback ausstehend
            </Typography>
            <Typography variant="body2">
              Sie haben {eventsNeedingFeedback.length} {eventsNeedingFeedback.length === 1 ? 'Event' : 'Events'} mit ausstehenden Spielerbewertungen:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {eventsNeedingFeedback.slice(0, 3).map(event => (
                <Typography key={event._id} variant="caption" display="block" sx={{ ml: 2 }}>
                  • {event.title} ({format(new Date(event.date || event.startTime), 'dd.MM.yyyy')})
                </Typography>
              ))}
              {eventsNeedingFeedback.length > 3 && (
                <Typography variant="caption" display="block" sx={{ ml: 2 }}>
                  • und {eventsNeedingFeedback.length - 3} weitere...
                </Typography>
              )}
            </Box>
            <Button 
              color="primary" 
              size="small"
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => navigate(`/coach/events/${eventsNeedingFeedback[0]._id}`)}
              sx={{ mt: 2 }}
            >
              Feedback geben
            </Button>
          </Box>
        </Alert>
      )}

      {/* next Match or Training */}
{(nextTraining || nextMatch) && (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {nextTraining && (
      <Grid item xs={12} md={6}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              elevation: 4,
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
          onClick={() => navigate(`/coach/events/${nextTraining._id}`)}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Nächstes Training
          </Typography>
          <Typography variant="h6" gutterBottom>
            {nextTraining.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {format(new Date(nextTraining.startTime), 'dd. MMM yyyy HH:mm', { locale: de })}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {getAttendanceStatusChip(nextTraining)}
          </Box>
        </Paper>
      </Grid>
    )}
    
    {nextMatch && (
      <Grid item xs={12} md={6}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              elevation: 4,
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
          onClick={() => navigate(`/coach/events/${nextMatch._id}`)}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Nächstes Spiel
          </Typography>
          <Typography variant="h6" gutterBottom>
            {nextMatch.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {format(new Date(nextMatch.startTime), 'dd. MMM yyyy HH:mm', { locale: de })}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {getAttendanceStatusChip(nextMatch)}
          </Box>
        </Paper>
      </Grid>
    )}
  </Grid>
)}
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" component="div" color="primary" align="center">
                {stats.totalTeams}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Teams
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" component="div" color="primary" align="center">
                {stats.totalPlayers}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Spieler
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" component="div" color="secondary" align="center">
                {stats.totalYouthPlayers}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Jugendspieler
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" component="div" color="primary" align="center">
                {stats.upcomingEvents}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Kommende Events
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* My Teams */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Meine Teams
              </Typography>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/coach/teams"
              >
                Alle anzeigen
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {teams.length > 0 ? (
              <List>
                {teams.slice(0, 5).map(team => (
                  <ListItem 
                    key={team._id} 
                    button 
                    component={RouterLink} 
                    to={`/coach/teams/${team._id}`}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main' }}>
                        <Group />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={team.name}
                      secondary={`${team.players ? team.players.length : 0} Spieler`}
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
              <Typography variant="body2" color="text.secondary">
                Keine Teams vorhanden
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Kommende Events
              </Typography>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/coach/events"
              >
                Alle anzeigen
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map(event => (
                  <ListItem 
                    key={event._id} 
                    button 
                    component={RouterLink} 
                    to={`/coach/events/${event._id}`}
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
                          <CalendarToday sx={{ fontSize: 14, mr: 0.5 }} />
                          {format(new Date(event.startTime), 'dd. MMM yyyy HH:mm', { locale: de })}
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
              <Typography variant="body2" color="text.secondary">
                Keine kommenden Events
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
