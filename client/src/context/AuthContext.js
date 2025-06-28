import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

// API URL configuration
const getApiUrl = () => {
  // Check if we have an environment variable set
  if (process.env.REACT_APP_API_URL) {
    console.log('Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Production URL detection based on hostname
  if (window.location.hostname === 'inteamfe.onrender.com') {
    console.log('Detected production environment, using production API');
    return 'https://inteam.onrender.com/api';
  }
  
  // Default to localhost for development
  console.log('Using localhost API for development');
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

// Configure axios defaults
axios.defaults.baseURL = API_URL;
console.log('Axios configured with base URL:', API_URL);

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
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
          
          // Verify token is still valid by fetching user profile
          const res = await axios.get('/users/profile');
          
          // Update user data with latest from server
          const updatedUser = {
            ...parsedUser,
            ...res.data
          };
          
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error('Error loading user:', err);
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
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
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data);
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
      
      console.log('Attempting login with email:', email);
      const res = await axios.post('/users/login', { email, password });
      
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data);
        console.log('Login successful');
      }
      
      return res.data;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
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
      setError(err.response?.data?.message || 'Profile update failed');
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

  return (
    <AuthContext.Provider
      value={{
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
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthProvider;