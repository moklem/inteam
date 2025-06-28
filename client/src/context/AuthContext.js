import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

// API URL with fallback for local development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthContext = createContext();

// Helper function to set auth header
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

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
          
          // Set auth header immediately
          setAuthHeader(parsedUser.token);
          
          // Verify token is still valid by fetching user profile
          try {
            const res = await axios.get(`${API_URL}/users/profile`);
            
            // Update user data with latest from server
            const updatedUser = {
              ...parsedUser,
              ...res.data,
              token: parsedUser.token // Keep the token
            };
            
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (err) {
            // If profile fetch fails, still use stored user data
            console.warn('Could not refresh user profile, using stored data');
            setUser(parsedUser);
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
      
      const res = await axios.post(`${API_URL}/users/register`, userData);
      
      if (res.data) {
        // Store user with token
        const userWithToken = {
          ...res.data,
          token: res.data.token
        };
        
        localStorage.setItem('user', JSON.stringify(userWithToken));
        setAuthHeader(res.data.token);
        setUser(userWithToken);
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
      
      const res = await axios.post(`${API_URL}/users/login`, { email, password });
      
      if (res.data) {
        // Store user with token
        const userWithToken = {
          ...res.data,
          token: res.data.token
        };
        
        localStorage.setItem('user', JSON.stringify(userWithToken));
        setAuthHeader(res.data.token);
        setUser(userWithToken);
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('user');
    setAuthHeader(null);
    setUser(null);
    window.location.href = '/login';
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`${API_URL}/users/profile`, userData);
      
      if (res.data) {
        // Update stored user data, keeping the token
        const updatedUser = {
          ...res.data,
          token: user.token
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is a coach
  const isCoach = () => {
    return user && user.role === 'Trainer';
  };

  // Check if user is a player (including youth players)
  const isPlayer = () => {
    return user && (user.role === 'Spieler' || user.role === 'Jugendspieler');
  };

  // Check if user is a youth player
  const isYouthPlayer = () => {
    return user && user.role === 'Jugendspieler';
  };

  const value = {
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
    setAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthProvider;