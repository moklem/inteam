import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive,
  NotificationsOff
} from '@mui/icons-material';
import {
  checkNotificationSupport,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationStatus,
  updateNotificationPreferences,
  sendTestNotification
} from '../../utils/pushNotifications';

const NotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false
  });
  const [preferences, setPreferences] = useState({
    eventReminders: true,
    guestInvitations: true,
    teamUpdates: true,
    reminderHours: 24
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const currentStatus = await getNotificationStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Request permission
      const granted = await requestNotificationPermission();
      
      if (!granted) {
        setMessage({ type: 'error', text: 'Notification permission denied' });
        await checkStatus();
        return;
      }

      // Subscribe to push notifications
      await subscribeToPushNotifications();
      
      setMessage({ type: 'success', text: 'Push notifications enabled successfully!' });
      await checkStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to enable notifications' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await unsubscribeFromPushNotifications();
      setMessage({ type: 'success', text: 'Push notifications disabled' });
      await checkStatus();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disable notifications' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (preference, value) => {
    const newPreferences = { ...preferences, [preference]: value };
    setPreferences(newPreferences);

    try {
      await updateNotificationPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification();
      setMessage({ type: 'success', text: 'Test notification sent!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test notification' });
    } finally {
      setLoading(false);
    }
  };

  if (!status.supported) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          Push notifications are not supported in your browser.
        </Typography>
      </Alert>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <NotificationsIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            Notification Settings
          </Typography>
        </Box>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        <Box display="flex" alignItems="center" mb={3}>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Status:
          </Typography>
          {status.subscribed ? (
            <Chip
              icon={<NotificationsActive />}
              label="Enabled"
              color="success"
              size="small"
            />
          ) : (
            <Chip
              icon={<NotificationsOff />}
              label="Disabled"
              color="default"
              size="small"
            />
          )}
        </Box>

        {status.subscribed && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.eventReminders}
                    onChange={(e) => handlePreferenceChange('eventReminders', e.target.checked)}
                  />
                }
                label="Event Reminders"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 6, mb: 2 }}>
                Get notified about upcoming events
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.guestInvitations}
                    onChange={(e) => handlePreferenceChange('guestInvitations', e.target.checked)}
                  />
                }
                label="Guest Player Invitations"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 6, mb: 2 }}>
                Get notified when invited as a guest player
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.teamUpdates}
                    onChange={(e) => handlePreferenceChange('teamUpdates', e.target.checked)}
                  />
                }
                label="Team Updates"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
                Get notified about team changes and updates
              </Typography>
            </Box>
          </>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          {status.subscribed ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisableNotifications}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <NotificationsOff />}
            >
              Disable Notifications
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleEnableNotifications}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <NotificationsActive />}
            >
              Enable Notifications
            </Button>
          )}
        </Box>

        {status.subscribed && (
          <Button
            variant="outlined"
            onClick={handleTestNotification}
            disabled={loading}
          >
            Send Test
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default NotificationSettings;