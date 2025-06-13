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
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Event,
  Group,
  Person,
  Add,
  SportsTennis,
  Assessment,
  ArrowForward
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { events, fetchEvents, loading: eventsLoading } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalTeams: 0,
    totalPlayers: 0,
    totalYouthPlayers: 0
  });

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, [fetchEvents, fetchTeams]);

  // Filter events and teams
  useEffect(() => {
    if (events.length > 0) {
      const now = new Date();
      
      // Upcoming events
      const upcoming = events
        .filter(event => new Date(event.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 5);
      
      setUpcomingEvents(upcoming);
      
      // Stats
      setStats(prev => ({
        ...prev,
        totalEvents: events.length
      }));
    }
  }, [events]);

  // Filter user teams and calculate stats
  useEffect(() => {
    if (teams.length > 0 && user) {
      // Teams coached by user
      const userTeams = teams.filter(team => 
        team.coaches.some(c => c._id === user._id)
      );
      
      setUserTeams(userTeams);
      
      // Calculate stats
      let totalPlayers = 0;
      let totalYouthPlayers = 0;
      
      teams.forEach(team => {
        totalPlayers += team.players.length;
        
        // Count youth players (assuming they have role 'Jugendspieler')
        team.players.forEach(player => {
          if (player.role === 'Jugendspieler') {
            totalYouthPlayers++;
          }
        });
      });
      
      setStats(prev => ({
        ...prev,
        totalTeams: teams.length,
        totalPlayers,
        totalYouthPlayers
      }));
    }
  }, [teams, user]);

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
        Trainer Dashboard
      </Typography>
      
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
                {stats.totalEvents}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Termine
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* Upcoming Events */}
        <Grid item xs={12} md={7}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Event sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Kommende Termine
                </Typography>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                component={RouterLink}
                to="/coach/events/create"
              >
                Neuer Termin
              </Button>
            </Box>
            
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map(event => (
                  <ListItem 
                    key={event._id} 
                    alignItems="flex-start" 
                    sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}
                    component={RouterLink}
                    to={`/coach/events/${event._id}`}
                    button
                  >
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
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {new Date(event.startTime).toLocaleDateString('de-DE', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                          <br />
                          {event.location}
                          <br />
                          <Box sx={{ mt: 0.5 }}>
                            <Chip 
                              label={`${event.attendingPlayers.length} Zusagen`} 
                              size="small" 
                              color="success" 
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            <Chip 
                              label={`${event.declinedPlayers.length} Absagen`} 
                              size="small" 
                              color="error" 
                              variant="outlined"
                            />
                          </Box>
                        </>
                      }
                    />
                    <IconButton edge="end" aria-label="details">
                      <ArrowForward />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine kommenden Termine vorhanden.
              </Typography>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                component={RouterLink}
                to="/coach/events"
                color="primary"
              >
                Alle Termine anzeigen
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* My Teams */}
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Group sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Meine Teams
                </Typography>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                component={RouterLink}
                to="/coach/teams/create"
              >
                Neues Team
              </Button>
            </Box>
            
            {userTeams.length > 0 ? (
              <List>
                {userTeams.map(team => (
                  <ListItem 
                    key={team._id} 
                    button 
                    component={RouterLink} 
                    to={`/coach/teams/${team._id}`}
                    sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main' }}>
                        <Group />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={team.name}
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'}
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span">
                            {team.players.length} Spieler
                          </Typography>
                        </>
                      }
                    />
                    <IconButton edge="end" aria-label="details">
                      <ArrowForward />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Sie sind noch keinem Team zugeordnet.
              </Typography>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                component={RouterLink}
                to="/coach/teams"
                color="primary"
              >
                Alle Teams anzeigen
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Schnellzugriff
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Event />}
                  component={RouterLink}
                  to="/coach/events/create"
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Termin erstellen
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Group />}
                  component={RouterLink}
                  to="/coach/teams/create"
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Team erstellen
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Person />}
                  component={RouterLink}
                  to="/coach/players"
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Spieler verwalten
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Assessment />}
                  component={RouterLink}
                  to="/coach/attributes"
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Attribute verwalten
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;