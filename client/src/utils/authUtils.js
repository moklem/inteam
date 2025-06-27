// client/src/utils/authUtils.js
import axios from 'axios';
import { useEffect } from 'react';

/**
 * Ensures the axios authorization header is properly set
 * Call this at the beginning of any component that makes API calls
 */
export const ensureAuthHeader = () => {
  try {
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    
    if (userData?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error setting auth header:', error);
    return false;
  }
};

import { useEffect } from 'react';

/**
 * Custom hook to ensure authentication is set up
 */
export const useAuthSetup = () => {
  useEffect(() => {
    ensureAuthHeader();
  }, []);
};

/**
 * Get the current auth token
 */
export const getAuthToken = () => {
  try {
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    return userData?.token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};