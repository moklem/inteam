import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Group } from '@mui/icons-material';

import {
  Info,
  SportsVolleyball
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
  Tooltip,
  IconButton
} from '@mui/material';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { de } from 'date-fns/locale';

import { AuthContext } from '../../context/AuthContext';

const Register = () => {
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
  
  const { register, error, setError } = useContext(AuthContext);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [inviteCode] = useState(searchParams.get('invite') || '');
  const [inviteTeam, setInviteTeam] = useState(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteCode) return;
      
      setCheckingInvite(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/team-invites/validate/${inviteCode}`);
        if (response.data.valid) {
          setInviteTeam(response.data.team);
        } else {
          setFormError('Der Einladungslink ist nicht mehr gültig.');
        }
      } catch (error) {
        console.error('Error checking invite:', error);
        setFormError('Ungültiger Einladungslink.');
      } finally {
        setCheckingInvite(false);
      }
    };
    
    checkInvite();
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name || !email || !password || !confirmPassword || !birthDate) {
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
    
    // Determine if user is a youth player based on age
    const today = new Date();
    const birthYear = birthDate.getFullYear();
    const currentYear = today.getFullYear();
    const age = currentYear - birthYear;
    
    // If age is 20 or less, set role to Jugendspieler, otherwise Spieler
    const userRole = age <= 20 ? 'Jugendspieler' : 'Spieler';
    
    try {
      const res = await register({
        name,
        email,
        password,
        role: userRole, // Automatically set based on age
        birthDate,
        phoneNumber,
        position,
        inviteCode // Add this line to include the invite code
      });
      
      if (res) {
        navigate('/');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setFormError(err.message || 'Registrierung fehlgeschlagen');
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
            <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
              <SportsVolleyball />
            </Avatar>
            <Typography component="h1" variant="h4">
              Registrierung
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Erstellen Sie Ihr Spielerkonto
            </Typography>
          </Box>

          {inviteTeam && (
            <Alert severity="info" icon={<Group />} sx={{ mb: 3 }}>
              <Typography variant="body2">
                Sie wurden eingeladen, dem Team <strong>{inviteTeam.name}</strong> beizutreten.
                Nach der Registrierung werden Sie automatisch diesem Team hinzugefügt.
              </Typography>
            </Alert>
          )}
          
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
                    label="Geburtsdatum *"
                    value={birthDate}
                    onChange={(newValue) => setBirthDate(newValue)}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth required disabled={isSubmitting} />
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
                  label="Position (optional)"
                  name="position"
                  placeholder="z.B. Außenangreifer, Libero"
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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Info color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Spieler unter 21 Jahren werden automatisch als Jugendspieler registriert.
                  </Typography>
                </Box>
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
              {isSubmitting ? <CircularProgress size={24} /> : 'Registrieren'}
            </Button>
            
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">
                  Bereits ein Konto? Anmelden
                </Link>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                Sind Sie ein Trainer?{' '}
                <Tooltip title="Trainer benötigen ein spezielles Passwort zur Registrierung">
                  <IconButton size="small">
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
            </Box>
          </Box>
        </Paper>
        {checkingInvite && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress size={24} />
        </Box>)}
      </Box>
    </Container>
  );
};

export default Register;