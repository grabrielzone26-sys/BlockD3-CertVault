import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import proofImg from '../../assets/images/Gemini_Generated_Image_pctjwopctjwopctj.jpg';
import NetworkTelemetryWidget from '../../components/NetworkTelemetryWidget';
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SignalIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, meta, icon: Icon }) => (
  <div className="trust-card p-3 sm:p-5 min-h-[4.75rem] sm:min-h-[7.2rem] flex flex-col justify-between">
    <div className="flex items-start justify-between gap-2">
      <p className="trust-section-kicker truncate text-[10px] sm:text-xs">{title}</p>
      {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400/70 shrink-0" />}
    </div>
    <div>
      <p className="mt-1 sm:mt-3 text-xl sm:text-3xl font-semibold font-display text-[var(--text-primary,#ffffff)] leading-none">{value}</p>
      {meta && <p className="trust-muted mt-1 text-[10px] sm:text-xs truncate">{meta}</p>}
    </div>
  </div>
);

const VerifierDashboard = () => {
  const { isAdmin, isVerifier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [stats, setStats] = useState({
    totalVerifications: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');
        const apiClient = createApiClient();
        const [historyResponse, statsResponse] = await Promise.allSettled([
          apiClient.get('/api/verifier/history'),
          apiClient.get('/api/verifier/stats'),
        ]);

        if (historyResponse.status === 'fulfilled') {
          setVerificationHistory(historyResponse.value.data.data || []);
        } else {
          console.error('Verifier history fetch error:', historyResponse.reason);
        }

        if (statsResponse.status === 'fulfilled') {
          setStats(statsResponse.value.data.data || {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
          });
        } else {
          console.error('Verifier stats fetch error:', statsResponse.reason);
        }

        if (historyResponse.status === 'rejected' && statsResponse.status === 'rejected') {
          throw historyResponse.reason;
        }
      } catch (fetchError) {
        console.error('Verifier data fetch error:', fetchError);
        setError(fetchError.response?.data?.error || 'Failed to load verifier dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin, isVerifier]);

  const renderBadge = (status) => {
    if (status === 'success') {
      return <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Valid</span>;
    }
    if (status === 'failed') {
      return <span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-300">Invalid</span>;
    }
    return <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">Batch</span>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="trust-dashboard"><div className="trust-card text-sm text-rose-200">{error}</div></div>;
  }

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero relative overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] items-center">
          <div>
            <span className="status-chip status-chip-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              Verification control plane
            </span>
            <h1 className="trust-title mt-4 text-4xl font-semibold md:text-5xl">Scan. Verify. Report.</h1>
            <p className="trust-muted mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Validate credentials from QR codes, certificate IDs, or batch files with an immutable blockchain audit trail.
            </p>
          </div>
          <div className="hidden lg:block relative">
            <div className="w-full h-36 rounded-xl overflow-hidden border border-cyan/35 shadow-[0_0_24px_rgba(0,229,255,0.2)] relative">
              <img src={proofImg} alt="Cryptographic Proof Verification" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan bg-slate-950/85 px-2.5 py-0.5 rounded border border-cyan/40 backdrop-blur-sm">
                  Cryptographic Proof
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  ● Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard title="Total verifications" value={stats.totalVerifications} meta="all checks" icon={DocumentMagnifyingGlassIcon} />
          <StatCard title="Successful" value={stats.successfulVerifications} meta="ledger match" icon={CheckCircleIcon} />
          <StatCard title="Failed" value={stats.failedVerifications} meta="review required" icon={XCircleIcon} />
        </div>
      </section>

      <section>
        <NetworkTelemetryWidget />
      </section>

      <section>
        <p className="trust-section-kicker">Execution lane</p>
        <h2 className="trust-title mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold">Quick actions</h2>
        <div className="mt-3 sm:mt-6 grid grid-cols-3 gap-1.5 sm:gap-4">
          <Link to="/verify-certificate" className="trust-card trust-card-glow block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <DocumentMagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Manual Verify</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Check one certificate and compare its document hash.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Open ↗</p>
          </Link>
          <Link to="/verify-certificate/scan" className="trust-card block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">QR Scanner</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Use camera or upload a QR screenshot.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Scan ↗</p>
          </Link>
          <Link to="/batch-verify" className="trust-card block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Batch Verify</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Queue IDs or QR screenshots for bulk validation.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Batch ↗</p>
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.42fr_1fr]">
        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Summary</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Verification status</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-500/10 pb-3">
              <span className="text-sm text-slate-300">Total processed</span>
              <span className="font-mono text-sm font-bold text-white">{stats.totalVerifications}</span>
            </div>
            <div className="flex items-center justify-between border-b border-sky-500/10 pb-3">
              <span className="text-sm text-slate-300">Successful</span>
              <span className="font-mono text-sm font-bold text-emerald-300">{stats.successfulVerifications}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Failed / Flagged</span>
              <span className="font-mono text-sm font-bold text-rose-300">{stats.failedVerifications}</span>
            </div>
          </div>
        </div>

        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Ledger audit trail</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Recent activity</h2>
          </div>
          {verificationHistory.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><ClockIcon /></span>
              <h3 className="trust-empty-title">No verification events</h3>
              <p className="trust-empty-copy">Individual and batch verification operations will log audit telemetry here.</p>
            </div>
          ) : verificationHistory.slice(0, 5).map((verification) => (
            <div key={verification.id} className="trust-row">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{verification.certificateId || 'Batch session'}</p>
                  {renderBadge(verification.status)}
                </div>
                <p className="trust-muted mt-1 text-sm truncate">{verification.studentName || verification.notes || 'Ledger check completed'}</p>
                <div className="mt-2 flex items-center gap-3 text-xs font-mono text-sky-300">
                  <span>{new Date(verification.createdAt || verification.timestamp).toLocaleString()}</span>
                  {verification.hashMatched && <span className="text-emerald-300">● hash valid</span>}
                </div>
              </div>
              {verification.certificateId && (
                <Link to={`/certificates/${verification.certificateId}`} className="btn-secondary px-4 py-2">Open record</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="trust-section-kicker">Infrastructure</p>
        <h2 className="trust-title mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold">Verification signal</h2>
        <div className="mt-3 sm:mt-6 grid grid-cols-3 gap-1.5 sm:gap-4">
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.5rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <SignalIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              <span className="text-[9px] sm:text-xs font-mono font-bold text-emerald-300">● ok</span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className="font-semibold text-white text-xs sm:text-base leading-tight truncate">Fabric lookup</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">private ledger</p>
            </div>
          </div>
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.5rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              <span className="text-[9px] sm:text-xs font-mono font-bold text-emerald-300">● ok</span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className="font-semibold text-white text-xs sm:text-base leading-tight truncate">ICP anchor</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">public hash</p>
            </div>
          </div>
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.5rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber shrink-0" />
              <span className="text-[9px] sm:text-xs font-mono font-bold text-amber-300">● 42ms</span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className="font-semibold text-white text-xs sm:text-base leading-tight truncate">QR resolution</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">operational</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerifierDashboard;
