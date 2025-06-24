import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  PersonAdd,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import axios from 'axios';

const CreatePlayer = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Spieler',
    position: '',
    phoneNumber: '',
    birthDate: null
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Positions available
  const positions = [
    'Zuspieler',
    'Außenangreifer',
    'Mittelblocker',
    'Diagonalangreifer',
    'Libero',
    'Universalspieler'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({
      ...prev,
      birthDate: newDate
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name ist erforderlich';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }
    
    if (!formData.password) {
      errors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 6) {
      errors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Format the data for the API
      const playerData = {
        ...formData,
        birthDate: formData.birthDate ? formData.birthDate.toISOString() : null
      };
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/users/create-player`,
        playerData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Navigate back to players list
      navigate('/coach/players', { 
        state: { message: `Spieler ${formData.name} wurde erfolgreich hinzugefügt!` }
      });
    } catch (error) {
      console.error('Error creating player:', error);
      setError(
        error.response?.data?.message || 
        'Fehler beim Erstellen des Spielers. Bitte versuchen Sie es erneut.'
      );
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/players')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Neuen Spieler hinzufügen
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="E-Mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Passwort"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!validationErrors.password}
                helperText={validationErrors.password || 'Mindestens 6 Zeichen'}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Rolle</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  label="Rolle"
                  disabled={loading}
                >
                  <MenuItem value="Spieler">Spieler</MenuItem>
                  <MenuItem value="Jugendspieler">Jugendspieler</MenuItem>
                  <MenuItem value="Trainer">Trainer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  label="Position"
                  disabled={loading}
                >
                  <MenuItem value="">Keine Position</MenuItem>
                  {positions.map(position => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefonnummer"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DatePicker
                  label="Geburtsdatum"
                  value={formData.birthDate}
                  onChange={handleDateChange}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/coach/players')}
              disabled={loading}
            >
              Abbrechen
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
              disabled={loading}
            >
              {loading ? 'Wird erstellt...' : 'Spieler erstellen'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CreatePlayer;