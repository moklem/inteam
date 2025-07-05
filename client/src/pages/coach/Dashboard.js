import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  Close
} from '@mui/icons-material';
import { format, isAfter, startOfDay, endOfWeek, startOfWeek, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading, error: teamsError } = useContext(TeamContext);
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalPlayers: 0,
    totalYouthPlayers: 0,
    upcomingEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Ensure auth header is set
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    if (userData?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
  }, []);

  // Fetch data with error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        setRefreshing(true);
        await Promise.all([
          fetchTeams(),
          fetchEvents()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setRefreshing(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, fetchTeams, fetchEvents]);

  // AttendanceStatusChip
const getAttendanceStatusChip = (event) => {
  // Count attending players (includes both team members and guests who accepted)
  const attending = event.attendingPlayers.length;
  
  // Count declined players
  const declined = event.declinedPlayers ? event.declinedPlayers.length : 0;
  
  // Calculate pending team players (invited but not yet responded)
  const pendingTeamPlayers = event.invitedPlayers.filter(player => 
    !event.attendingPlayers.some(p => p._id === player._id) &&
    !event.declinedPlayers.some(p => p._id === player._id)
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
        color="warning"
        variant={totalPending > 0 ? "filled" : "outlined"}
        title={`${totalPending} Antworten ausstehend`}
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

//Find Next Training and Match
const getNextTraining = () => {
  const now = new Date();
  return events
    .filter(event => 
      event.type === 'Training' && 
      new Date(event.startTime) > now
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
};

const getNextMatch = () => {
  const now = new Date();
  return events
    .filter(event => 
      event.type === 'Spiel' && 
      new Date(event.startTime) > now
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
};

const nextTraining = getNextTraining();
const nextMatch = getNextMatch();

  // Calculate stats from teams
  useEffect(() => {
    if (teams && teams.length > 0) {
      // Filter teams where user is a coach
      const userTeams = teams.filter(team => 
        team.coaches && team.coaches.some(c => c._id === user._id)
      );
      
      setUserTeams(userTeams);
      
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
      
      setStats(prev => ({
        ...prev,
        totalTeams: teams.length,
        totalPlayers,
        totalYouthPlayers
      }));
    } else {
      // Reset stats if no teams
      setStats({
        totalTeams: 0,
        totalPlayers: 0,
        totalYouthPlayers: 0,
        upcomingEvents: 0
      });
    }
  }, [teams, user]);

  // Calculate upcoming events - only this week and coach's teams
  useEffect(() => {
    if (events && events.length > 0 && userTeams.length > 0 && user) {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday as end of week
      
      // Get IDs of teams where user is a coach
      const coachTeamIds = userTeams.map(team => team._id);
      
      // Filter events: this week only AND from coach's teams only
      const upcoming = events.filter(event => {
        const eventDate = new Date(event.startTime);
        const eventTeamId = event.team._id || event.team;
        
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd }) &&
              coachTeamIds.includes(eventTeamId);
      }).sort((a, b) => 
        new Date(a.startTime) - new Date(b.startTime)
      );
      
      setUpcomingEvents(upcoming.slice(0, 5)); // Show max 5 events
      setStats(prev => ({
        ...prev,
        upcomingEvents: upcoming.length
      }));
    } else {
      // Reset if no events or teams
      setUpcomingEvents([]);
      setStats(prev => ({
        ...prev,
        upcomingEvents: 0
      }));
    }
  }, [events, userTeams, user]);

  if (eventsLoading || teamsLoading || refreshing) {
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
            
            {userTeams.length > 0 ? (
              <List>
                {userTeams.slice(0, 5).map(team => (
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
