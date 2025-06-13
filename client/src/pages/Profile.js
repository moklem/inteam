import React, { useState, useContext, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save,
  Edit,
  Person,
  Email,
  Phone,
  SportsTennis,
  Group,
  Event
} from '@mui/icons-material';

import { format } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import { TeamContext } from '../context/TeamContext';
import { EventContext } from '../context/EventContext';

const Profile = () => {
  const { user, updateProfile, loading: authLoading, error: authError, setError: setAuthError } = useContext(AuthContext);
  const { teams, fetchTeams } = useContext(TeamContext);
  const { events, fetchEvents } = useContext(EventContext);
  
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [position, setPosition] = useState('');
  const [birthDate, setBirthDate] = useState(null);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setPosition(user.position || '');
      setBirthDate(user.birthDate ? new Date(user.birthDate) : null);
      
      // Fetch teams and events
      fetchTeams();
      fetchEvents();
    }
  }, [user, fetchTeams, fetchEvents]);

  // Filter upcoming events
  useEffect(() => {
    if (events.length > 0) {
      const now = new Date();
      const upcoming = events
        .filter(event => new Date(event.startTime) > now)
        .filter(event => 
          event.attendingPlayers.some(p => p._id === user._id) ||
          event.invitedPlayers.some(p => p._id === user._id)
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 3);
      
      setUpcomingEvents(upcoming);
    }
  }, [events, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name || !email) {
      setFormError('Bitte Name und E-Mail eingeben');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    setAuthError(null);
    setSuccess(false);
    
    try {
      await updateProfile({
        name,
        email,
        phoneNumber,
        position
      });
      
      setSuccess(true);
      setEditMode(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Profilaktualisierung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nicht angegeben';
    return format(new Date(date), 'dd.MM.yyyy');
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const sameDay = start.getDate() === end.getDate() && 
                    start.getMonth() === end.getMonth() && 
                    start.getFullYear() === end.getFullYear();
    
    if (sameDay) {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mein Profil
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 4 }}>
            {(formError || authError) && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {formError || authError}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Profil erfolgreich aktualisiert
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2">
                Persönliche Informationen
              </Typography>
              <Button
                variant={editMode ? "outlined" : "contained"}
                color={editMode ? "secondary" : "primary"}
                startIcon={editMode ? <Save /> : <Edit />}
                onClick={() => editMode ? handleSubmit() : setEditMode(true)}
                disabled={isSubmitting}
              >
                {editMode ? 'Speichern' : 'Bearbeiten'}
              </Button>
            </Box>
            
            {editMode ? (
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="name"
                      label="Name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="email"
                      label="E-Mail"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="phoneNumber"
                      label="Telefonnummer"
                      name="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="position-label">Position</InputLabel>
                      <Select
                        labelId="position-label"
                        id="position"
                        value={position}
                        label="Position"
                        onChange={(e) => setPosition(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                        <MenuItem value="Mittelblocker">Mittelblocker</MenuItem>
                        <MenuItem value="Außenangreifer">Außenangreifer</MenuItem>
                        <MenuItem value="Diagonalangreifer">Diagonalangreifer</MenuItem>
                        <MenuItem value="Libero">Libero</MenuItem>
                        <MenuItem value="Universal">Universal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Person sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Name:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.name || 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Email sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        E-Mail:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.email || 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Phone sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Telefon:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.phoneNumber || 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SportsTennis sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Position:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.position || 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Person sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Geburtsdatum:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.birthDate ? formatDate(user.birthDate) : 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Group sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Rolle:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {user?.role || 'Nicht angegeben'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              Meine Teams
            </Typography>
            
            {teams.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {teams.map(team => (
                  <Chip
                    key={team._id}
                    label={team.name}
                    color={team.type === 'Youth' ? 'secondary' : 'primary'}
                    icon={<Group />}
                    variant="outlined"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Sie sind noch keinem Team zugeordnet.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Kommende Termine
            </Typography>
            
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map(event => (
                  <ListItem key={event._id} alignItems="flex-start" sx={{ px: 0 }}>
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
                            {formatEventDate(event.startTime, event.endTime)}
                          </Typography>
                          <br />
                          {event.location}
                          <br />
                          Team: {event.team.name}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Keine kommenden Termine.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;