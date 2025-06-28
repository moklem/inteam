import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import { Box, CircularProgress } from '@mui/material';

// Context Providers
import AttributeProvider from './context/AttributeContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import EventProvider from './context/EventContext';
import TeamProvider from './context/TeamContext';

// Layout Components
import Layout from './components/layout/Layout';
import PlayerLayout from './components/layout/PlayerLayout';
import CoachLayout from './components/layout/CoachLayout';

// Auth Pages
import ForgotPassword from './pages/auth/ForgotPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Common Pages
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Offline from './pages/Offline';
import Profile from './pages/Profile';

// Player Pages
import PlayerDashboard from './pages/player/Dashboard';
import PlayerEventDetail from './pages/player/EventDetail';
import PlayerEvents from './pages/player/Events';
import PlayerTeamDetail from './pages/player/TeamDetail';
import PlayerTeams from './pages/player/Teams';

// Coach Pages
import CoachAttributes from './pages/coach/Attributes';
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
import CoachTeamDetail from './pages/coach/TeamDetail';
import CoachTeams from './pages/coach/Teams';
import AddPlayersToTeam from './pages/coach/AddPlayersToTeam';

// Import click handler utility
import { initClickHandling, cleanupClickHandling } from './utils/clickHandler';

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
      window.location.href = '/login';
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
  
  // Initialize click handling when the component mounts
  useEffect(() => {
    // Initialize click handling
    initClickHandling();
    
    // Clean up when the component unmounts
    return () => {
      cleanupClickHandling();
    };
  }, []);
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/offline" element={<Offline />} />
      
      {/* Private Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Home />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/profile" element={
        <PrivateRoute>
          <Layout>
            <Profile />
          </Layout>
        </PrivateRoute>
      } />
      
      {/* Player Routes */}
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
      
      {/* Coach Routes */}
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
  );
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <EventProvider>
          <AttributeProvider>
            <AppContent />
          </AttributeProvider>
        </EventProvider>
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;