import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createApiClient } from '../../lib/apiClient';

const TwoFactorSetup = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState('init'); // init, setup, verify
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Initialize 2FA setup
  useEffect(() => {
    let isMounted = true;

    const initSetup = async () => {
      try {
        setIsLoading(true);
        const apiClient = createApiClient();
        const response = await apiClient.post('/api/2fa/setup');
        
        if (isMounted && response.data.success) {
          setQrCode(response.data.data.qrCode);
          setSecret(response.data.data.secret);
          setBackupCodes(response.data.data.backupCodes);
          setStep('setup');
        }
      } catch (error) {
        if (isMounted) {
          console.error('2FA Setup Error:', error);
          toast.error('Failed to initialize two-factor authentication.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initSetup();

    return () => {
      isMounted = false;
    };
  }, []);
  
  // Handle verification code submission
  const handleVerify = async (e) => {
    e.preventDefault();
    
    const cleanCode = verificationCode.trim().replace(/\s+/g, '');
    if (!cleanCode) {
      toast.error('Please enter verification code');
      return;
    }
    
    try {
      setIsLoading(true);
      const apiClient = createApiClient();
      const response = await apiClient.post('/api/2fa/verify', {
        token: cleanCode
      });
      
      if (response.data.success) {
        toast.success('Two-factor authentication enabled successfully');
        setStep('complete');
        
        // Call the completion callback
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('2FA Verification Error:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle download of backup codes as text file
  const handleDownloadBackupCodes = () => {
    const content = "BLOCKD3 CERTVAULT - TWO-FACTOR AUTHENTICATION BACKUP CODES\n\n" + 
      "Store these backup codes securely. Each code can be used once if you lose access to your authenticator app.\n\n" +
      backupCodes.join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blockd3_backup_codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (isLoading && step === 'init') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="tech-card p-4 sm:p-8 w-full max-w-md">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Set Up Two-Factor Authentication</h2>
      
      {step === 'setup' && (
        <div>
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Step 1: Scan QR Code</h3>
            <p className="text-slate-300 text-sm mb-4">
              Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
            </p>
            <div className="flex justify-center mb-4">
              {qrCode && <img src={qrCode} alt="QR Code" className="border border-slate-700 rounded-lg p-2 bg-white max-w-[200px]" />}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Can't scan? Enter this code manually:{' '}
              <span className="font-mono bg-slate-900 text-cyan border border-cyan/30 px-2 py-1 rounded text-xs break-all inline-block mt-1">
                {secret}
              </span>
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Step 2: Save Backup Codes</h3>
            <p className="text-slate-300 text-sm mb-4">
              These backup codes can each be used once in case you lose access to your authenticator app.
              Save them somewhere secure.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono bg-slate-900 border border-slate-700 text-slate-200 p-2 text-center rounded text-xs break-all">
                  {code}
                </div>
              ))}
            </div>
            <button
              onClick={handleDownloadBackupCodes}
              className="btn-secondary w-full"
            >
              Download Backup Codes
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Step 3: Verify Setup</h3>
            <p className="text-gray-600 mb-4">
              Enter the verification code from your authenticator app to complete setup.
            </p>
            <form onSubmit={handleVerify}>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="input-field mb-4"
                placeholder="Enter 6-digit code"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {step === 'complete' && (
        <div>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-center mb-2">Setup Complete!</h3>
          <p className="text-gray-600 text-center mb-6">
            Two-factor authentication has been successfully enabled for your account.
          </p>
          <button
            onClick={onComplete}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
