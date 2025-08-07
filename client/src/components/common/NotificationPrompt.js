import React, { useState } from 'react';

import PropTypes from 'prop-types';

import {
  NotificationsActive,
  Close,
  Notifications,
  SportsVolleyball
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';

import axios from '../../utils/axios';
import {
  subscribeToPushNotifications,
  requestNotificationPermission
} from '../../utils/pushNotifications';

const NotificationPrompt = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      // Request permission
      const granted = await requestNotificationPermission();
      
      if (!granted) {
        setError('Benachrichtigungen wurden abgelehnt. Sie können sie später in den Browsereinstellungen aktivieren.');
        return;
      }

      // Subscribe to push notifications
      await subscribeToPushNotifications();
      
      // Mark prompt as shown
      await axios.post('/notifications/dismiss-prompt');
      
      // Close the dialog
      onClose(true); // Pass true to indicate notifications were enabled
      
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError('Fehler beim Aktivieren der Benachrichtigungen. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      // Mark prompt as dismissed
      await axios.post('/notifications/dismiss-prompt');
      onClose(false); // Pass false to indicate notifications were not enabled
    } catch (err) {
      console.error('Error dismissing prompt:', err);
      // Still close the dialog even if the API call fails
      onClose(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SportsVolleyball sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Benachrichtigungen aktivieren
            </Typography>
          </Box>
          <IconButton onClick={handleDismiss} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <NotificationsActive 
            sx={{ 
              fontSize: 60, 
              color: 'primary.main', 
              mb: 2,
              opacity: 0.8
            }} 
          />
          
          <Typography variant="h6" gutterBottom>
            Verpassen Sie keine wichtigen Updates!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Aktivieren Sie Benachrichtigungen, um rechtzeitig über folgende Ereignisse informiert zu werden:
          </Typography>
          
          <Box sx={{ textAlign: 'left', maxWidth: 300, mx: 'auto' }}>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Notifications sx={{ mr: 1, fontSize: 16 }} />
              Event-Erinnerungen
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Notifications sx={{ mr: 1, fontSize: 16 }} />
              Gastspieler-Einladungen
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Notifications sx={{ mr: 1, fontSize: 16 }} />
              Team-Updates
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Sie können Benachrichtigungen jederzeit in Ihrem Profil aktivieren oder deaktivieren.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleDismiss}
          variant="outlined"
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Später
        </Button>
        
        <Button
          onClick={handleEnableNotifications}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <NotificationsActive />}
          sx={{ minWidth: 140 }}
        >
          {loading ? 'Aktiviere...' : 'Aktivieren'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

NotificationPrompt.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default NotificationPrompt;