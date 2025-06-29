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
      main: '#1976d2', // Blue color
      light: '#4791db',
      dark: '#115293',
    },
    secondary: {
      main: '#dc004e', // Pink color
      light: '#e33371',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    action: {
      hover: 'rgba(25, 118, 210, 0.08)', // Light blue hover effect
      selected: 'rgba(25, 118, 210, 0.16)', // Slightly darker for selected items
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // Global styles for all interactive components
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false, // Ensure ripple effect is enabled
        tabIndex: 0, // Make all button base components focusable
      },
      styleOverrides: {
        root: {
          cursor: 'pointer !important',
          pointerEvents: 'auto !important',
          touchAction: 'manipulation !important',
          userSelect: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          '&:hover': {
            cursor: 'pointer',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          '&:hover': {
            cursor: 'pointer',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          '&:hover': {
            cursor: 'pointer',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            cursor: 'text',
          },
          '& .MuiInputBase-root': {
            cursor: 'text',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
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
