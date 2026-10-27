import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import logoMark from '../../assets/images/logo.png';
import circuitImg from '../../assets/images/blockchain-technology.jpg';

const AuthLayout = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isLight = false;

  // Redirect if user is already authenticated
  if (user) {
    return <Navigate to="/" />;
  }

  const maxWidthClass = isLogin ? 'max-w-[420px]' : 'max-w-[480px]';

  return (
    <div className="min-h-screen app-shell auth-shell flex items-center justify-center p-4 relative overflow-y-auto">

      {/* Dedicated blockchain circuit background stage */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-300 ${
        isLight ? 'opacity-10 mix-blend-multiply' : 'opacity-25 mix-blend-screen'
      }`}>
        <img src={circuitImg} alt="Blockchain Network Stage" className="w-full h-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, var(--card-bg, rgba(10, 14, 23, 0.7)) 0%, var(--bg-primary, rgba(6, 10, 18, 0.95)) 100%)',
          }}
        />
      </div>

      <div className={`w-full ${maxWidthClass} relative z-10 animate-fade-in my-6`}>
        <div
          className="glass-panel rounded-2xl p-6 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-2xl"
          style={{
            backgroundColor: 'var(--card-bg, rgba(10, 14, 23, 0.85))',
            borderColor: 'var(--border-color, rgba(0, 229, 255, 0.25))',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          {/* Top glowing theme accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{ background: 'var(--topbar-line, linear-gradient(to right, transparent, var(--accent-1), var(--accent-3)))' }}
          />

          {/* Compact Brand Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="flex items-center gap-2.5 mb-1.5">
              <img
                src={logoMark}
                alt="BlockD3 Mark"
                className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]"
              />
              <span className="font-display font-bold tracking-wider text-xl" style={{ color: 'var(--text-primary, #FFFFFF)' }}>
                BlockD3 <span style={{ color: 'var(--cyan, #00E5FF)' }}>Vault</span>
              </span>
            </div>
            <span
              className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
              style={{
                color: 'var(--cyan, #00E5FF)',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid var(--border-color, rgba(0, 229, 255, 0.3))',
              }}
            >
              Fabric · ICP · CertVault
            </span>
          </div>

          <Outlet />
        </div>

        <div className="text-center mt-3 text-xs text-slate-500 font-mono">
          BlockD3 CertVault · Secure · Transparent · Verifiable
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
