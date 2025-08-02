import React, { createContext, useContext, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';

const ThemePreferencesContext = createContext();

const THEME_PREFERENCES_KEY = 'theme_preferences';

const defaultPreferences = {
  theme: {
    mode: 'light',
    primaryColor: '#1976d2', // Default Material-UI blue
    accentColor: '#f50057', // Default Material-UI pink
    fontSize: 'medium'
  },
  layout: {
    dashboardWidgets: [
      { id: 'upcomingEvents', position: 0, visible: true },
      { id: 'teamOverview', position: 1, visible: true },
      { id: 'recentActivity', position: 2, visible: true },
      { id: 'quickActions', position: 3, visible: true }
    ],
    defaultPage: '/player',
    viewMode: 'comfortable'
  },
  shortcuts: [],
  notifications: {
    enabled: true,
    types: ['events', 'teams', 'invitations'],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  }
};

const predefinedThemes = {
  beach: {
    name: 'Beach',
    primaryColor: '#ff9800', // Orange
    accentColor: '#2196f3', // Blue
    description: 'Warme Strand-Farben'
  },
  indoor: {
    name: 'Indoor',
    primaryColor: '#4caf50', // Green
    accentColor: '#ff5722', // Deep Orange
    description: 'Klassische Hallen-Farben'
  },
  night: {
    name: 'Nacht Modus',
    primaryColor: '#9c27b0', // Purple
    accentColor: '#ffc107', // Amber
    description: 'Dunkle Farben für abends'
  },
  custom: {
    name: 'Benutzerdefiniert',
    primaryColor: '#1976d2',
    accentColor: '#f50057',
    description: 'Eigene Farbauswahl'
  }
};

function themePreferencesReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: { ...state.theme, ...action.payload }
      };
    case 'SET_LAYOUT':
      return {
        ...state,
        layout: { ...state.layout, ...action.payload }
      };
    case 'UPDATE_WIDGET':
      return {
        ...state,
        layout: {
          ...state.layout,
          dashboardWidgets: state.layout.dashboardWidgets.map(widget =>
            widget.id === action.payload.id ? { ...widget, ...action.payload } : widget
          )
        }
      };
    case 'REORDER_WIDGETS':
      return {
        ...state,
        layout: {
          ...state.layout,
          dashboardWidgets: action.payload
        }
      };
    case 'SET_SHORTCUTS':
      return {
        ...state,
        shortcuts: action.payload
      };
    case 'ADD_SHORTCUT':
      return {
        ...state,
        shortcuts: [...state.shortcuts, action.payload]
      };
    case 'REMOVE_SHORTCUT':
      return {
        ...state,
        shortcuts: state.shortcuts.filter(shortcut => shortcut !== action.payload)
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: { ...state.notifications, ...action.payload }
      };
    case 'RESET_PREFERENCES':
      return defaultPreferences;
    case 'LOAD_PREFERENCES':
      return action.payload;
    default:
      return state;
  }
}

export const ThemePreferencesProvider = ({ children }) => {
  const [preferences, dispatch] = useReducer(themePreferencesReducer, defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const storedPreferences = localStorage.getItem(THEME_PREFERENCES_KEY);
      if (storedPreferences) {
        const parsed = JSON.parse(storedPreferences);
        // Merge with defaults to ensure all properties exist
        const merged = {
          ...defaultPreferences,
          ...parsed,
          theme: { ...defaultPreferences.theme, ...parsed.theme },
          layout: { 
            ...defaultPreferences.layout, 
            ...parsed.layout,
            dashboardWidgets: parsed.layout?.dashboardWidgets || defaultPreferences.layout.dashboardWidgets
          },
          notifications: { 
            ...defaultPreferences.notifications, 
            ...parsed.notifications,
            quietHours: { 
              ...defaultPreferences.notifications.quietHours, 
              ...parsed.notifications?.quietHours 
            }
          }
        };
        dispatch({ type: 'LOAD_PREFERENCES', payload: merged });
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(THEME_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving theme preferences:', error);
    }
  }, [preferences]);

  const setTheme = (themeData) => {
    dispatch({ type: 'SET_THEME', payload: themeData });
  };

  const applyPredefinedTheme = (themeName) => {
    const theme = predefinedThemes[themeName];
    if (theme) {
      setTheme({
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor
      });
    }
  };

  const setLayout = (layoutData) => {
    dispatch({ type: 'SET_LAYOUT', payload: layoutData });
  };

  const updateWidget = (widgetId, updates) => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { id: widgetId, ...updates } });
  };

  const reorderWidgets = (newOrder) => {
    dispatch({ type: 'REORDER_WIDGETS', payload: newOrder });
  };

  const addShortcut = (shortcut) => {
    if (!preferences.shortcuts.includes(shortcut)) {
      dispatch({ type: 'ADD_SHORTCUT', payload: shortcut });
    }
  };

  const removeShortcut = (shortcut) => {
    dispatch({ type: 'REMOVE_SHORTCUT', payload: shortcut });
  };

  const setNotifications = (notificationData) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationData });
  };

  const resetPreferences = () => {
    dispatch({ type: 'RESET_PREFERENCES' });
  };

  const exportPreferences = () => {
    return JSON.stringify(preferences, null, 2);
  };

  const importPreferences = (preferencesString) => {
    try {
      const imported = JSON.parse(preferencesString);
      // Validate structure
      if (imported.theme && imported.layout && imported.notifications) {
        dispatch({ type: 'LOAD_PREFERENCES', payload: imported });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing preferences:', error);
      return false;
    }
  };

  const value = {
    preferences,
    predefinedThemes,
    setTheme,
    applyPredefinedTheme,
    setLayout,
    updateWidget,
    reorderWidgets,
    addShortcut,
    removeShortcut,
    setNotifications,
    resetPreferences,
    exportPreferences,
    importPreferences
  };

  return (
    <ThemePreferencesContext.Provider value={value}>
      {children}
    </ThemePreferencesContext.Provider>
  );
};

ThemePreferencesProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useThemePreferences = () => {
  const context = useContext(ThemePreferencesContext);
  if (!context) {
    throw new Error('useThemePreferences must be used within a ThemePreferencesProvider');
  }
  return context;
};

export default ThemePreferencesContext;