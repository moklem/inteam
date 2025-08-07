import React, { useState, useContext, useEffect } from 'react';

import axios from 'axios';
import { de } from 'date-fns/locale';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  SportsVolleyball,
  Shield
} from '@mui/icons-material';
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { AuthContext } from '../../context/AuthContext';

const CoachRegister = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [position, setPosition] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error, setError } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has verified access
    const hasAccess = sessionStorage.getItem('coachRegisterAccess');
    if (!hasAccess || hasAccess !== 'verified') {
      navigate('/coach-register-access');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name || !email || !password || !confirmPassword) {
      setFormError('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (!agreeTerms) {
      setFormError('Bitte stimmen Sie den Nutzungsbedingungen zu');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    setError(null);
    
    try {
      // Register coach using the special coach registration endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/users/register-coach`,
        {
          name,
          email,
          password,
          birthDate,
          phoneNumber,
          position
        }
      );
      
      if (response.data) {
        // Clear the access verification
        sessionStorage.removeItem('coachRegisterAccess');
        
        // Automatically log in the new coach
        await login(email, password);
        navigate('/coach');
      }
    } catch (err) {
      console.error('Coach registration error:', err);
      setFormError(
        err.response?.data?.message || 
        'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main', width: 56, height: 56 }}>
              <Shield />
            </Avatar>
            <Typography component="h1" variant="h4">
              Trainer-Registrierung
            </Typography>
            <Chip 
              label="Verifizierter Zugang" 
              color="success" 
              size="small" 
              sx={{ mt: 1 }}
            />
          </Box>
          
          {(formError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="name"
                  label="Vollständiger Name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="E-Mail-Adresse"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                  <DatePicker
                    label="Geburtsdatum (optional)"
                    value={birthDate}
                    onChange={(newValue) => setBirthDate(newValue)}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth disabled={isSubmitting} />
                    }
                    disabled={isSubmitting}
                    maxDate={new Date()}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="phoneNumber"
                  label="Telefonnummer (optional)"
                  name="phoneNumber"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="position"
                  label="Trainer-Qualifikation (optional)"
                  name="position"
                  placeholder="z.B. A-Lizenz, B-Lizenz"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Passwort"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Passwort bestätigen"
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Trainer-Berechtigung:</strong> Als Trainer haben Sie Zugriff auf:
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      <li>Team-Verwaltung</li>
                      <li>Spieler-Verwaltung</li>
                      <li>Event-Planung</li>
                      <li>Leistungsbewertung</li>
                    </ul>
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      value="allowExtraEmails" 
                      color="primary"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      disabled={isSubmitting}
                    />
                  }
                  label="Ich stimme den Nutzungsbedingungen und Datenschutzrichtlinien zu"
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !agreeTerms}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Als Trainer registrieren'}
            </Button>
            
            <Grid container justifyContent="space-between">
              <Grid item>
                <Link component={RouterLink} to="/register" variant="body2">
                  Zur Spieler-Registrierung
                </Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">
                  Bereits ein Konto? Anmelden
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CoachRegister;