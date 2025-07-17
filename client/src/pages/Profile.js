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
  MenuItem,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Save,
  Edit,
  Person,
  Email,
  Phone,
  SportsVolleyball,
  Group,
  Event,
  Visibility,
  VisibilityOff,
  CalendarToday
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { de } from 'date-fns/locale';
import { format } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import { TeamContext } from '../context/TeamContext';
import { EventContext } from '../context/EventContext';
import NotificationSettings from '../components/common/NotificationSettings';

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (events.length > 0 && user) {
      const now = new Date();
      const upcoming = events
        .filter(event => new Date(event.startTime) > now)
        .filter(event => 
          event.attendingPlayers?.some(p => p._id === user._id) ||
          event.invitedPlayers?.some(p => p._id === user._id)
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 3);
      
      setUpcomingEvents(upcoming);
    }
  }, [events, user]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Validate form
    if (!name || !email) {
      setFormError('Bitte Name und E-Mail eingeben');
      return;
    }
    
    // Check if passwords match when changing password
    if (password && password !== confirmPassword) {
      setFormError('Passwörter stimmen nicht überein');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    setAuthError(null);
    setSuccess(false);
    
    try {
      const updateData = {
        name,
        email,
        phoneNumber,
        position
      };
      
      // Add birthDate if it exists
      if (birthDate) {
        updateData.birthDate = birthDate;
      }
      
      // Add password if user wants to change it
      if (password) {
        updateData.password = password;
      }
      
      await updateProfile(updateData);
      
      setSuccess(true);
      setEditMode(false);
      // Clear password fields after successful update
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Profilaktualisierung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nicht angegeben';
    try {
      return format(new Date(date), 'dd.MM.yyyy');
    } catch (error) {
      return 'Nicht angegeben';
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, mb: 10 }}>
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
                variant={editMode ? "contained" : "outlined"}
                color="primary"
                startIcon={editMode ? <Save /> : <Edit />}
                onClick={() => editMode ? handleSubmit() : setEditMode(true)}
                disabled={isSubmitting}
              >
                {editMode ? 'Speichern' : 'Bearbeiten'}
              </Button>
            </Box>
            
            {editMode ? (
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-Mail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefonnummer"
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
                        value={position}
                        label="Position"
                        onChange={(e) => setPosition(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <MenuItem value="">Keine Position</MenuItem>
                        <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                        <MenuItem value="Außen">Außen</MenuItem>
                        <MenuItem value="Mitte">Mitte</MenuItem>
                        <MenuItem value="Dia">Dia</MenuItem>
                        <MenuItem value="Libero">Libero</MenuItem>
                        <MenuItem value="Universal">Universal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                      <DatePicker
                        label="Geburtsdatum"
                        value={birthDate}
                        onChange={(newValue) => setBirthDate(newValue)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            disabled: isSubmitting
                          }
                        }}
                        maxDate={new Date()}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Passwort ändern (optional)
                      </Typography>
                    </Divider>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Neues Passwort"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Passwort bestätigen"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      error={password && confirmPassword && password !== confirmPassword}
                      helperText={password && confirmPassword && password !== confirmPassword ? 'Passwörter stimmen nicht überein' : ''}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
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
                      <SportsVolleyball sx={{ mr: 1, color: 'primary.main' }} />
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
                      <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                        Geburtsdatum:
                      </Typography>
                      <Typography variant="body1" component="span">
                        {formatDate(user?.birthDate)}
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
              <Grid container spacing={2}>
                {teams.map((team) => (
                  <Grid item xs={12} sm={6} key={team._id}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          <SportsVolleyball />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {team.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {team.type}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Du bist noch keinem Team zugeordnet.
              </Typography>
            )}
          </Paper>
          
          <NotificationSettings />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Event sx={{ mr: 1 }} />
              Kommende Termine
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {upcomingEvents.length > 0 ? (
              <List disablePadding>
                {upcomingEvents.map((event, index) => (
                  <ListItem key={event._id} disableGutters divider={index < upcomingEvents.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={event.title}
                      secondary={formatEventDate(event.startTime, event.endTime)}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Keine kommenden Termine
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;