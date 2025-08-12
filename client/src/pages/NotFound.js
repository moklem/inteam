import React from 'react';

import { Link as RouterLink } from 'react-router-dom';

import { SportsVolleyball, Home } from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper
} from '@mui/material';

const NotFound = () => {
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ mt: 8, p: 4, textAlign: 'center' }}>
        <SportsVolleyball sx={{ fontSize: 100, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom>
          Seite nicht gefunden
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          Die von Ihnen gesuchte Seite existiert nicht oder wurde verschoben.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Home />}
            component={RouterLink}
            to="/"
          >
            Zurück zur Startseite
          </Button>
        </Box>
        
        <Box sx={{ mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Wenn Sie glauben, dass dies ein Fehler ist, kontaktieren Sie bitte den Administrator.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
