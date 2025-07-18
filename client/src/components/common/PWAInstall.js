import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import {
  GetApp,
  Close,
  PhoneIphone,
  Android,
  Computer,
  Check
} from '@mui/icons-material';
import {
  isPWAInstallAvailable,
  isAppInstalled,
  getDeviceType,
  showPWAInstallPrompt,
  getInstallInstructions
} from '../../utils/pwaInstall';

const PWAInstall = ({ variant = 'button', onInstallComplete }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const [showDialog, setShowDialog] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    const checkInstallStatus = () => {
      setIsAvailable(isPWAInstallAvailable());
      setIsInstalled(isAppInstalled());
      setDeviceType(getDeviceType());
    };

    checkInstallStatus();

    // Check periodically in case install status changes
    const interval = setInterval(checkInstallStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    try {
      const result = await showPWAInstallPrompt();
      
      if (result.success) {
        if (result.method === 'android-prompt') {
          setSnackbarMessage('App wurde erfolgreich installiert!');
          setSnackbarSeverity('success');
          setShowSnackbar(true);
          setShowDialog(false);
          
          // Update state
          setIsInstalled(true);
          setIsAvailable(false);
          
          if (onInstallComplete) {
            onInstallComplete();
          }
        } else {
          // Show instructions dialog for iOS/desktop
          setShowDialog(true);
        }
      } else {
        setSnackbarMessage('Installation wurde abgebrochen');
        setSnackbarSeverity('info');
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Error during PWA install:', error);
      setSnackbarMessage('Fehler bei der Installation');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'ios':
        return <PhoneIphone />;
      case 'android':
        return <Android />;
      default:
        return <Computer />;
    }
  };

  const getInstallText = () => {
    if (isInstalled) {
      return 'App installiert';
    }
    
    switch (deviceType) {
      case 'ios':
        return 'Zum Homescreen hinzufügen';
      case 'android':
        return 'App installieren';
      default:
        return 'App installieren';
    }
  };

  const instructions = getInstallInstructions();

  // Don't render if app is already installed
  if (isInstalled) {
    if (variant === 'chip') {
      return (
        <Chip
          icon={<Check />}
          label="App installiert"
          color="success"
          variant="outlined"
          size="small"
        />
      );
    }
    return null;
  }

  // Don't render if install is not available
  if (!isAvailable) {
    return null;
  }

  const renderButton = () => {
    switch (variant) {
      case 'menu-item':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }} onClick={handleInstall}>
            <GetApp sx={{ mr: 1 }} />
            <Typography>{getInstallText()}</Typography>
          </Box>
        );
      case 'chip':
        return (
          <Chip
            icon={<GetApp />}
            label={getInstallText()}
            onClick={handleInstall}
            color="primary"
            variant="outlined"
            size="small"
          />
        );
      default:
        return (
          <Button
            variant="contained"
            startIcon={<GetApp />}
            onClick={handleInstall}
            fullWidth
            sx={{ mt: 2 }}
          >
            {getInstallText()}
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      {/* Instructions Dialog */}
      <Dialog
        open={showDialog}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {getDeviceIcon()}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {instructions.title}
              </Typography>
            </Box>
            <IconButton onClick={handleDialogClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Installiere die Volleyball App auf deinem Gerät für eine bessere Erfahrung:
          </Typography>
          
          <List>
            {instructions.steps.map((step, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {index + 1}
                  </Box>
                </ListItemIcon>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              💡 <strong>Tipp:</strong> Nach der Installation kannst du die App wie eine normale App 
              verwenden - auch offline!
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

PWAInstall.propTypes = {
  variant: PropTypes.oneOf(['button', 'menu-item', 'chip']),
  onInstallComplete: PropTypes.func
};

export default PWAInstall;