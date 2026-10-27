import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createApiClient } from '../lib/apiClient';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);

  const setAuthSession = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('token', authToken);
    if (authUser) {
      localStorage.setItem('user', JSON.stringify(authUser));
    }
    setTwoFactorRequired(false);
    setTwoFactorUserId(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const apiClient = createApiClient();
          const response = await apiClient.get('/api/auth/profile');
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
        } catch (error) {
          console.error('Auth initialization error:', error.response?.data || error.message);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const apiClient = createApiClient();
      const response = await apiClient.post('/api/auth/login', { email, password });
      
      if (response.data.requireTwoFactor) {
        setTwoFactorRequired(true);
        setTwoFactorUserId(response.data.userId);
        toast.info('Two-factor authentication code required');
        return { requireTwoFactor: true, userId: response.data.userId, email: response.data.email || email };
      }
      
      const { token, user } = response.data.data;
      
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      
      toast.success('Successfully logged in!');
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to login');
      return { success: false, error: error.response?.data?.error || 'Authentication failed' };
    }
  };
  
  const verifyTwoFactor = async (token, isBackupCode = false) => {
    try {
      if (!twoFactorRequired || !twoFactorUserId) {
        return { success: false, error: 'Two-factor authentication not initiated' };
      }
      
      const apiClient = createApiClient();
      const response = await apiClient.post('/api/2fa/validate', {
        userId: twoFactorUserId,
        email: twoFactorUserId,
        token,
        isBackupCode
      });
      
      if (response.data.success) {
        const authToken = response.data.token;
        setToken(authToken);
        setUser(response.data.user);
        localStorage.setItem('token', authToken);
        
        setTwoFactorRequired(false);
        setTwoFactorUserId(null);
        
        toast.success('Successfully authenticated!');
        return { success: true };
      }
    } catch (error) {
      console.error('2FA verification error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Invalid verification code');
      return { success: false, error: error.response?.data?.message || 'Verification failed' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        const apiClient = createApiClient();
        await apiClient.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.info('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const apiClient = createApiClient();
      const response = await apiClient.patch('/api/auth/profile', profileData);
      setUser(response.data.data);
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update profile');
      return false;
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isStudent = () => user?.role === 'student';
  const isVerifier = () => user?.role === 'verifier';

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    isAdmin,
    isStudent,
    isVerifier,
    twoFactorRequired,
    twoFactorUserId,
    verifyTwoFactor,
    setAuthSession,
    cancelTwoFactor: () => {
      setTwoFactorRequired(false);
      setTwoFactorUserId(null);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
