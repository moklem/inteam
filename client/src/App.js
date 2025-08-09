import React, { useContext, useEffect, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';

import { Box, CircularProgress } from '@mui/material';

// React Query

import NotificationPrompt from './components/common/NotificationPrompt';
import CoachLayout from './components/layout/CoachLayout';
import Layout from './components/layout/Layout';

// Context Providers
import PlayerLayout from './components/layout/PlayerLayout';
import AttributeProvider from './context/AttributeContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import EventProvider from './context/EventContext';
import TeamProvider from './context/TeamContext';
import { ProgressProvider } from './context/ProgressContext';

// Layout Components

// Auth Pages
import CoachRegister from './pages/auth/CoachRegister';
import CoachRegisterAccess from './pages/auth/CoachRegisterAccess';
import ForgotPassword from './pages/auth/ForgotPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';

// Common Pages
import AddPlayersToTeam from './pages/coach/AddPlayersToTeam';
import CoachAttributes from './pages/coach/Attributes';
import Profile from './pages/Profile';

// Player Pages
import PlayerDashboard from './pages/player/Dashboard';
import PlayerEventDetail from './pages/player/EventDetail';
import PlayerEvents from './pages/player/Events';
import PlayerTeamDetail from './pages/player/TeamDetail';
import PlayerTeams from './pages/player/Teams';
import PlayerStatistik from './pages/player/PlayerStatistik';
import PlayerSelfAssessment from './pages/player/SelfAssessment';
import TeamComparison from './pages/player/TeamComparison';

// Coach Pages
import CoachCreateEvent from './pages/coach/CreateEvent';
import CoachCreateTeam from './pages/coach/CreateTeam';
import CoachDashboard from './pages/coach/Dashboard';
import CoachEditEvent from './pages/coach/EditEvent';
import CoachEditTeam from './pages/coach/EditTeam';
import CoachEventDetail from './pages/coach/EventDetail';
import CoachEvents from './pages/coach/Events';
import CoachPlayerDetail from './pages/coach/PlayerDetail';
import CoachPlayers from './pages/coach/Players';
import CoachCreatePlayer from './pages/coach/CreatePlayer';
import PlayerProgress from './pages/coach/PlayerProgress';
import CoachTeamDetail from './pages/coach/TeamDetail';
import CoachTeams from './pages/coach/Teams';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Offline from './pages/Offline';

// Import click handler utility
import { initClickHandling, cleanupClickHandling } from './utils/clickHandler';

// Import notification components
import { getBackendNotificationStatus, unsubscribeFromPushNotifications } from './utils/pushNotifications';
import { queryClient } from './utils/queryClient';

// ============================================
// AXIOS CONFIGURATION - FIX FOR API URL ISSUE
// ============================================

// Configure axios defaults for production
const API_URL = process.env.REACT_APP_API_URL || 'https://inteam.onrender.com/api';

// Set base URL for all axios requests
axios.defaults.baseURL = API_URL;

// Add auth interceptor to include token with every request
axios.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
        }
      } catch (e) {
        console.error('Error setting auth:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.error('Authentication error - redirecting to login');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

console.log('Axios configured with base URL:', API_URL);

// ============================================
// END AXIOS CONFIGURATION
// ============================================

// Route Guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired
};

const CoachRoute = ({ children }) => {
  const { user, loading, isCoach } = useContext(AuthContext);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return user && isCoach() ? children : <Navigate to="/" />;
};

CoachRoute.propTypes = {
  children: PropTypes.node.isRequired
};

const PlayerRoute = ({ children }) => {
  const { user, loading, isPlayer } = useContext(AuthContext);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return user && isPlayer() ? children : <Navigate to="/" />;
};

PlayerRoute.propTypes = {
  children: PropTypes.node.isRequired
};

// App Component
const AppContent = () => {
  const { user, isCoach, isPlayer } = useContext(AuthContext);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  
  // Initialize click handling when the component mounts
  useEffect(() => {
    // Initialize click handling
    initClickHandling();
    
    // Set up service worker message listener for notification actions
    const handleServiceWorkerMessage = async (event) => {
      if (!event.data || !event.data.type) return;
      
      switch (event.data.type) {
        case 'GUEST_INVITATION_ACCEPT':
          if (event.data.eventId) {
            try {
              const response = await axios.post(`/events/${event.data.eventId}/guest/accept`);
              console.log('Guest invitation accepted:', response.data);
            } catch (error) {
              console.error('Error accepting guest invitation:', error);
            }
          }
          break;
          
        case 'GUEST_INVITATION_DECLINE':
          if (event.data.eventId) {
            try {
              const response = await axios.post(`/events/${event.data.eventId}/guest/decline`);
              console.log('Guest invitation declined:', response.data);
            } catch (error) {
              console.error('Error declining guest invitation:', error);
            }
          }
          break;
          
        case 'EVENT_INVITATION_ACCEPT':
          if (event.data.eventId) {
            try {
              const response = await axios.post(`/events/${event.data.eventId}/accept`);
              console.log('Event invitation accepted:', response.data);
            } catch (error) {
              console.error('Error accepting event invitation:', error);
            }
          }
          break;
          
        case 'EVENT_INVITATION_DECLINE':
          if (event.data.eventId) {
            try {
              const response = await axios.post(`/events/${event.data.eventId}/decline`);
              console.log('Event invitation declined:', response.data);
            } catch (error) {
              console.error('Error declining event invitation:', error);
            }
          }
          break;
          
        case 'UNSUBSCRIBE_NOTIFICATIONS':
          try {
            await unsubscribeFromPushNotifications();
            console.log('Unsubscribed from notifications');
          } catch (error) {
            console.error('Error unsubscribing from notifications:', error);
          }
          break;
          
        default:
          console.log('Unknown service worker message:', event.data.type);
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    // Clean up when the component unmounts
    return () => {
      cleanupClickHandling();
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);
  
  // Check if user should be shown notification prompt
  useEffect(() => {
    const checkNotificationPrompt = async () => {
      if (!user || !isPlayer()) return; // Only show to players
      
      try {
        const status = await getBackendNotificationStatus();
        setNotificationStatus(status);
        
        // Show prompt if user hasn't been shown before and isn't subscribed
        const shouldShowPrompt = !status.subscribed && !status.promptStatus?.shown;
        setShowNotificationPrompt(shouldShowPrompt);
      } catch (error) {
        console.error('Error checking notification status:', error);
      }
    };
    
    checkNotificationPrompt();
  }, [user, isPlayer]);
  
  const handleNotificationPromptClose = (enabled) => {
    setShowNotificationPrompt(false);
    
    if (enabled) {
      // Update the status to reflect that notifications are now enabled
      setNotificationStatus(prev => ({
        ...prev,
        subscribed: true
      }));
    }
  };
  
  return (
    <>
      <Routes>
      {/* Public Routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/reset-password/:token" element={user ? <Navigate to="/" /> : <ResetPassword />} />
      <Route path="/offline" element={<Offline />} />

      {/* Auth Routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/coach-register-access" element={user ? <Navigate to="/" /> : <CoachRegisterAccess />} />
      <Route path="/register-coach" element={user ? <Navigate to="/" /> : <CoachRegister />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/reset-password/:token" element={user ? <Navigate to="/" /> : <ResetPassword />} />
      <Route path="/offline" element={<Offline />} />
      
      {/* Private Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Home />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Navigate to={user?.role === 'Trainer' ? '/coach/profile' : '/player/profile'} replace />
          </PrivateRoute>
        }
      />
      
      {/* Player Routes */}
        <Route
          path="/player/*"
          element={
            <PlayerRoute>
              <PlayerLayout>
                <Routes>
                  <Route path="/" element={<PlayerDashboard />} />
                  <Route path="/events" element={<PlayerEvents />} />
                  <Route path="/events/:id" element={<PlayerEventDetail />} />
                  <Route path="/teams" element={<PlayerTeams />} />
                  <Route path="/teams/:id" element={<PlayerTeamDetail />} />
                  <Route path="/statistik" element={<PlayerStatistik />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </PlayerLayout>
            </PlayerRoute>
          }
        />

      <Route path="/player" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerDashboard />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/events" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerEvents />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/events/:id" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerEventDetail />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/teams" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerTeams />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/teams/:id" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerTeamDetail />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/statistik" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerStatistik />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/self-assessment" element={
        <PlayerRoute>
          <PlayerLayout>
            <PlayerSelfAssessment />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      <Route path="/player/team-comparison" element={
        <PlayerRoute>
          <PlayerLayout>
            <TeamComparison />
          </PlayerLayout>
        </PlayerRoute>
      } />
      
      {/* Coach Routes */}
        <Route
          path="/coach/*"
          element={
            <CoachRoute>
              <CoachLayout>
                <Routes>
                  <Route path="/" element={<CoachDashboard />} />
                  <Route path="/events" element={<CoachEvents />} />
                  <Route path="/events/create" element={<CoachCreateEvent />} />
                  <Route path="/events/:id" element={<CoachEventDetail />} />
                  <Route path="/events/:id/edit" element={<CoachEditEvent />} />
                  <Route path="/teams" element={<CoachTeams />} />
                  <Route path="/teams/create" element={<CoachCreateTeam />} />
                  <Route path="/teams/:id" element={<CoachTeamDetail />} />
                  <Route path="/teams/:id/edit" element={<CoachEditTeam />} />
                  <Route path="/teams/:id/add-players" element={<AddPlayersToTeam />} />
                  <Route path="/players" element={<CoachPlayers />} />
                  <Route path="/players/create" element={<CoachCreatePlayer />} />
                  <Route path="/players/:id" element={<CoachPlayerDetail />} />
                  <Route path="/attributes" element={<CoachAttributes />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </CoachLayout>
            </CoachRoute>
          }
        />

      <Route path="/coach" element={
        <CoachRoute>
          <CoachLayout>
            <CoachDashboard />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/events" element={
        <CoachRoute>
          <CoachLayout>
            <CoachEvents />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/events/:id" element={
        <CoachRoute>
          <CoachLayout>
            <CoachEventDetail />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/events/create" element={
        <CoachRoute>
          <CoachLayout>
            <CoachCreateEvent />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/events/edit/:id" element={
        <CoachRoute>
          <CoachLayout>
            <CoachEditEvent />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/teams" element={
        <CoachRoute>
          <CoachLayout>
            <CoachTeams />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/teams/:id" element={
        <CoachRoute>
          <CoachLayout>
            <CoachTeamDetail />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/teams/:id/add-players" element={
       <CoachRoute>
        <CoachLayout>
          <AddPlayersToTeam />
        </CoachLayout>
       </CoachRoute>
      } />

      <Route path="/coach/teams/create" element={
        <CoachRoute>
          <CoachLayout>
            <CoachCreateTeam />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/teams/edit/:id" element={
        <CoachRoute>
          <CoachLayout>
            <CoachEditTeam />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/players" element={
        <CoachRoute>
          <CoachLayout>
            <CoachPlayers />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/players/create" element={
        <CoachRoute>
          <CoachLayout>
            <CoachCreatePlayer />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/players/:id" element={
        <CoachRoute>
          <CoachLayout>
            <CoachPlayerDetail />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/players/:playerId/progress" element={
        <CoachRoute>
          <CoachLayout>
            <PlayerProgress />
          </CoachLayout>
        </CoachRoute>
      } />
      
      <Route path="/coach/attributes" element={
        <CoachRoute>
          <CoachLayout>
            <CoachAttributes />
          </CoachLayout>
        </CoachRoute>
      } />
      
      {/* Redirect based on role */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          {isCoach() ? <Navigate to="/coach" /> : (isPlayer() ? <Navigate to="/player" /> : <Navigate to="/" />)}
        </PrivateRoute>
      } />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    
    {/* Notification Prompt */}
    <NotificationPrompt
      open={showNotificationPrompt}
      onClose={handleNotificationPromptClose}
    />
    </>
  );
};

// Main App component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TeamProvider>
          <EventProvider>
            <AttributeProvider>
              <ProgressProvider>
                <AppContent />
              </ProgressProvider>
            </AttributeProvider>
          </EventProvider>
        </TeamProvider>
      </AuthProvider>
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
