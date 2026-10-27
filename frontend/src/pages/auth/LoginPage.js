import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import TwoFactorVerification from '../../components/auth/TwoFactorVerification';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTwoFactorVerification, setShowTwoFactorVerification] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  
  const navigate = useNavigate();
  const { user, login, cancelTwoFactor, setAuthSession, isAdmin, isVerifier } = useAuth();

  useEffect(() => {
    if (user && !showTwoFactorVerification) {
      const dest = isAdmin() ? '/admin' : isVerifier() ? '/verifier' : '/student';
      navigate(dest, { replace: true });
    }
  }, [user, showTwoFactorVerification, isAdmin, isVerifier, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.requireTwoFactor) {
        setShowTwoFactorVerification(true);
        setTwoFactorUserId(result.userId);
        setTwoFactorEmail(result.email || email);
      } else if (result.success) {
        const dest = result.user?.role === 'admin' ? '/admin' : result.user?.role === 'verifier' ? '/verifier' : '/student';
        navigate(dest, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTwoFactorSuccess = (authData) => {
    setShowTwoFactorVerification(false);
    setTwoFactorUserId(null);

    const authUser = authData?.user || authData?.data?.user;
    const authToken = authData?.token || authData?.data?.token;

    if (authToken && authUser) {
      setAuthSession(authToken, authUser);
    }

    const role = authUser?.role;
    const dest = role === 'admin' ? '/admin' : role === 'verifier' ? '/verifier' : '/student';
    navigate(dest, { replace: true });
  };
  
  const handleTwoFactorCancel = () => {
    setShowTwoFactorVerification(false);
    setTwoFactorUserId(null);
    cancelTwoFactor();
  };

  if (showTwoFactorVerification) {
    return (
      <div className="space-y-8">
        <header className="auth-form-header">
          <span className="status-chip">Biometric fallback active</span>
          <h1 className="auth-form-title">Two-Factor Authentication</h1>
          <p className="auth-form-description">Enter your verification code to continue.</p>
        </header>

        <div className="flex justify-center">
          <TwoFactorVerification 
            userId={twoFactorUserId} 
            onSuccess={handleTwoFactorSuccess} 
            onCancel={handleTwoFactorCancel} 
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-page-stack">
      <header className="auth-form-header text-center mb-3">
        <h1 className="auth-form-title font-display text-white text-xl md:text-2xl font-bold">Welcome back</h1>
        <p className="auth-form-description text-slate-400 text-xs mt-1">
          Sign in to issue, verify, and manage blockchain credentials.
        </p>
      </header>

      {error && (
        <div className="auth-alert auth-alert-error bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs py-2 px-3 rounded-lg mb-2" role="alert">
          <span className="block">{error}</span>
        </div>
      )}

      <form className="auth-form-grid space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-sm"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-sm"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-semibold"
          >
            {loading ? (
              <div className="spinner h-4 w-4 border-slate-900 border-t-cyan" />
            ) : (
              <>
                <LockClosedIcon className="h-4 w-4 mr-1.5 text-slate-950" />
                Sign in
              </>
            )}
          </button>
        </div>

        <div className="auth-form-meta text-center pt-1 space-y-1">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan hover:underline font-mono font-medium">
              Sign up here
            </Link>
          </p>
          <p className="text-[11px] text-slate-500">
            Contact your administrator if you need special access.
          </p>
        </div>
      </form>

      {/* 1-click Quick access notice for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Quick Demo Logins</p>
          <div className="flex justify-center gap-2 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => { setEmail('admin@blockd3.com'); setPassword('admin123'); }}
              className="px-2.5 py-1 rounded bg-cyan/10 border border-cyan/40 text-cyan hover:bg-cyan/25 transition cursor-pointer"
              title="admin@blockd3.com"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail('student@blockd3.com'); setPassword('student123'); }}
              className="px-2.5 py-1 rounded bg-amber/10 border border-amber/40 text-amber hover:bg-amber/25 transition cursor-pointer"
              title="student@blockd3.com"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setEmail('verifier@blockd3.com'); setPassword('verifier123'); }}
              className="px-2.5 py-1 rounded bg-violet/15 border border-violet/40 text-violet-300 hover:bg-violet/30 transition cursor-pointer"
              title="verifier@blockd3.com"
            >
              Verifier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
