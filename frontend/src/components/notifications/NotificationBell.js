import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { createApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const READ_STORAGE_KEY = 'blockd3_notifications_read_v1';

export default function NotificationBell() {
  const { user, isStudent, isAdmin, isVerifier } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const menuRef = useRef(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const apiClient = createApiClient();

      if (isStudent()) {
        const res = await apiClient.get('/api/submissions/mine/overview');
        if (res.data?.success && res.data?.data?.notifications) {
          setNotifications(res.data.data.notifications);
        }
      } else if (isAdmin()) {
        // Fetch both pending submissions and pending verifiers
        const [pendingSubsRes, pendingVerifiersRes] = await Promise.allSettled([
          apiClient.get('/api/submissions/pending'),
          apiClient.get('/api/admin/pending-verifiers'),
        ]);

        const adminAlerts = [];

        if (pendingSubsRes.status === 'fulfilled' && pendingSubsRes.value.data?.success) {
          const subs = pendingSubsRes.value.data.data || [];
          subs.slice(0, 5).forEach((sub) => {
            adminAlerts.push({
              id: sub._id,
              kind: 'info',
              title: 'Submission awaiting review',
              message: `${sub.studentDetails?.fullName || 'Student'} submitted ${sub.courseName || 'certificate'} for blockchain issuance.`,
              createdAt: sub.createdAt,
              link: '/admin',
              status: sub.status,
            });
          });
        }

        if (pendingVerifiersRes.status === 'fulfilled' && pendingVerifiersRes.value.data?.success) {
          const verifiers = pendingVerifiersRes.value.data.data || [];
          verifiers.slice(0, 3).forEach((v) => {
            adminAlerts.push({
              id: v._id,
              kind: 'warning',
              title: 'Verifier registration pending',
              message: `${v.profile?.organizationName || v.email} requested verifier access.`,
              createdAt: v.createdAt,
              link: '/admin',
              status: 'pending_verifier',
            });
          });
        }

        setNotifications(adminAlerts);
      } else if (isVerifier()) {
        // For verifiers, provide a helpful quick status alert
        setNotifications([
          {
            id: 'verifier-ready',
            kind: 'success',
            title: 'Verification Engine Active',
            message: 'Connected to Hyperledger Fabric & ICP Canister. Ready to verify credentials.',
            createdAt: new Date().toISOString(),
            link: '/verify-certificate',
            status: 'active',
          },
        ]);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isStudent, isAdmin, isVerifier]);

  // Periodic polling every 45s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !readIds.includes(String(n.id))).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => String(n.id));
    const merged = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(merged);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = (id) => {
    const stringId = String(id);
    if (!readIds.includes(stringId)) {
      const updated = [...readIds, stringId];
      setReadIds(updated);
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const renderIcon = (item) => {
    if (item.kind === 'success' || item.status === 'issued') {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircleIcon className="h-4 w-4" />
        </div>
      );
    }
    if (item.kind === 'warning' || item.status === 'rejected') {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <ExclamationTriangleIcon className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <ClockIcon className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          open
            ? 'border-blue-500/60 bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.25)]'
            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700'
        }`}
        aria-label="View notifications"
        aria-expanded={open}
      >
        <BellIcon className="h-5 w-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-slate-100 tracking-wide">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fetchNotifications}
                title="Refresh notifications"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/50"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 p-1.5 space-y-1">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-500 mb-2">
                  <BellIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updates on certificate reviews and verification activity will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.includes(String(item.id));
                const targetLink =
                  item.issuedCertificateId
                    ? `/certificates/${item.issuedCertificateId}`
                    : item.link || (isStudent() ? '/student' : '/admin');

                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                      isRead
                        ? 'bg-slate-900/20 hover:bg-slate-900/50 opacity-80'
                        : 'bg-slate-900/70 hover:bg-slate-900 border border-blue-500/20 shadow-sm'
                    }`}
                  >
                    {/* Status Icon */}
                    {renderIcon(item)}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${isRead ? 'text-slate-300' : 'text-white'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Action Link */}
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          to={targetLink}
                          onClick={() => {
                            markAsRead(item.id);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors group-hover:underline"
                        >
                          <span>{item.issuedCertificateId ? 'Open Certificate' : 'View Details'}</span>
                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </Link>

                        {!isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">BlockD3 Real-Time Sync</span>
            <Link
              to={isStudent() ? '/student' : isAdmin() ? '/admin' : '/verifier'}
              onClick={() => setOpen(false)}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Go to Workspace →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
