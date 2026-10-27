import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createPublicApiClient } from '../../lib/apiClient';

const TwoFactorVerification = ({ userId, email, onSuccess, onCancel }) => {
  const [token, setToken] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (!cleanToken) {
      toast.error('Please enter a verification code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const publicClient = createPublicApiClient();
      const response = await publicClient.post('/api/2fa/validate', {
        userId: userId && !userId.includes('@') ? userId : undefined,
        email: email || (typeof userId === 'string' && userId.includes('@') ? userId : undefined),
        token: cleanToken,
        isBackupCode
      });
      
      if (response.data.success) {
        const authToken = response.data.token || response.data.data?.token;
        const authUser = response.data.user || response.data.data?.user;

        // Store authentication token in localStorage
        if (authToken) localStorage.setItem('token', authToken);
        if (authUser) localStorage.setItem('user', JSON.stringify(authUser));
        
        toast.success('Authentication successful');
        
        // Call the success callback
        if (onSuccess) {
          onSuccess(response.data);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('2FA Verification Error:', error);
      toast.error(error.response?.data?.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleCodeType = () => {
    setIsBackupCode(!isBackupCode);
    setToken('');
  };

  return (
    <div className="tech-card p-8 w-full max-w-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">Two-Factor Authentication</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label 
            htmlFor="token" 
            className="form-label mb-2"
          >
            {isBackupCode ? 'Backup Code' : 'Authentication Code'}
          </label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="input-field"
            placeholder={isBackupCode ? "Enter your backup code" : "Enter 6-digit code"}
            autoComplete="off"
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={toggleCodeType}
            className="text-sm text-blue-600 hover:underline"
          >
            {isBackupCode ? 'Use authentication code instead' : 'Use backup code instead'}
          </button>
        </div>

        <div className="flex justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary w-full"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TwoFactorVerification;
