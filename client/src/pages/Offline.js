import React from 'react';

import { Link as RouterLink } from 'react-router-dom';

import { WifiOff, Refresh, Home } from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper
} from '@mui/material';

const Offline = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ mt: 8, p: 4, textAlign: 'center' }}>
        <WifiOff sx={{ fontSize: 100, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h3" component="h1" gutterBottom>
          Sie sind offline
        </Typography>
        
        <Typography variant="h6" component="h2" gutterBottom>
          Keine Internetverbindung verfügbar
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          Die Volleyball Team Manager App benötigt eine Internetverbindung, um auf die neuesten Daten zuzugreifen.
          Einige Funktionen sind möglicherweise im Offline-Modus verfügbar.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Erneut versuchen
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<Home />}
            component={RouterLink}
            to="/"
          >
            Zur Startseite
          </Button>
        </Box>
        
        <Box sx={{ mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Wenn Sie im Offline-Modus arbeiten, werden Ihre Änderungen synchronisiert, sobald Sie wieder online sind.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Offline;
