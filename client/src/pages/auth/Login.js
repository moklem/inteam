import React, { useState, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Info,
  LockOutlined,
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
  Tooltip,
  IconButton
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error, setError } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password) {
      setFormError('Bitte E-Mail und Passwort eingeben');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    setError(null);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <SportsTennis />
        </Avatar>
        <Typography component="h1" variant="h5">
          Volleyball Team Manager
        </Typography>
        <Typography component="h2" variant="h6" sx={{ mt: 1 }}>
          Anmelden
        </Typography>
        
        {(formError || error) && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {formError || error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <Box sx={{ position: 'relative' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-Mail Adresse"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                sx: {
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main'
                  }
                }
              }}
            />
            <Tooltip title="Geben Sie Ihre E-Mail-Adresse ein" placement="right">
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
          <Box sx={{ position: 'relative' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Passwort"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                sx: {
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main'
                  }
                }
              }}
            />
            <Tooltip title="Geben Sie Ihr Passwort ein" placement="right">
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
          <Tooltip title="Bleiben Sie für 30 Tage angemeldet" placement="right">
            <FormControlLabel
              control={
                <Checkbox
                  value="remember"
                  color="primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                />
              }
              label="Angemeldet bleiben"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Klicken Sie hier, um sich anzumelden" placement="top">
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
                {isSubmitting ? <CircularProgress size={24} /> : 'Anmelden'}
              </Button>
            </span>
          </Tooltip>
          <Grid container>
            <Grid item xs>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Passwort vergessen?
              </Link>
            </Grid>
            <Grid item>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Noch kein Konto? Registrieren"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;