import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import TwoFactorSetup from '../../components/auth/TwoFactorSetup';
import { createApiClient } from '../../lib/apiClient';

const TwoFactorSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  // Fetch 2FA status on component mount
  useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const apiClient = createApiClient();
        const response = await apiClient.get('/api/2fa/status');
        
        if (response.data.success) {
          setTwoFactorEnabled(response.data.twoFactorEnabled);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Error fetching 2FA status:', error);
          toast.error('Failed to load two-factor authentication status.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTwoFactorStatus();
  }, []);

  // Handle enabling 2FA
  const handleEnable2FA = () => {
    setShowSetup(true);
  };

  // Handle successful 2FA setup
  const handleSetupComplete = () => {
    setShowSetup(false);
    setTwoFactorEnabled(true);
    toast.success('Two-factor authentication enabled successfully!');
  };

  // Handle disabling 2FA
  const handleDisable2FA = async (e) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Password is required');
      return;
    }
    
    if (!token) {
      toast.error('Verification code is required');
      return;
    }
    
    try {
      setIsDisabling(true);
      const apiClient = createApiClient();
      const response = await apiClient.post('/api/2fa/disable', {
        password,
        token
      });
      
      if (response.data.success) {
        setTwoFactorEnabled(false);
        setPassword('');
        setToken('');
        toast.success('Two-factor authentication has been disabled');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error(error.response?.data?.message || 'Failed to disable two-factor authentication');
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="tech-card p-6">
      <h2 className="text-2xl font-semibold mb-6">Two-Factor Authentication</h2>
      
      {showSetup ? (
        <TwoFactorSetup onComplete={handleSetupComplete} />
      ) : (
        <>
          <div className="mb-6">
            <div className={`flex items-center p-4 rounded-2xl ${twoFactorEnabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className={`p-2 rounded-full ${twoFactorEnabled ? 'bg-green-100 text-green-500' : 'bg-yellow-100 text-yellow-500'}`}>
                {twoFactorEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">
                  {twoFactorEnabled ? 'Two-Factor Authentication is Enabled' : 'Two-Factor Authentication is Disabled'}
                </h3>
                <p className="text-sm text-gray-600">
                  {twoFactorEnabled 
                    ? 'Your account is protected with two-factor authentication.' 
                    : 'Enhance your account security by enabling two-factor authentication.'}
                </p>
              </div>
            </div>
          </div>

          {twoFactorEnabled ? (
            <div>
              <h3 className="text-lg font-medium mb-4">Disable Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                To disable two-factor authentication, you need to verify your identity by entering your password and a verification code.
              </p>
              <form onSubmit={handleDisable2FA}>
                <div className="mb-4">
                  <label htmlFor="password" className="form-label mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="token" className="form-label mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="input-field"
                    placeholder="Enter verification code or backup code"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-secondary w-full"
                  disabled={isDisabling}
                >
                  {isDisabling ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Two-factor authentication adds an extra layer of security to your account. When enabled, you'll need to enter a verification code along with your password during login.
              </p>
              <button
                onClick={handleEnable2FA}
                className="btn-primary w-full"
              >
                Enable Two-Factor Authentication
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TwoFactorSettings;
