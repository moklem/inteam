import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  CircularProgress
} from "@mui/material";
import { LockOutlined, SportsVolleyball } from "@mui/icons-material";
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (\!email) {
      setFormError("Bitte E-Mail eingeben");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (\!emailRegex.test(email)) {
      setFormError("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }
    
    setIsSubmitting(true);
    setFormError("");
    setSuccess(false);
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/users/forgot-password`, {
        email
      });
      
      setSuccess(true);
      setFormError("");
    } catch (err) {
      console.error("Password reset error:", err);
      setFormError(err.response?.data?.message || "Passwort-Reset fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Passwort zurücksetzen
        </Typography>
        
        {formError && (
          <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
            {formError}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ width: "100%", mt: 2 }}>
            Eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts wurde gesendet.
            Bitte überprüfen Sie Ihren Posteingang und Spam-Ordner.
          </Alert>
        )}
        
        {\!success && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
          </Typography>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: "100%" }}>
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
            disabled={isSubmitting || success}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting || success}
          >
            {isSubmitting ? <CircularProgress size={24} /> : "Passwort zurücksetzen"}
          </Button>
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
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
