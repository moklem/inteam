import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './index.css';
import { initPolyfills } from './utils/polyfills';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import App from './App';

// Initialize polyfills
initPolyfills();

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#4791db',
      dark: '#115293',
    },
    secondary: {
      main: '#dc004e',
      light: '#e33371',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    action: {
      hover: 'rgba(25, 118, 210, 0.08)',
      selected: 'rgba(25, 118, 210, 0.16)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // Fix for MUI Select on mobile devices
MuiSelect: {
  defaultProps: {
    // Remove the native detection and use MenuProps instead
    MenuProps: {
      // Ensure the menu is properly positioned and clickable
      disablePortal: true,
      keepMounted: false,
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'left',
      },
      transformOrigin: {
        vertical: 'top',
        horizontal: 'left',
      },
      PaperProps: {
        style: {
          maxHeight: '50vh',
        },
        sx: {
          // Force higher z-index
          zIndex: 1350,
          // Ensure it's clickable
          pointerEvents: 'auto',
          // Better positioning on mobile
          '@media (max-width: 600px)': {
            position: 'fixed !important',
            left: '0 !important',
            right: '0 !important',
            margin: '0 16px !important',
            maxWidth: 'calc(100vw - 32px) !important',
          },
        },
      },
      // Disable scroll lock to prevent issues
      disableScrollLock: true,
      // Ensure backdrop is clickable
      BackdropProps: {
        style: {
          position: 'fixed',
          touchAction: 'auto',
        },
      },
    },
  },
  styleOverrides: {
    root: {
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      '&:hover': {
        cursor: 'pointer',
      },
    },
    select: {
      cursor: 'pointer !important',
      touchAction: 'manipulation !important',
      pointerEvents: 'auto !important',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      // Fix for iOS
      WebkitAppearance: 'none',
      '&:focus': {
        backgroundColor: 'transparent',
      },
    },
    icon: {
      cursor: 'pointer',
      pointerEvents: 'none', // Icon shouldn't intercept clicks
    },
  },
},
    // Ensure proper Menu behavior on mobile
    MuiMenu: {
      defaultProps: {
        keepMounted: true, // Keep menu in DOM for better mobile performance
        elevation: 8, // Higher elevation for better visibility
      },
      styleOverrides: {
        root: {
          pointerEvents: 'auto',
          zIndex: 1301, // Ensure it's above other elements
        },
        paper: {
          cursor: 'pointer',
          touchAction: 'auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Ensure visibility on mobile
          '@media (max-width: 600px)': {
            maxHeight: '50vh !important',
            position: 'fixed !important',
          },
        },
        list: {
          cursor: 'pointer',
          pointerEvents: 'auto',
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    // Enhanced MenuItem for better mobile touch targets
    MuiMenuItem: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          touchAction: 'manipulation',
          pointerEvents: 'auto',
          minHeight: 48, // Better touch target
          paddingTop: 12,
          paddingBottom: 12,
          '&:hover': {
            cursor: 'pointer',
            backgroundColor: theme => theme.palette.action.hover,
          },
          '@media (hover: none)': {
            '&:hover': {
              backgroundColor: 'transparent',
            },
            '&:active': {
              backgroundColor: theme => theme.palette.action.selected,
            },
          },
        },
      },
    },
    // Fix Popover behavior on mobile
    MuiPopover: {
      defaultProps: {
        elevation: 8,
        keepMounted: true,
      },
      styleOverrides: {
        root: {
          pointerEvents: 'auto',
          zIndex: 1301,
        },
        paper: {
          cursor: 'auto',
          touchAction: 'auto',
          pointerEvents: 'auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Mobile specific
          '@media (max-width: 600px)': {
            maxHeight: '70vh !important',
            margin: '16px !important',
          },
        },
      },
    },
    // Ensure backdrop works properly
    MuiBackdrop: {
      styleOverrides: {
        root: {
          touchAction: 'auto',
          cursor: 'pointer',
          '@media (hover: none)': {
            // Ensure backdrop is visible on mobile
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    // Modal configuration for mobile
    MuiModal: {
      defaultProps: {
        keepMounted: true,
      },
      styleOverrides: {
        root: {
          zIndex: 1300,
          '@media (max-width: 600px)': {
            // Ensure modal is properly positioned on mobile
            '& .MuiBackdrop-root': {
              position: 'fixed',
            },
          },
        },
      },
    },
    // Form control enhancements
    MuiFormControl: {
      styleOverrides: {
        root: {
          touchAction: 'manipulation',
          '& .MuiInputBase-root': {
            cursor: 'pointer',
          },
        },
      },
    },
    // Input base configurations
    MuiInputBase: {
      styleOverrides: {
        root: {
          cursor: 'text',
          '&.MuiSelect-root': {
            cursor: 'pointer',
          },
        },
        input: {
          cursor: 'text',
          '&.MuiSelect-nativeInput': {
            cursor: 'pointer',
          },
        },
      },
    },
    // Global button configurations
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
        tabIndex: 0,
      },
      styleOverrides: {
        root: {
          cursor: 'pointer !important',
          pointerEvents: 'auto !important',
          touchAction: 'manipulation !important',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
      },
    },
    // List configurations
    MuiList: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          pointerEvents: 'auto',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          touchAction: 'manipulation',
          pointerEvents: 'auto',
          '&:hover': {
            cursor: 'pointer',
          },
        },
      },
    },
    // Paper component for better mobile menus
    MuiPaper: {
      styleOverrides: {
        root: {
          // Ensure paper components are properly layered
          '&.MuiMenu-paper, &.MuiPopover-paper': {
            overscrollBehavior: 'contain',
            '@media (max-width: 600px)': {
              // Better mobile positioning
              position: 'absolute !important',
              left: '50% !important',
              transform: 'translateX(-50%) !important',
              width: 'calc(100vw - 32px) !important',
              maxWidth: '400px !important',
            },
          },
        },
      },
    },
  },
});

// Log environment info (for debugging)
console.log('Environment:', process.env.NODE_ENV);
console.log('API URL:', process.env.REACT_APP_API_URL || 'Not set - using default');

// Safely create root
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for PWA functionality
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
