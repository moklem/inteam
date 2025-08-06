import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Avatar,
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from "@mui/material";
import { SportsVolleyball, Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState({ email: "", name: "" });

  useEffect(() => {
    // Validate the reset token when component mounts
    const validateToken = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/users/reset-password/${token}`);
        if (response.data.valid) {
          setTokenValid(true);
          setUserInfo({
            email: response.data.email,
            name: response.data.name
          });
        } else {
          setTokenValid(false);
          setFormError("Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen Link an.");
        }
      } catch (err) {
        console.error("Token validation error:", err);
        setTokenValid(false);
        setFormError(err.response?.data?.message || "Ungültiger oder abgelaufener Reset-Link.");
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setIsValidating(false);
      setFormError("Kein Reset-Token gefunden.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (\!password || \!confirmPassword) {
      setFormError("Bitte füllen Sie alle Felder aus");
      return;
    }
    
    if (password.length < 6) {
      setFormError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    
    if (password \!== confirmPassword) {
      setFormError("Passwörter stimmen nicht überein");
      return;
    }
    
    setIsSubmitting(true);
    setFormError("");
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/users/reset-password/${token}`, {
        password
      });
      
      setSuccess(true);
      setFormError("");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err);
      setFormError(err.response?.data?.message || "Passwort-Reset fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(\!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(\!showConfirmPassword);
  };

  if (isValidating) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ mt: 8, p: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Überprüfe Reset-Link...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
          <SportsVolleyball />
        </Avatar>
        <Typography component="h1" variant="h5">
          Volleyball Team Manager
        </Typography>
        <Typography component="h2" variant="h6" sx={{ mt: 1 }}>
          Neues Passwort festlegen
        </Typography>
        
        {tokenValid && userInfo.email && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
            Passwort zurücksetzen für: <strong>{userInfo.email}</strong>
          </Typography>
        )}
        
        {formError && (
          <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
            {formError}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ width: "100%", mt: 2 }}>
            Ihr Passwort wurde erfolgreich zurückgesetzt\! Sie werden in Kürze zur Anmeldeseite weitergeleitet...
          </Alert>
        )}
        
        {tokenValid && \!success && (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Neues Passwort"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Passwort bestätigen"
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
              {isSubmitting ? <CircularProgress size={24} /> : "Passwort zurücksetzen"}
            </Button>
          </Box>
        )}
        
        <Grid container>
          <Grid item xs>
            <Link component={RouterLink} to="/login" variant="body2">
              Zurück zur Anmeldung
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/register" variant="body2">
              {"Noch kein Konto? Registrieren"}
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
