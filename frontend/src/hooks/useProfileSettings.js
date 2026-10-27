import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const useProfileSettings = (userId) => {
  // Use global theme context
  const { theme, textSize, updateTheme: setGlobalTheme, updateTextSize: setGlobalTextSize } = useTheme();

  // Password and Security state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);

  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [certificateVisibility, setCertificateVisibility] = useState('public');
  const [verificationNotifications, setVerificationNotifications] = useState(true);
  const [dataPrivacy, setDataPrivacy] = useState({
    analytics: true,
    marketing: false
  });

  // General settings state
  const [language, setLanguage] = useState('English');
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    certificateVerified: true,
    securityAlerts: true,
    marketingEmails: false
  });
  const [blockchainSettings, setBlockchainSettings] = useState({
    gasPrice: 'medium',
    confirmations: 6
  });

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch user settings on component mount
  useEffect(() => {
    if (userId) {
      fetchUserSettings();
    }
  }, [userId]);

  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch user profile with settings
      const profileResponse = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = profileResponse.data.data;
      
      // Update state with user settings
      if (user.settings) {
        setTwoFactorEnabled(user.settings.twoFactorEnabled || false);
        setProfileVisibility(user.settings.profileVisibility || 'public');
        setCertificateVisibility(user.settings.certificateVisibility || 'public');
        setVerificationNotifications(user.settings.verificationNotifications !== false);
        setDataPrivacy(user.settings.dataPrivacy || { analytics: true, marketing: false });
        setLanguage(user.settings.language || 'English');
        setNotificationSettings(user.settings.notificationSettings || {
          emailNotifications: true,
          certificateVerified: true,
          securityAlerts: true,
          marketingEmails: false
        });
        setBlockchainSettings(user.settings.blockchainSettings || {
          gasPrice: 'medium',
          confirmations: 6
        });
      }
      
      // Fetch login history
      const historyResponse = await axios.get('/api/users/login-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLoginHistory(historyResponse.data.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings. Please try again.');
      setLoading(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      await axios.put('/api/users/change-password', passwordForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  // Two-factor authentication toggle
  const toggleTwoFactor = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/two-factor', 
        { enabled: !twoFactorEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTwoFactorEnabled(response.data.data.settings.twoFactorEnabled);
      setSuccess(`Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'} successfully`);
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update two-factor authentication. Please try again.');
      setLoading(false);
    }
  };

  // Privacy settings handlers
  const updateProfileVisibility = async (value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { settings: { profileVisibility: value } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setProfileVisibility(response.data.data.settings.profileVisibility);
      setSuccess('Profile visibility updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile visibility. Please try again.');
      setLoading(false);
    }
  };

  const updateCertificateVisibility = async (value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { settings: { certificateVisibility: value } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCertificateVisibility(response.data.data.settings.certificateVisibility);
      setSuccess('Certificate visibility updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update certificate visibility. Please try again.');
      setLoading(false);
    }
  };

  const toggleVerificationNotifications = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { settings: { verificationNotifications: !verificationNotifications } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setVerificationNotifications(response.data.data.settings.verificationNotifications);
      setSuccess(`Verification notifications ${!verificationNotifications ? 'enabled' : 'disabled'} successfully`);
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update notification settings. Please try again.');
      setLoading(false);
    }
  };

  const updateDataPrivacy = async (field, value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { 
          settings: { 
            dataPrivacy: {
              ...dataPrivacy,
              [field]: value
            }
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDataPrivacy(response.data.data.settings.dataPrivacy);
      setSuccess('Data privacy settings updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update data privacy settings. Please try again.');
      setLoading(false);
    }
  };

  // Settings handlers
  const updateLanguage = async (value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { settings: { language: value } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLanguage(response.data.data.settings.language);
      setSuccess('Language updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update language. Please try again.');
      setLoading(false);
    }
  };

  const updateTheme = async (value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      await axios.put('/api/users/settings',
        { settings: { theme: value } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update global theme context
      setGlobalTheme(value);
      setSuccess('Theme updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update theme. Please try again.');
      setLoading(false);
    }
  };

  const updateTextSize = async (increment) => {
    try {
      const newSize = textSize + (increment ? 10 : -10);
      if (newSize < 70 || newSize > 150) return;
      
      setLoading(true);
      
      const token = localStorage.getItem('token');
      await axios.put('/api/users/settings',
        { settings: { textSize: newSize } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update global theme context
      setGlobalTextSize(newSize);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update text size. Please try again.');
      setLoading(false);
    }
  };

  const updateNotificationSetting = async (field, value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { 
          settings: { 
            notificationSettings: {
              ...notificationSettings,
              [field]: value
            }
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotificationSettings(response.data.data.settings.notificationSettings);
      setSuccess('Notification settings updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update notification settings. Please try again.');
      setLoading(false);
    }
  };

  const updateBlockchainSetting = async (field, value) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/users/settings',
        { 
          settings: { 
            blockchainSettings: {
              ...blockchainSettings,
              [field]: value
            }
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBlockchainSettings(response.data.data.settings.blockchainSettings);
      setSuccess('Blockchain settings updated successfully');
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update blockchain settings. Please try again.');
      setLoading(false);
    }
  };

  return {
    // State
    passwordForm,
    twoFactorEnabled,
    loginHistory,
    profileVisibility,
    certificateVisibility,
    verificationNotifications,
    dataPrivacy,
    language,
    theme,
    textSize,
    notificationSettings,
    blockchainSettings,
    loading,
    error,
    success,
    
    // Setters
    setPasswordForm,
    
    // Handlers
    handlePasswordChange,
    toggleTwoFactor,
    updateProfileVisibility,
    updateCertificateVisibility,
    toggleVerificationNotifications,
    updateDataPrivacy,
    updateLanguage,
    updateTheme,
    updateTextSize,
    updateNotificationSetting,
    updateBlockchainSetting,
    
    // Clear messages
    clearError: () => setError(null),
    clearSuccess: () => setSuccess(null)
  };
};

export default useProfileSettings;
