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
          '& input, & textarea': {
            cursor: 'text',
          },
        },
      },
    },
    // Fix for Select components on mobile
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          // Disable portal on mobile to prevent touch issues
          disablePortal: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
          // Ensure proper z-index
          style: { zIndex: 1350 },
          PaperProps: {
            style: {
              maxHeight: 400,
            },
            sx: {
              // Ensure the menu is touchable
              '& .MuiList-root': {
                padding: 0,
              },
            },
          },
          // Keep menu open on mobile scroll
          disableScrollLock: true,
          // Anchor to the select element
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        },
      },
      styleOverrides: {
        select: {
          cursor: 'pointer !important',
          touchAction: 'manipulation !important',
          // Ensure proper touch target size on mobile
          '@media (hover: none) and (pointer: coarse)': {
            minHeight: '44px',
            lineHeight: '44px',
          },
        },
        icon: {
          cursor: 'pointer !important',
          pointerEvents: 'none', // Icon shouldn't intercept clicks
        },
      },
    },
    // Fix for Menu components
    MuiMenu: {
      defaultProps: {
        // Disable portal on mobile
        disablePortal: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        // Keep menu open on scroll
        disableScrollLock: true,
      },
      styleOverrides: {
        paper: {
          // Ensure proper touch handling
          touchAction: 'auto',
          // Better shadow for mobile
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.2)',
        },
        list: {
          padding: 0,
        },
      },
    },
    // Fix for MenuItem components
    MuiMenuItem: {
      styleOverrides: {
        root: {
          cursor: 'pointer !important',
          touchAction: 'manipulation !important',
          // Ensure proper touch target size
          '@media (hover: none) and (pointer: coarse)': {
            minHeight: '48px',
            padding: '12px 16px',
          },
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.16)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.24)',
            },
          },
        },
      },
    },
    // Fix for Popover (used by Select and Menu)
    MuiPopover: {
      defaultProps: {
        // Disable restore focus which can cause issues on mobile
        disableRestoreFocus: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        // Ensure proper z-index layering
        style: { zIndex: 1350 },
      },
      styleOverrides: {
        paper: {
          // Ensure touch events work properly
          touchAction: 'auto',
          pointerEvents: 'auto',
        },
      },
    },
    // Fix for List components (used in menus)
    MuiList: {
      styleOverrides: {
        root: {
          // Better scrolling on mobile
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        },
      },
    },
    // Additional fix for form controls
    MuiFormControl: {
      styleOverrides: {
        root: {
          // Ensure proper layout on mobile
          width: '100%',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
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
serviceWorkerRegistration.register({
  onUpdate: registration => {
    console.log('New content is available; please refresh.');
    // You could show a notification to the user here
    if (window.confirm('New version available! Click OK to refresh.')) {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    }
  },
  onSuccess: registration => {
    console.log('Content is cached for offline use.');
  },
});