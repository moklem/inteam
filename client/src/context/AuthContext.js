import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

// API URL with fallback for local development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
          const res = await axios.get(`${API_URL}/users/profile`);
          
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
        axios.defaults.headers.common['Authorization'] = '';
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
      
      const res = await axios.post(`${API_URL}/users/login`, { email, password });
      
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data);
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
    axios.defaults.headers.common['Authorization'] = '';
    setUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`${API_URL}/users/profile`, userData);
      
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