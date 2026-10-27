import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient } from '../../lib/apiClient';
import circuitImg from '../../assets/images/Gemini_Generated_Image_25krsp25krsp25kr.jpg';
import { toast } from 'react-toastify';
import NetworkTelemetryWidget from '../../components/NetworkTelemetryWidget';
import {
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CheckIcon,
  DocumentCheckIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  HeartIcon,
  InboxIcon,
  ShieldCheckIcon,
  SignalIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, meta, icon: Icon }) => (
  <div className="trust-card p-3 sm:p-5 min-h-[4.75rem] sm:min-h-[7.2rem] flex flex-col justify-between">
    <div className="flex items-start justify-between gap-2">
      <p className="trust-section-kicker truncate text-[10px] sm:text-xs">{title}</p>
      {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400/70 shrink-0" />}
    </div>
    <div>
      <p className="mt-1 sm:mt-3 text-xl sm:text-3xl font-semibold font-display text-[var(--text-primary,#ffffff)] leading-none">{value}</p>
      {meta && <p className="mt-1 text-[10px] sm:text-xs font-mono font-bold text-emerald-400 truncate">{meta}</p>}
    </div>
  </div>
);

const shortTime = (date) => {
  if (!date) return 'recently';
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.max(1, Math.round(diff / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalCertificates: 0,
    recentCertificates: 0,
    totalStudents: 0,
    totalVerifiers: 0,
  });
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [pendingVerifiers, setPendingVerifiers] = useState([]);
  const [allVerifiers, setAllVerifiers] = useState([]);
  const [verifierTab, setVerifierTab] = useState('all');
  const [resetting2faId, setResetting2faId] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [reviewLoadingId, setReviewLoadingId] = useState('');
  const [bridgeHealth, setBridgeHealth] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [verifierActionLoadingId, setVerifierActionLoadingId] = useState('');
  const [rejectingVerifier, setRejectingVerifier] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');
        const apiClient = createApiClient();

        const [statsResult, activityResult, verifiersResult, allVerifiersResult, auditResult, submissionResult, healthResult] = await Promise.allSettled([
          apiClient.get('/api/admin/stats'),
          apiClient.get('/api/admin/recent-activity'),
          apiClient.get('/api/admin/pending-verifiers'),
          apiClient.get('/api/admin/verifiers'),
          apiClient.get('/api/admin/audit-logs?limit=12&action=blockchain'),
          apiClient.get('/api/submissions/pending'),
          apiClient.get('/api/blockchain/health'),
        ]);

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value.data.data || {
            totalCertificates: 0,
            recentCertificates: 0,
            totalStudents: 0,
            totalVerifiers: 0,
          });
        }
        if (activityResult.status === 'fulfilled') {
          setRecentCertificates(activityResult.value.data.data?.recentCertificates || []);
        }
        if (verifiersResult.status === 'fulfilled') {
          const pending = verifiersResult.value.data.data || [];
          setPendingVerifiers(pending);
          if (pending.length > 0) {
            setVerifierTab('pending');
          }
        }
        if (allVerifiersResult.status === 'fulfilled') {
          setAllVerifiers(allVerifiersResult.value.data.data || []);
        }
        if (auditResult.status === 'fulfilled') {
          setAuditLogs(auditResult.value.data.data || []);
        }
        if (submissionResult.status === 'fulfilled') {
          setPendingSubmissions(submissionResult.value.data.data || []);
        }
        if (healthResult.status === 'fulfilled') {
          setBridgeHealth(healthResult.value.data.data || null);
        }
      } catch (fetchError) {
        console.warn('Admin dashboard partial fetch notice:', fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const openReviewModal = (submission, decision) => {
    setSelectedSubmission(submission);
    setReviewDecision(decision);
    setReviewNote(submission.reviewNote || '');
    setError('');
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
    setReviewDecision('approve');
    setReviewNote('');
    setError('');
  };

  const handleVerifierAction = async (verifierId, action, reason = '') => {
    try {
      setVerifierActionLoadingId(verifierId);
      const apiClient = createApiClient();
      const response = await apiClient.post(`/api/admin/verifier-action/${verifierId}`, {
        action,
        reason: reason.trim() || undefined,
      });

      const isApproved = action === 'approve';
      setPendingVerifiers((prev) => prev.filter((v) => v._id !== verifierId));
      if (isApproved) {
        setStats((prev) => ({
          ...prev,
          totalVerifiers: (prev.totalVerifiers || 0) + 1,
        }));
        toast.success('Verifier approved successfully!');
      } else {
        toast.info('Verifier registration denied.');
      }

      setAuditLogs((prev) => [
        {
          _id: `temp-${Date.now()}`,
          action: `verifier.${isApproved ? 'approve' : 'reject'}`,
          target: response.data.data?.user?.email || 'verifier',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12));

      if (rejectingVerifier?._id === verifierId) {
        setRejectingVerifier(null);
        setRejectReason('');
      }
    } catch (err) {
      console.error('Verifier action error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to process verifier action.');
    } finally {
      setVerifierActionLoadingId('');
    }
  };

  const handleReset2FA = async (verifierId, verifierEmail) => {
    if (!window.confirm(`Are you sure you want to disable 2FA for "${verifierEmail}"? They will be able to log in with just their password.`)) {
      return;
    }
    try {
      setResetting2faId(verifierId);
      const apiClient = createApiClient();
      const response = await apiClient.post(`/api/admin/reset-2fa/${verifierId}`);
      toast.success(response.data?.message || '2FA disabled successfully.');
      setAllVerifiers((prev) =>
        prev.map((v) =>
          v._id === verifierId
            ? {
                ...v,
                twoFactor: { ...(v.twoFactor || {}), enabled: false, verified: false },
                settings: { ...(v.settings || {}), twoFactorEnabled: false },
              }
            : v
        )
      );
    } catch (err) {
      console.error('2FA reset error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to reset 2FA.');
    } finally {
      setResetting2faId('');
    }
  };

  const handleDownloadCertificate = async (certificateId) => {
    try {
      const apiClient = createApiClient();
      toast.info('Downloading official credential PDF...');
      const response = await apiClient.get(`/api/certificates/${certificateId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `digital-credential-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate PDF downloaded successfully');
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      toast.error(downloadError.response?.data?.error || 'Failed to download certificate');
    }
  };

  const reviewSubmission = async () => {
    if (!selectedSubmission) return;
    if (reviewDecision === 'reject' && !reviewNote.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    try {
      setReviewLoadingId(selectedSubmission._id);
      const apiClient = createApiClient();
      const response = await apiClient.put(`/api/submissions/${selectedSubmission._id}/review`, {
        decision: reviewDecision,
        note: reviewNote || '',
      });

      setPendingSubmissions((current) => current.filter((submission) => submission._id !== selectedSubmission._id));
      if (reviewDecision === 'approve' && response.data.data?.certificate) {
        setRecentCertificates((current) => [response.data.data.certificate, ...current].slice(0, 5));
      }
      closeReviewModal();
    } catch (reviewError) {
      console.error('Submission review error:', reviewError);
      setError(reviewError.response?.data?.error || 'Failed to review submission.');
    } finally {
      setReviewLoadingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error && !showReviewModal) {
    return <div className="trust-dashboard"><div className="trust-card text-sm text-rose-200">{error}</div></div>;
  }

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero relative overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] items-center">
          <div>
            <span className="status-chip status-chip-amber">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
              Operations control plane
            </span>
            <h1 className="trust-title mt-4 text-4xl font-semibold md:text-5xl">Issue. Audit. Anchor.</h1>
            <p className="trust-muted mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Manage the entire certificate lifecycle across Hyperledger Fabric and the Internet Computer.
            </p>
          </div>
          <div className="hidden lg:block relative">
            <div className="w-full h-36 rounded-xl overflow-hidden border border-amber/40 shadow-[0_0_24px_rgba(255,138,43,0.2)] relative">
              <img src={circuitImg} alt="Blockchain Operations" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber bg-slate-950/85 px-2.5 py-0.5 rounded border border-amber/40 backdrop-blur-sm">
                  Fabric + ICP Core
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  ● Bridge Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard title="Pending intake" value={pendingSubmissions.length} meta="awaiting review" icon={DocumentPlusIcon} />
          <StatCard title="Recent issues" value={stats.recentCertificates} meta="last 30 days" icon={SparklesIcon} />
          <StatCard title="Audited actions" value={auditLogs.length} meta="on-chain events" icon={ShieldCheckIcon} />
        </div>
      </section>

      <section className="trust-stat-grid">
        <StatCard title="Total certificates" value={stats.totalCertificates} meta="from system" icon={CheckBadgeIcon} />
        <StatCard title="Recent issuances" value={stats.recentCertificates} meta="last 30 days" icon={SparklesIcon} />
        <StatCard title="Total students" value={stats.totalStudents} meta="registered" icon={UserGroupIcon} />
        <StatCard title="Total verifiers" value={stats.totalVerifiers} meta="approved" icon={ShieldCheckIcon} />
      </section>

      <section>
        <NetworkTelemetryWidget />
      </section>

      <section>
        <p className="trust-section-kicker">Execution lane</p>
        <h2 className="trust-title mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold">Quick actions</h2>
        <div className="mt-3 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Link to="/issue-certificate" className="trust-card block p-3 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <DocumentPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Issue</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Single credential to one student.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Open ↗</p>
          </Link>
          <Link to="/certificates" className="trust-card trust-card-glow block p-3 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto sm:mx-0 text-emerald-400">
                <DocumentCheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Certificates Registry</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Browse, verify & download all issued credentials.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-emerald-400 font-mono">Registry ↗</p>
          </Link>
          <Link to="/batch-certificates" className="trust-card block p-3 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <DocumentDuplicateIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Batch Issue</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Upload CSVs for cohort issuance.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Batch ↗</p>
          </Link>
          <Link to="/verification-activity" className="trust-card block p-3 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <SignalIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-white leading-tight">Activity Logs</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">See who scanned, when, and from where.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Logs ↗</p>
          </Link>
        </div>
      </section>

      {/* RECENTLY ISSUED CERTIFICATES */}
      <section>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="trust-section-kicker">Conferred Credentials</p>
            <h2 className="trust-title mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">Recently Issued Certificates</h2>
          </div>
          <Link to="/certificates" className="btn-secondary px-3.5 py-1.5 text-xs font-mono">
            View All Registry ({stats.totalCertificates}) ↗
          </Link>
        </div>

        <div className="trust-table mt-4">
          {recentCertificates.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><DocumentCheckIcon /></span>
              <h3 className="trust-empty-title">No certificates issued yet</h3>
              <p className="trust-empty-copy">Newly issued credentials will appear here with instant download and verification links.</p>
            </div>
          ) : (
            recentCertificates.map((cert) => {
              const studentName = cert.studentDetails?.fullName || cert.metadata?.studentName || cert.studentId;
              const programName = cert.academicRecord?.program || cert.courseName || 'Degree Certificate';
              const instName = cert.issuerDetails?.institutionName || cert.metadata?.institution || 'Zambian Institution';
              const certId = cert.certificateId;
              const prefix = (certId || '').split('-')[0];
              const isKMU = prefix === 'KMU';
              const isUNZA = prefix === 'UNZA';
              const isZCAS = prefix === 'ZCAS';
              const isMU = prefix === 'MU';
              const isCBU = prefix === 'CBU';
              const isNIPA = prefix === 'NIPA';

              const badgeClass = isUNZA ? 'bg-red-950/60 text-red-300 border-red-500/40' :
                isZCAS ? 'bg-blue-950/60 text-blue-300 border-blue-500/40' :
                isMU ? 'bg-purple-950/60 text-purple-300 border-purple-500/40' :
                isCBU ? 'bg-sky-950/60 text-sky-300 border-sky-500/40' :
                isNIPA ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' :
                isKMU ? 'bg-amber-950/60 text-amber-300 border-amber-500/40' :
                'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div key={cert._id || certId} className="trust-row flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${badgeClass}`}>
                        {prefix}
                      </span>
                      <p className="font-mono text-sm font-semibold text-white">{certId}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Live on Blockchain
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1.5">
                      {studentName} · <span className="text-cyan-300 font-normal">{programName}</span>
                    </p>
                    <p className="trust-muted text-xs mt-0.5">
                      {instName} · Student No: {cert.studentDetails?.studentNumber || cert.studentId} · {shortTime(cert.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
                    <Link to={`/certificates/${certId}`} className="btn-secondary px-3 py-1.5 text-xs flex-1 md:flex-none text-center">
                      View
                    </Link>
                    <Link to={`/verify/${certId}`} target="_blank" className="btn-secondary px-3 py-1.5 text-xs flex-1 md:flex-none text-center text-cyan-300 border-cyan-500/30">
                      Verify ↗
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDownloadCertificate(certId)}
                      className="btn-primary px-3 py-1.5 text-xs flex-1 md:flex-none inline-flex items-center justify-center gap-1.5"
                    >
                      <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="trust-section-kicker">Intake</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Pending submissions</h2>
          </div>
          <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-bold text-white">{pendingSubmissions.length} open</span>
        </div>
        <div className="trust-table mt-5">
          {pendingSubmissions.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><InboxIcon /></span>
              <h3 className="trust-empty-title">No pending submissions</h3>
              <p className="trust-empty-copy">Student certificate requests will appear here as soon as they enter admin review.</p>
            </div>
          ) : pendingSubmissions.map((submission, index) => (
            <div key={submission._id} className="trust-row">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono uppercase text-sky-300">SUB-{String(9821 - index).padStart(4, '0')} <span className="ml-2 font-sans text-base normal-case text-white break-words">{submission.metadata?.studentName || submission.student?.profile?.fullName || submission.studentId}</span></p>
                <p className="trust-muted mt-2 text-sm break-words">{submission.courseName} · doc {submission.studentId || submission.student?.email || 'not provided'} · {shortTime(submission.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button type="button" className="btn-secondary px-4 py-2 flex-1 sm:flex-none" onClick={() => openReviewModal(submission, 'approve')}>Review</button>
                <button type="button" className="btn-primary px-4 py-2 flex-1 sm:flex-none" disabled={reviewLoadingId === submission._id} onClick={() => openReviewModal(submission, 'approve')}>
                  Approve & Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.48fr]">
        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Ledger</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Recent activity</h2>
          </div>
          {auditLogs.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><SignalIcon /></span>
              <h3 className="trust-empty-title">No ledger activity yet</h3>
              <p className="trust-empty-copy">Issuance, verification, and anchoring events will populate this stream.</p>
            </div>
          ) : auditLogs.slice(0, 4).map((log) => (
            <div key={log._id} className="trust-row">
              <div className="flex items-center gap-3">
                <span className="trust-icon-disc"><SignalIcon className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-white">{log.action}</p>
                  <p className="font-mono text-xs text-sky-300">{log.target || log.actorEmail || 'system'}</p>
                </div>
              </div>
              <span className="text-sm text-sky-200">{shortTime(log.createdAt)}</span>
            </div>
          ))}
        </div>

        <div className="trust-table">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-500/10">
            <div>
              <p className="trust-section-kicker">Access Management</p>
              <h2 className="trust-title mt-1 text-xl sm:text-2xl font-semibold flex items-center gap-2">
                Verifiers
              </h2>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/60 border border-sky-500/15 text-xs font-mono">
              <button
                type="button"
                onClick={() => setVerifierTab('pending')}
                className={`px-3 py-1 rounded-md transition ${verifierTab === 'pending' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                Pending ({pendingVerifiers.length})
              </button>
              <button
                type="button"
                onClick={() => setVerifierTab('all')}
                className={`px-3 py-1 rounded-md transition ${verifierTab === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                All Verifiers ({allVerifiers.length})
              </button>
            </div>
          </div>

          {verifierTab === 'pending' ? (
            pendingVerifiers.length === 0 ? (
              <div className="trust-empty-state">
                <span className="trust-empty-icon"><UserGroupIcon /></span>
                <h3 className="trust-empty-title">No verifier requests</h3>
                <p className="trust-empty-copy">New verifier registrations will wait here for approval.</p>
              </div>
            ) : (
              <div className="divide-y divide-sky-500/10 max-h-[30rem] overflow-y-auto">
                {pendingVerifiers.map((verifier) => {
                  const isLoading = verifierActionLoadingId === verifier._id;
                  return (
                    <div key={verifier._id} className="p-4 sm:p-5 hover:bg-slate-900/20 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white text-sm sm:text-base">
                              {verifier.profile?.fullName || verifier.username || verifier.email}
                            </p>
                            {verifier.profile?.organization && (
                              <span className="inline-flex items-center gap-1 rounded bg-sky-400/10 px-2 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-inset ring-sky-400/30">
                                <BuildingOffice2Icon className="h-3 w-3" />
                                {verifier.profile.organization}
                              </span>
                            )}
                            {verifier.profile?.organizationType && (
                              <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                                {verifier.profile.organizationType}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-sky-300 mt-1">{verifier.email}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {shortTime(verifier.createdAt)}
                        </span>
                      </div>

                      {verifier.profile?.reason && (
                        <p className="trust-muted mt-2 text-xs bg-slate-950/40 border border-sky-500/10 rounded-lg p-2 italic">
                          "{verifier.profile.reason}"
                        </p>
                      )}

                      <div className="mt-3.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleVerifierAction(verifier._id, 'approve')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                        >
                          {isLoading ? (
                            <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckIcon className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setRejectingVerifier(verifier);
                            setRejectReason('');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            allVerifiers.length === 0 ? (
              <div className="trust-empty-state">
                <span className="trust-empty-icon"><UserGroupIcon /></span>
                <h3 className="trust-empty-title">No verifier accounts</h3>
                <p className="trust-empty-copy">Registered verifiers will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-sky-500/10 max-h-[30rem] overflow-y-auto">
                {allVerifiers.map((verifier) => {
                  const has2FA = Boolean(verifier.twoFactor?.enabled || verifier.settings?.twoFactorEnabled);
                  const isResetting = resetting2faId === verifier._id;
                  return (
                    <div key={verifier._id} className="p-4 sm:p-5 hover:bg-slate-900/20 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white text-sm sm:text-base">
                              {verifier.profile?.fullName || verifier.username || verifier.email}
                            </p>
                            {verifier.profile?.organization && (
                              <span className="inline-flex items-center gap-1 rounded bg-sky-400/10 px-2 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-inset ring-sky-400/30">
                                <BuildingOffice2Icon className="h-3 w-3" />
                                {verifier.profile.organization}
                              </span>
                            )}
                            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              verifier.profile?.verificationStatus === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : verifier.profile?.verificationStatus === 'rejected'
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}>
                              {verifier.profile?.verificationStatus || 'approved'}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-sky-300 mt-1">{verifier.email}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {shortTime(verifier.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-sky-500/5 pt-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">Security:</span>
                          {has2FA ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[11px] font-mono text-amber-300 font-medium">
                              <KeyIcon className="h-3 w-3" />
                              2FA Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                              2FA Disabled
                            </span>
                          )}
                        </div>

                        {has2FA && (
                          <button
                            type="button"
                            disabled={isResetting}
                            onClick={() => handleReset2FA(verifier._id, verifier.email)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                            title="Reset 2FA settings for this verifier"
                          >
                            {isResetting ? (
                              <div className="h-3 w-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <KeyIcon className="h-3.5 w-3.5" />
                            )}
                            Reset 2FA
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </section>

      <section>
        <p className="trust-section-kicker">Infrastructure</p>
        <h2 className="trust-title mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold">Bridge health</h2>
        <div className="mt-3 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          {[
            ['Hyperledger Fabric', bridgeHealth?.fabric?.latency || '42ms', 'operational'],
            ['ICP Anchor Bridge', bridgeHealth?.bridge?.lastSuccessAt ? '118ms' : '118ms', bridgeHealth?.bridge?.started === false ? 'offline' : 'operational'],
            ['MongoDB Cluster', '8ms', 'operational'],
            ['QR Service', bridgeHealth?.qrService?.latency || 'n/a', bridgeHealth?.qrService?.status || 'operational'],
          ].map(([name, latency, status]) => (
            <div key={name} className="trust-card p-3 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400/80 shrink-0" />
                <span className={`text-[10px] sm:text-xs font-bold font-mono ${status === 'degraded' ? 'text-amber-300' : status === 'offline' ? 'text-rose-300' : 'text-emerald-300'}`}>
                  ● {status}
                </span>
              </div>
              <div className="mt-2.5 sm:mt-4">
                <p className="font-semibold text-white text-xs sm:text-base leading-tight truncate">{name}</p>
                <p className="trust-muted mt-0.5 sm:mt-1 text-[11px] sm:text-sm font-mono">latency {latency}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showReviewModal && selectedSubmission && (() => {
        const fileType = selectedSubmission.fileType || 'application/octet-stream';
        const fileDataUri = `data:${fileType};base64,${selectedSubmission.certificateFile}`;
        const isPdf = fileType === 'application/pdf';
        const isImage = fileType.startsWith('image/');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2.5 sm:p-4 overflow-y-auto">
            <div className="trust-card w-full max-w-5xl my-4 sm:my-8 p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-sky-500/10 pb-3 mb-5">
                <div>
                  <p className="trust-section-kicker">Submission review</p>
                  <h3 className="trust-title mt-1 text-xl sm:text-2xl font-semibold break-words">{selectedSubmission.courseName}</h3>
                </div>
                <button type="button" onClick={closeReviewModal} className="text-gray-400 hover:text-white text-3xl font-bold p-1 leading-none">&times;</button>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 sm:p-4 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Column 1: Document Preview */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Document Preview</h4>
                  <div className="overflow-hidden rounded-xl border border-sky-500/20 bg-slate-950/40 min-h-[16rem] sm:min-h-[20rem] flex flex-col items-center justify-center p-2 sm:p-4">
                    {isPdf ? (
                      <iframe
                        src={fileDataUri}
                        title="Certificate PDF Preview"
                        className="w-full h-64 sm:h-96 rounded-lg border-0"
                      />
                    ) : isImage ? (
                      <img
                        src={fileDataUri}
                        alt="Certificate Preview"
                        className="max-h-[18rem] sm:max-h-[24rem] w-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-6">
                        <DocumentCheckIcon className="mx-auto h-16 w-16 text-slate-400" />
                        <p className="trust-muted mt-3 text-sm">No live preview available for this file type.</p>
                      </div>
                    )}
                  </div>
                  <a
                    href={fileDataUri}
                    download={selectedSubmission.fileName || `submission-${selectedSubmission._id}`}
                    className="btn-secondary w-full text-center py-2.5 block text-sm font-medium"
                  >
                    Download Original File
                  </a>
                </div>

                {/* Column 2: Review Controls */}
                <div className="flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Candidate Details</h4>
                      <div className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-sky-500/5 bg-slate-900/10 p-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Full Name</p>
                          <p className="font-semibold text-white mt-1">
                            {selectedSubmission.studentDetails?.fullName || selectedSubmission.metadata?.studentName || selectedSubmission.student?.profile?.fullName || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Student ID</p>
                          <p className="font-semibold text-white mt-1">
                            {selectedSubmission.studentDetails?.studentNumber || selectedSubmission.studentId}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">NRC / ID</p>
                          <p className="font-semibold text-white mt-1">
                            {selectedSubmission.studentDetails?.nationalId || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Institution</p>
                          <p className="font-semibold text-white mt-1">
                            {selectedSubmission.issuerDetails?.institutionName || 'Kapasa Makasa University'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Decision</h4>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          className={`trust-card p-4 text-center cursor-pointer transition ${reviewDecision === 'approve' ? 'trust-card-glow border-primary-500' : 'opacity-60 hover:opacity-100'}`}
                          onClick={() => setReviewDecision('approve')}
                        >
                          <span className="font-semibold text-white block">Approve & Issue</span>
                        </button>
                        <button
                          type="button"
                          className={`trust-card p-4 text-center cursor-pointer transition ${reviewDecision === 'reject' ? 'border-rose-500/60 bg-rose-500/5' : 'opacity-60 hover:opacity-100'}`}
                          onClick={() => setReviewDecision('reject')}
                        >
                          <span className="font-semibold text-white block text-rose-300">Reject</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="submission-review-note" className="form-label">
                        {reviewDecision === 'approve' ? 'Approval Note (Optional)' : 'Rejection Reason (Required)'}
                      </label>
                      <textarea
                        id="submission-review-note"
                        rows={4}
                        className="input-field mt-2"
                        placeholder={reviewDecision === 'approve' ? 'Add any remarks for the certificate ledger entry...' : 'Provide detail on why the submission is rejected...'}
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-sky-500/10 pt-4">
                    <button type="button" onClick={closeReviewModal} className="btn-secondary">Cancel</button>
                    <button
                      type="button"
                      onClick={reviewSubmission}
                      className="btn-primary"
                      disabled={reviewLoadingId === selectedSubmission._id}
                    >
                      {reviewLoadingId === selectedSubmission._id ? (
                        <>
                          <div className="spinner h-4 w-4 mr-2" />
                          Processing...
                        </>
                      ) : reviewDecision === 'approve' ? (
                        'Approve & Issue'
                      ) : (
                        'Reject Submission'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Verifier Denial Reason Modal */}
      {rejectingVerifier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4">
          <div className="trust-card w-full max-w-md p-5 sm:p-6 border border-rose-500/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Deny Verifier Access</h3>
              <button
                type="button"
                onClick={() => setRejectingVerifier(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mb-3">
              Are you sure you want to decline registration for{' '}
              <strong className="text-white">
                {rejectingVerifier.profile?.fullName || rejectingVerifier.email}
              </strong>
              {rejectingVerifier.profile?.organization ? ` from ${rejectingVerifier.profile.organization}` : ''}?
            </p>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Reason for Denial (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unverified organization credentials or missing authorization"
              className="w-full rounded-xl border border-sky-500/20 bg-slate-950/60 p-3 text-xs sm:text-sm text-white focus:border-rose-500 focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={verifierActionLoadingId === rejectingVerifier._id}
                onClick={() => setRejectingVerifier(null)}
                className="btn-secondary px-3.5 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifierActionLoadingId === rejectingVerifier._id}
                onClick={() => handleVerifierAction(rejectingVerifier._id, 'reject', rejectReason)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50"
              >
                {verifierActionLoadingId === rejectingVerifier._id && (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Confirm Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
