import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../config/api';

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'student',
    password: '',
    confirmPassword: '',
    profile: {
      fullName: '',
      organization: '',
      organizationType: '',
      reason: '',
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fullName') {
      setFormData(prev => ({
        ...prev,
        fullName: value,
        profile: {
          ...prev.profile,
          fullName: value
        }
      }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // For verifiers, validate required fields
    if (formData.role === 'verifier') {
      if (!formData.profile.organization || 
          !formData.profile.organizationType || 
          !formData.profile.reason) {
        setError('All organization profile fields are required for verifier registration');
        return;
      }
    }

    setLoading(true);
    try {
      const apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const cleanName = formData.fullName.trim();
      const generatedUsername = cleanName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

      const userData = {
        username: generatedUsername || formData.email.split('@')[0],
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        profile: {
          ...formData.profile,
          fullName: cleanName
        }
      };

      await apiClient.post('/api/auth/signup', userData);
      
      if (formData.role === 'verifier') {
        toast.success('Account created successfully! Please wait for admin approval.');
      } else {
        toast.success('Account created successfully! You can now log in.');
      }

      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Registration failed. Please try again later.';
      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = err.response.data?.error || err.response.data?.errors?.[0]?.msg || 'Invalid registration information';
        } else if (err.response.status === 409) {
          errorMessage = 'Email address is already registered. Please use a different email or try logging in.';
        } else if (err.response.status === 422) {
          errorMessage = 'Please check your information and try again.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.error || err.response.data?.message || 'Registration failed';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your network connection.';
      } else {
        errorMessage = err.message || 'An error occurred during registration';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-stack">
      <header className="auth-form-header text-center mb-3">
        <h1 className="auth-form-title font-display text-white text-xl md:text-2xl font-bold">Create account</h1>
        <p className="auth-form-description text-slate-400 text-xs mt-1">
          Register to issue, verify, and manage blockchain credentials.
        </p>
      </header>

      {error && (
        <div className="auth-alert auth-alert-error bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs py-2 px-3 rounded-lg mb-2" role="alert">
          <span className="block">{error}</span>
        </div>
      )}

      <form className="auth-form-grid space-y-3" onSubmit={handleSubmit}>
        {/* 1. Full Name (At the very top in proper order) */}
        <div>
          <label htmlFor="fullName" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Full Name
          </label>
          <div className="mt-1">
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="input-field text-sm"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        {/* 2. Email Address */}
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
              value={formData.email}
              onChange={handleChange}
              className="input-field text-sm"
              placeholder="Enter your email"
            />
          </div>
        </div>

        {/* 3. Account Role */}
        <div>
          <label htmlFor="role" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Account Role
          </label>
          <div className="mt-1">
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field text-sm bg-slate-900/90 text-slate-200"
            >
              <option value="student">Student / Credential Holder</option>
              <option value="verifier">Verifier (Institution / Employer)</option>
            </select>
          </div>
        </div>

        {/* 4. Password */}
        <div>
          <label htmlFor="password" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="input-field text-sm"
              placeholder="Create a password (min 6 characters)"
            />
          </div>
        </div>

        {/* 5. Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
            Confirm Password
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field text-sm"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        {/* Verifier-specific organizational fields */}
        {formData.role === 'verifier' && (
          <div className="space-y-3 border-t border-cyan/20 pt-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan">
                Verifier Organization Details
              </h3>
            </div>
            
            <div>
              <label htmlFor="profile.organization" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
                Organization Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="profile.organization"
                  id="profile.organization"
                  required={formData.role === 'verifier'}
                  value={formData.profile.organization}
                  onChange={handleChange}
                  className="input-field text-sm"
                  placeholder="e.g. University, Ministry, Employer"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile.organizationType" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
                Organization Type
              </label>
              <div className="mt-1">
                <select
                  name="profile.organizationType"
                  id="profile.organizationType"
                  required={formData.role === 'verifier'}
                  value={formData.profile.organizationType}
                  onChange={handleChange}
                  className="input-field text-sm bg-slate-900/90 text-slate-200"
                >
                  <option value="">Select organization type</option>
                  <option value="government">Government Agency</option>
                  <option value="university">University / College</option>
                  <option value="company">Company / Employer</option>
                  <option value="professional">Professional Body</option>
                  <option value="embassy">Embassy / International Organization</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="profile.reason" className="form-label font-mono text-[11px] uppercase tracking-wider text-slate-300">
                Reason for Verification Access
              </label>
              <div className="mt-1">
                <textarea
                  name="profile.reason"
                  id="profile.reason"
                  required={formData.role === 'verifier'}
                  value={formData.profile.reason}
                  onChange={handleChange}
                  rows={2}
                  className="input-field text-sm"
                  placeholder="Explain why your organization needs verification access"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="spinner h-4 w-4 border-slate-900 border-t-cyan" />
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </>
            )}
          </button>
        </div>

        {/* Meta links */}
        <div className="auth-form-meta text-center pt-1 space-y-1">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan hover:underline font-mono font-medium">
              Sign in here
            </Link>
          </p>
          <p className="text-[11px] text-slate-500">
            All identity credentials are cryptographically secured on ledger.
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignUpPage;
