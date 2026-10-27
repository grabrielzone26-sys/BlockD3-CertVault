import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOnRectangleIcon,
  ChevronRightIcon,
  FingerPrintIcon,
  LifebuoyIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const roleConfig = {
  admin: {
    label: 'Admin workspace',
    dashboardHref: '/admin',
    Icon: ShieldCheckIcon,
    accentColor: 'text-amber',
    borderColor: 'border-amber/40',
  },
  verifier: {
    label: 'Verifier workspace',
    dashboardHref: '/verifier',
    Icon: FingerPrintIcon,
    accentColor: 'text-violet-400',
    borderColor: 'border-violet-500/40',
  },
  student: {
    label: 'Student workspace',
    dashboardHref: '/student',
    Icon: UserCircleIcon,
    accentColor: 'text-cyan',
    borderColor: 'border-cyan/40',
  },
};

const AccountMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { activeThemeMeta } = useTheme();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    navigate('/login');
  };

  const role = user?.role || 'student';
  const config = roleConfig[role] || roleConfig.student;
  const WorkspaceIcon = config.Icon;
  const initials = (user?.username || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase();

  const primaryActions = [
    { label: 'Workspace overview', href: config.dashboardHref, icon: WorkspaceIcon, meta: config.label },
    { label: 'Profile settings', href: '/profile', icon: UserCircleIcon, meta: 'Identity and account details' },
    { label: 'Security & 2FA', href: '/profile/two-factor', icon: ShieldCheckIcon, meta: 'Two-factor authentication' },
    { label: 'Public Registry', href: '/verify', icon: FingerPrintIcon, meta: 'Lookup & verify on ledger' },
  ];

  const secondaryActions = [
    {
      label: 'Appearance & Themes',
      href: '/profile',
      icon: PaintBrushIcon,
      meta: `Active: ${activeThemeMeta?.name || 'Cyber Web3'}`,
    },
    { label: 'Help and support', href: '/profile', icon: LifebuoyIcon, meta: 'Account support options' },
  ];

  return (
    <Menu as="div" className="relative inline-block text-left z-50">
      <Menu.Button className="trust-account-button flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 hover:border-cyan/50 transition-all duration-200 shadow-[0_0_10px_rgba(0,0,0,0.4)] group cursor-pointer">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan to-violet-600 p-[1.5px] shadow-[0_0_8px_rgba(0,229,255,0.3)] flex-shrink-0">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-cyan font-bold uppercase">
            {initials}
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-xs text-slate-200 group-hover:text-white max-w-[110px] truncate">
          {user?.username || user?.email?.split('@')[0]}
        </span>
        <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan transition flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="account-command-menu origin-top-right absolute right-0 mt-3 w-[18.5rem] max-w-[calc(100vw-1.5rem)] focus:outline-none z-[60] bg-slate-950/95 border border-cyan/25 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(0,229,255,0.12)] backdrop-blur-2xl overflow-hidden">
          <div className="account-command-header border-b border-slate-800/80 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan to-violet-600 p-[1.5px] shadow-[0_0_12px_rgba(0,229,255,0.3)] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xs text-cyan font-bold uppercase">
                {initials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm truncate">{user?.username || user?.email || 'User'}</p>
              <p className={`text-[11px] font-mono tracking-wider uppercase ${config.accentColor}`}>{config.label}</p>
            </div>
            <WorkspaceIcon className={`h-5 w-5 ${config.accentColor} flex-shrink-0`} />
          </div>

          <div className="account-command-section p-1.5 space-y-0.5">
            {primaryActions.map((item) => (
              <Menu.Item key={item.label}>
                {({ active }) => (
                  <Link
                    to={item.href}
                    className={classNames(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition duration-150',
                      active ? 'bg-cyan/15 text-cyan border border-cyan/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                    )}
                  >
                    <item.icon className="h-4 w-4 text-cyan flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium block text-white">{item.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">{item.meta}</span>
                    </span>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                )}
              </Menu.Item>
            ))}
          </div>

          <div className="account-command-section border-t border-slate-800/80 p-1.5 space-y-0.5">
            {secondaryActions.map((item) => (
              <Menu.Item key={item.label}>
                {({ active }) => (
                  <Link
                    to={item.href}
                    className={classNames(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition duration-150',
                      active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <item.icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">{item.meta}</span>
                    </span>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" />
                  </Link>
                )}
              </Menu.Item>
            ))}
          </div>

          <div className="account-command-footer border-t border-slate-800/80 p-1.5">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={classNames(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-300 transition duration-150 cursor-pointer',
                    active ? 'bg-rose-950/50 border border-rose-500/40 text-rose-200' : 'hover:bg-rose-950/30'
                  )}
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="font-medium block">Sign out</span>
                    <span className="text-[10px] text-rose-400/70 font-mono block">End this BlockD3 session</span>
                  </span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default AccountMenu;
