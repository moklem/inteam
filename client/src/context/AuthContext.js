import React, { createContext, useState, useEffect, useContext } from 'react';

import axios from 'axios';
import PropTypes from 'prop-types';

// API URL configuration with smart detection
const getApiUrl = () => {
  // Check environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Production detection
  if (window.location.hostname === 'inteamfe.onrender.com') {
    return 'https://inteam.onrender.com/api';
  }
  
  // Default to localhost
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

// Configure axios defaults once
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

console.log('AuthContext initialized with API URL:', API_URL);

// Helper function to set auth header
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Set default axios auth header
          setAuthHeader(parsedUser.token);
          
          // Verify token is still valid by fetching user profile
          try {
            const res = await axios.get('/users/profile');
            
            // Update user data with latest from server
            const updatedUser = {
              ...parsedUser,
              ...res.data
            };
            
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (profileError) {
            // Token might be invalid
            console.error('Token validation failed:', profileError);
            localStorage.removeItem('user');
            setAuthHeader(null);
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        localStorage.removeItem('user');
        setAuthHeader(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post('/users/register', userData);
      
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        setAuthHeader(res.data.token);
        setUser(res.data);
      }
      
      return res.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login to:', axios.defaults.baseURL + '/users/login');
      const res = await axios.post('/users/login', { email, password });
      
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        setAuthHeader(res.data.token);
        setUser(res.data);
        console.log('Login successful');
      }
      
      return res.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user - FIXED THE TYPO HERE
  const logout = () => {
    localStorage.removeItem('user');
    setAuthHeader(null); // Using helper function
    setUser(null);
    setError(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put('/users/profile', userData);
      
      if (res.data) {
        const updatedUser = {
          ...user,
          ...res.data
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return res.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is a coach
  const isCoach = () => {
    return user && user.role === 'Trainer';
  };

  // Check if user is a player
  const isPlayer = () => {
    return user && (user.role === 'Spieler' || user.role === 'Jugendspieler');
  };

  // Check if user is a youth player
  const isYouthPlayer = () => {
    return user && user.role === 'Jugendspieler';
  };

  // Context value - all functions included
  const contextValue = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    isCoach,
    isPlayer,
    isYouthPlayer,
    setError,  // This IS included!
    setUser  // Add setUser to allow direct user updates
  };

  // Debug log to verify context value
  console.log('AuthContext provider value keys:', Object.keys(contextValue));

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
