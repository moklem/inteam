import React, { useState, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Info,
  SportsTennis
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
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
  const [role, setRole] = useState('Spieler');
  const [birthDate, setBirthDate] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [position, setPosition] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, error, setError } = useContext(AuthContext);
  const navigate = useNavigate();

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
    
    // If age is 20 or less, set role to Jugendspieler
    const userRole = (role === 'Spieler' && age <= 20) ? 'Jugendspieler' : role;
    
    try {
      await register({
        name,
        email,
        password,
        role: userRole,
        birthDate,
        phoneNumber,
        position
      });
      
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registrierung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <SportsTennis />
        </Avatar>
        <Typography component="h1" variant="h5">
          Volleyball Team Manager
        </Typography>
        <Typography component="h2" variant="h6" sx={{ mt: 1 }}>
          Registrieren
        </Typography>
        
        {(formError || error) && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {formError || error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="name"
                label="Name"
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
                label="E-Mail Adresse"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Passwort bestätigen"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="role-label">Rolle</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  value={role}
                  label="Rolle"
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSubmitting}
                >
                  <MenuItem value="Spieler">Spieler</MenuItem>
                  <MenuItem value="Trainer">Trainer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: 'relative' }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                  <DatePicker
                    label="Geburtsdatum *"
                    value={birthDate}
                    onChange={(newValue) => setBirthDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: {
                          cursor: 'pointer',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </LocalizationProvider>
                <Tooltip title="Wählen Sie Ihr Geburtsdatum" placement="right">
                  <IconButton
                    sx={{
                      position: 'absolute',
                      right: -36,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 }
                    }}
                    size="small"
                  >
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="phoneNumber"
                label="Telefonnummer"
                name="phoneNumber"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: 'relative' }}>
                <FormControl fullWidth>
                  <InputLabel id="position-label">Position</InputLabel>
                  <Select
                    labelId="position-label"
                    id="position"
                    value={position}
                    label="Position"
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={isSubmitting}
                    sx={{
                      cursor: 'pointer',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 300,
                          '& .MuiMenuItem-root': {
                            padding: '10px 16px',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)'
                            }
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                    <MenuItem value="Mittelblocker">Mittelblocker</MenuItem>
                    <MenuItem value="Außenangreifer">Außenangreifer</MenuItem>
                    <MenuItem value="Diagonalangreifer">Diagonalangreifer</MenuItem>
                    <MenuItem value="Libero">Libero</MenuItem>
                    <MenuItem value="Universal">Universal</MenuItem>
                  </Select>
                </FormControl>
                <Tooltip title="Wählen Sie Ihre Spielposition" placement="right">
                  <IconButton
                    sx={{
                      position: 'absolute',
                      right: -36,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 }
                    }}
                    size="small"
                  >
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Tooltip title="Sie müssen den Nutzungsbedingungen zustimmen, um fortzufahren" placement="right">
                <FormControlLabel
                  control={
                    <Checkbox
                      value="agreeTerms"
                      color="primary"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      disabled={isSubmitting}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)'
                        }
                      }}
                    />
                  }
                  label="Ich stimme den Nutzungsbedingungen zu und akzeptiere die Datenschutzerklärung."
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      color: 'primary.main'
                    }
                  }}
                />
              </Tooltip>
            </Grid>
          </Grid>
          <Tooltip title="Klicken Sie hier, um sich zu registrieren" placement="top">
            <span>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Registrieren'}
              </Button>
            </span>
          </Tooltip>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Bereits ein Konto? Anmelden
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;