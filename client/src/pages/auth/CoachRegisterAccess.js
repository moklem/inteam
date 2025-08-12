import React, { useState } from 'react';

import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  SportsVolleyball
} from '@mui/icons-material';
import {
  Avatar,
  Button,
  TextField,
  Link,
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';

const CoachRegisterAccess = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setError('Bitte geben Sie das Passwort ein');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/users/verify-coach-password`,
        { password }
      );
      
      if (response.data.success) {
        // Store verification in sessionStorage (expires when browser closes)
        sessionStorage.setItem('coachRegisterAccess', 'verified');
        navigate('/register-coach');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setError(
        err.response?.data?.message || 
        'Ungültiges Passwort. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main', width: 56, height: 56 }}>
              <LockOutlined />
            </Avatar>
            <Typography component="h1" variant="h5">
              Trainer-Registrierung
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Diese Seite ist nur für Trainer zugänglich. 
              Bitte geben Sie das Registrierungspasswort ein.
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              required
              fullWidth
              name="password"
              label="Registrierungspasswort"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Zugang erhalten'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Kein Trainer?{' '}
                <Link component={RouterLink} to="/register" variant="body2">
                  Zur Spieler-Registrierung
                </Link>
              </Typography>
            </Box>
            
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Zurück zur Anmeldung
              </Link>
            </Box>
          </Box>
        </Paper>
        
        <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: 'info.light', width: '100%' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            <strong>Hinweis:</strong> Wenn Sie das Passwort nicht kennen, 
            wenden Sie sich bitte an Ihren Vereinsadministrator.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default CoachRegisterAccess;