import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Dashboard,
  Event,
  Group,
  SportsVolleyball,
  ArrowForward
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user, isCoach, isPlayer } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect to appropriate dashboard based on user role
  useEffect(() => {
    if (user) {
      if (isCoach()) {
        navigate('/coach');
      } else if (isPlayer()) {
        navigate('/player');
      }
    }
  }, [user, isCoach, isPlayer, navigate]);

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SportsVolleyball sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Willkommen bei Volleyball Team Manager
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          Die Plattform zur Verwaltung von Volleyball-Teams und zur Integration von Jugendspielern in den Herrenbereich.
        </Typography>
        <Typography variant="body1" paragraph>
          Bitte melden Sie sich an oder registrieren Sie sich, um auf Ihre personalisierten Funktionen zuzugreifen.
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/login')}
            sx={{ mr: 2 }}
          >
            Anmelden
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => navigate('/register')}
          >
            Registrieren
          </Button>
        </Box>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 6, mb: 3 }}>
        Funktionen
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Dashboard sx={{ fontSize: 30, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="div">
                  Für Trainer
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Event fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Trainings und Spiele planen" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Group fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Spieler verwalten und bewerten" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SportsVolleyball fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Jugendspieler integrieren" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button size="small" endIcon={<ArrowForward />}>
                Mehr erfahren
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Dashboard sx={{ fontSize: 30, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="div">
                  Für Spieler
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Event fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Zu Trainings und Spielen zu- oder absagen" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Group fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Teamübersicht einsehen" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SportsVolleyball fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Eigene Entwicklung verfolgen" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button size="small" endIcon={<ArrowForward />}>
                Mehr erfahren
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Dashboard sx={{ fontSize: 30, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="div">
                  Für Jugendspieler
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Event fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="An Trainings höherer Teams teilnehmen" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Group fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Nahtloser Übergang in den Herrenbereich" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SportsVolleyball fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Entwicklungspfad verfolgen" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button size="small" endIcon={<ArrowForward />}>
                Mehr erfahren
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6, mb: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Bereit loszulegen?
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/register')}
          sx={{ mt: 2 }}
        >
          Jetzt registrieren
        </Button>
      </Box>
    </Box>
  );
};

export default Home;
