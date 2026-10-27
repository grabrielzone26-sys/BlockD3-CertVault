import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
  DocumentPlusIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import AccountMenu from '../../components/AccountMenu';
import NotificationBell from '../notifications/NotificationBell';
import logoMark from '../../assets/images/logo.png';

const MainLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout, isAdmin, isStudent, isVerifier } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const roleConfig = isAdmin()
    ? {
        label: 'Admin workspace',
        chipClass: 'border-amber/40 bg-amber/10 text-amber shadow-[0_0_10px_rgba(255,138,43,0.15)]',
        Icon: ShieldCheckIcon,
        dotColor: 'bg-amber',
      }
    : isVerifier()
      ? {
          label: 'Verifier workspace',
          chipClass: 'border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
          Icon: FingerPrintIcon,
          dotColor: 'bg-violet-400',
        }
      : {
          label: 'Student workspace',
          chipClass: 'border-cyan/40 bg-cyan/10 text-cyan shadow-[0_0_10px_rgba(0,229,255,0.15)]',
          Icon: AcademicCapIcon,
          dotColor: 'bg-cyan',
        };

  const navigation = [
    ...(isAdmin() ? [
      { name: 'Admin', href: '/admin', icon: ChartBarIcon },
      { name: 'Certificates', href: '/certificates', icon: DocumentCheckIcon },
      { name: 'Issue', href: '/issue-certificate', icon: DocumentPlusIcon },
      { name: 'Batch Issue', href: '/batch-certificates', icon: DocumentDuplicateIcon },
      { name: 'Batch Verify', href: '/batch-verify', icon: ClipboardDocumentCheckIcon },
      { name: 'Activity', href: '/verification-activity', icon: ShieldCheckIcon },
      { name: 'Downloads', href: '/batch-download', icon: ArrowDownTrayIcon },
    ] : []),
    ...(isStudent() ? [
      { name: 'Student', href: '/student', icon: AcademicCapIcon },
      { name: 'Submit', href: '/submit-certificate', icon: DocumentPlusIcon },
      { name: 'Certificates', href: '/certificates', icon: DocumentCheckIcon },
    ] : []),
    ...(isVerifier() ? [
      { name: 'Verifier', href: '/verifier', icon: ChartBarIcon },
      { name: 'Verify', href: '/verify-certificate', icon: ClipboardDocumentCheckIcon },
      { name: 'Activity', href: '/verification-activity', icon: DocumentCheckIcon },
    ] : []),
  ];

  // Primary thumb tabs for mobile bottom dock
  const mobileDockTabs = [
    ...(isAdmin() ? [
      { name: 'Overview', href: '/admin', icon: ChartBarIcon },
      { name: 'Issue', href: '/issue-certificate', icon: DocumentPlusIcon },
      { name: 'Batch', href: '/batch-certificates', icon: DocumentDuplicateIcon },
      { name: 'Logs', href: '/verification-activity', icon: DocumentCheckIcon },
    ] : []),
    ...(isStudent() ? [
      { name: 'Home', href: '/student', icon: AcademicCapIcon },
      { name: 'Certs', href: '/certificates', icon: DocumentCheckIcon },
      { name: 'Submit', href: '/submit-certificate', icon: DocumentPlusIcon },
      { name: 'Verify', href: '/verify', icon: MagnifyingGlassIcon },
    ] : []),
    ...(isVerifier() ? [
      { name: 'Overview', href: '/verifier', icon: ChartBarIcon },
      { name: 'Verify', href: '/verify-certificate', icon: ClipboardDocumentCheckIcon },
      { name: 'Logs', href: '/verification-activity', icon: DocumentCheckIcon },
      { name: 'Portal', href: '/verify', icon: MagnifyingGlassIcon },
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href) => location.pathname === href || (href !== '/' && location.pathname.startsWith(`${href}/`));

  return (
    <div className="app-shell app-dashboard-shell trust-workspace min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="trust-topbar sticky top-0 z-40 border-b border-cyan/20 bg-slate-950/85 backdrop-blur-2xl relative">
        {/* Top glowing theme accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none" style={{ background: 'var(--topbar-line)' }} />

        {/* Brand Lockup */}
        <Link to="/" className="trust-brand flex items-center gap-2 sm:gap-2.5 shrink-0 group" aria-label="BlockD3 home">
          <img
            src={logoMark}
            alt="BlockD3 Mark"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_12px_rgba(0,229,255,0.5)] transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display font-bold text-white tracking-wider text-sm sm:text-base leading-tight group-hover:text-cyan transition-colors">
              BlockD3 <span className="text-cyan">Vault</span>
            </span>
            <span className="hidden xl:flex text-[9px] font-mono tracking-widest text-slate-400 uppercase items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Fabric · ICP · CertVault
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="trust-nav hidden lg:flex items-center justify-center gap-1 p-1 rounded-full bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-inner" aria-label="Workspace navigation">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`trust-nav-link font-mono text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan/15 text-cyan border border-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${active ? 'text-cyan' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Topbar Actions */}
        <div className="trust-topbar-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Public Verify Quick Portal Link */}
          <Link
            to="/verify"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-cyan border border-cyan/30 bg-cyan/10 hover:bg-cyan/20 hover:border-cyan/50 transition-all duration-200 shadow-[0_0_10px_rgba(0,229,255,0.12)]"
            title="Open Public Certificate Verification Portal"
          >
            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            <span>Verify Portal</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3 text-cyan/70" />
          </Link>

          {/* Role Status Chip */}
          <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${roleConfig.chipClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dotColor} animate-pulse`} />
            <roleConfig.Icon className="h-3 w-3" />
            <span className="hidden xl:inline">{roleConfig.label}</span>
            <span className="inline xl:hidden">{isAdmin() ? 'Admin' : isVerifier() ? 'Verifier' : 'Student'}</span>
          </span>

          {/* Notifications Center */}
          {user && <NotificationBell />}

          {/* User Account Menu */}
          <AccountMenu user={user} onLogout={handleLogout} />

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className={`trust-menu-button lg:hidden p-2 rounded-lg border transition-all duration-200 ${
              mobileNavOpen
                ? 'border-cyan/60 bg-cyan/15 text-cyan'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white'
            }`}
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <XMarkIcon className="h-5 w-5 text-cyan" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileNavOpen && (
        <>
          <div
            className="mobile-drawer-overlay lg:hidden animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="mobile-drawer-panel lg:hidden p-4 space-y-3 animate-fade-in"
            aria-label="Mobile workspace navigation"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${roleConfig.chipClass}`}>
                <roleConfig.Icon className="h-3 w-3" />
                <span>{roleConfig.label}</span>
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/verify"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan bg-cyan/10 px-2.5 py-1 rounded-full border border-cyan/30 hover:underline"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                  <span>Portal</span>
                </Link>
              </div>
            </div>

            {/* Navigation items */}
            <div className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition ${
                      active
                        ? 'bg-cyan/15 text-cyan border border-cyan/40 font-semibold shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                    }`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyan' : 'text-slate-400'}`} aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Secondary user links for mobile convenience */}
            <div className="border-t border-slate-800/80 pt-3 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 px-3 pb-1">
                Account &amp; Security
              </p>
              <Link
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-900 hover:text-white transition"
                onClick={() => setMobileNavOpen(false)}
              >
                <UserCircleIcon className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Profile &amp; Settings</span>
              </Link>
              <Link
                to="/profile/two-factor"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-900 hover:text-white transition"
                onClick={() => setMobileNavOpen(false)}
              >
                <ShieldCheckIcon className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Two-Factor Security</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition text-left"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4 text-rose-400 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Page Content: with responsive bottom padding to prevent mobile dock overlap */}
      <main className="page-flow main-content-shell flex-1 pb-24 lg:pb-8">
        <div className="main-content-inner">
          <div className="main-content-frame">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Quick-Action Dock (App Bar for Smartphones) */}
      <nav className="mobile-bottom-dock lg:hidden" aria-label="Mobile quick actions">
        {mobileDockTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={`mobile-dock-btn ${active ? 'active' : ''}`}
            >
              <tab.icon className={`h-5 w-5 shrink-0 ${active ? 'text-cyan' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
        {/* Toggle drawer button */}
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className={`mobile-dock-btn ${mobileNavOpen ? 'active' : ''}`}
          aria-label="More navigation options"
        >
          {mobileNavOpen ? (
            <XMarkIcon className="h-5 w-5 text-cyan shrink-0" />
          ) : (
            <Bars3Icon className="h-5 w-5 text-slate-400 shrink-0" />
          )}
          <span>{mobileNavOpen ? 'Close' : 'More'}</span>
        </button>
      </nav>
    </div>
  );
};

export default MainLayout;

