import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../services/baseURL';

const AuthContext = createContext({
  admin: null,
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => { },
  isAuthenticated: false,
  userType: 'admin'
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || null;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return null;
    }
  });

  const API_URL = baseURL

  // Check if admin is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    let savedToken, savedUserType;
    try {
      savedToken = localStorage.getItem('token');
      savedUserType = localStorage.getItem('userType');
    } catch (error) {
      console.warn('localStorage access failed:', error);
      setLoading(false);
      return;
    }

    if (savedToken) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`
          },
          withCredentials: true
        });
        // Handle both admin and seller responses
        const userProfile = response.data.admin || response.data.user;
        setAdmin(userProfile);
        setToken(savedToken);
      } catch (error) {
        console.error('Auth check failed:', error);
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('userType');
        } catch (storageError) {
          console.warn('localStorage cleanup failed:', storageError);
        }
        setToken(null);
        setAdmin(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      // Handle both admin and seller login responses
      const { token: newToken, admin: adminData, user: userData, userType } = response.data;

      // Use admin data if admin login, otherwise use user data (for seller)
      const userProfile = adminData || userData;

      try {
        localStorage.setItem('token', newToken);
        localStorage.setItem('userType', userType || 'admin'); // Store user type
      } catch (storageError) {
        console.warn('localStorage save failed:', storageError);
      }
      setToken(newToken);
      setAdmin(userProfile); // Store user profile (admin or seller)

      return { success: true, userType };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (username, email, password, inviteCode) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        { username, email, password, inviteCode },
        { withCredentials: true }
      );

      const { token: newToken, admin: adminData } = response.data;

      try {
        localStorage.setItem('token', newToken);
      } catch (storageError) {
        console.warn('localStorage save failed:', storageError);
      }
      setToken(newToken);
      setAdmin(adminData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
      } catch (storageError) {
        console.warn('localStorage cleanup failed:', storageError);
      }
      setToken(null);
      setAdmin(null);
    }
  };

  const value = {
    admin,
    user: admin, // Alias for backward compatibility
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!admin,
    userType: (() => {
      try {
        return localStorage.getItem('userType') || 'admin';
      } catch (error) {
        console.warn('localStorage access failed for userType:', error);
        return 'admin';
      }
    })(),
    // Effective role for UI-level access control
    role: (() => {
      try {
        const storedType = localStorage.getItem('userType') || 'admin';
        if (storedType === 'seller') {
          return 'seller';
        }
        // For admin-type users, rely on admin.role when available
        return admin?.role || 'admin';
      } catch (error) {
        console.warn('localStorage access failed for role:', error);
        return 'admin';
      }
    })()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthProvider };
