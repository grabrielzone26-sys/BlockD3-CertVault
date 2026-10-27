import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import academicBadgeImg from '../../assets/images/view-3d-book-with-graduation-cap.jpg';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const statusPill = (status) => {
  if (status === 'issued') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 text-xs font-mono font-bold text-emerald-300 shadow-[0_0_12px_rgba(57,255,136,0.18)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Issued
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/10 border border-rose-400/30 px-3 py-1 text-xs font-mono font-bold text-rose-300 shadow-[0_0_12px_rgba(255,79,216,0.18)]">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(255,138,43,0.18)]">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Pending
    </span>
  );
};

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

const CredentialLifecycleStepper = ({ submissions = [], certificates = [] }) => {
  const hasIssued = certificates.length > 0;
  const hasUnderReview = submissions.some((s) => s.status === 'underReview' || s.status === 'in_review');
  const hasSubmitted = submissions.length > 0;

  let currentStep = 1;
  if (hasIssued) {
    currentStep = 5;
  } else if (hasUnderReview) {
    currentStep = 2;
  } else if (hasSubmitted) {
    currentStep = 1;
  }

  const steps = [
    { num: 1, title: 'Intake Request', desc: 'Uploaded to intake queue' },
    { num: 2, title: 'Senate Audit', desc: 'Academic credentials audited' },
    { num: 3, title: 'Fabric Minting', desc: 'Block committed on ledger' },
    { num: 4, title: 'ICP Anchor', desc: 'Canister root synced' },
    { num: 5, title: 'Verifiable', desc: 'Issued with live QR proof' },
  ];

  return (
    <div className="trust-card p-4 sm:p-6 rounded-2xl space-y-4 border border-sky-500/25">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="trust-section-kicker">Lifecycle Tracker</p>
          <h3 className="text-base sm:text-lg font-semibold font-display text-[var(--text-primary,#ffffff)]">
            Credential Issuance Journey
          </h3>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
          {hasIssued ? 'Status: Conferred & Live on Blockchain' : hasSubmitted ? 'Status: In Processing Pipeline' : 'Status: Ready for Submission'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {steps.map((step) => {
          const isDone = step.num < currentStep || (step.num === 5 && hasIssued);
          const isCurrent = step.num === currentStep && !hasIssued;

          return (
            <div
              key={step.num}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : isCurrent
                  ? 'bg-sky-950/40 border-sky-500/50 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-900/30 border-slate-700/30 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-sky-400 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : step.num}
                </span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />}
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-semibold text-[var(--text-primary,#ffffff)] leading-tight">{step.title}</p>
                <p className="text-[10px] trust-muted mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({
    total: 0,
    submitted: 0,
    underReview: 0,
    rejected: 0,
    issued: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        if (!user?.profile?.studentId) {
          throw new Error('Student profile not found. Please update your profile.');
        }

        const apiClient = createApiClient();
        const [certificateResponse, overviewResponse] = await Promise.all([
          apiClient.get(`/api/certificates/student/${user.profile.studentId}`),
          apiClient.get('/api/submissions/mine/overview'),
        ]);

        setCertificates(certificateResponse.data.data || []);
        setSubmissions(overviewResponse.data.data?.submissions || []);
        setNotifications(overviewResponse.data.data?.notifications || []);
        setTimeline(overviewResponse.data.data?.timeline || []);
        setSubmissionCounts(overviewResponse.data.data?.counts || {
          total: 0,
          submitted: 0,
          underReview: 0,
          rejected: 0,
          issued: 0,
        });
      } catch (fetchError) {
        console.error('Student dashboard fetch error:', fetchError);
        setError(fetchError.response?.data?.error || fetchError.message || 'Failed to load student dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.profile?.studentId]);

  const issuedSubmissionCount = useMemo(
    () => submissions.filter((item) => item.status === 'issued').length,
    [submissions]
  );

  const pendingSubmissionCount = useMemo(
    () => submissions.filter((item) => item.status === 'submitted' || item.status === 'underReview').length,
    [submissions]
  );

  if (loading) {
    return (
      <div className="trust-dashboard space-y-8">
        <div className="trust-hero h-48 animate-pulse bg-slate-900/60 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="trust-card h-28 animate-pulse bg-slate-900/40 rounded-2xl" />
          <div className="trust-card h-28 animate-pulse bg-slate-900/40 rounded-2xl" />
          <div className="trust-card h-28 animate-pulse bg-slate-900/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trust-dashboard">
        <div className="trust-card flex gap-3 text-sm text-rose-200">
          <ExclamationTriangleIcon className="h-5 w-5 flex-none" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero relative overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] items-center">
          <div>
            <span className="status-chip status-chip-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              Student credential lane
            </span>
            <h1 className="trust-title mt-4 text-4xl font-semibold md:text-5xl">Submit. Track. Retrieve.</h1>
            <p className="trust-muted mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Welcome, <strong className="text-[var(--text-primary,#ffffff)]">{user.profile.fullName}</strong>. Track every certificate request from intake through blockchain issuance.
            </p>
          </div>
          <div className="hidden lg:block relative">
            <div className="w-full h-36 rounded-xl overflow-hidden border border-cyan/30 shadow-[0_0_24px_rgba(0,229,255,0.2)] relative">
              <img src={academicBadgeImg} alt="Academic Certification" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <span className="absolute bottom-2.5 left-3 font-mono text-[10px] uppercase tracking-wider text-cyan bg-slate-950/85 px-2.5 py-0.5 rounded border border-cyan/40 backdrop-blur-sm">
                Academic Credential Anchor
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard title="Issued certificates" value={certificates.length} meta="ready to open" icon={DocumentCheckIcon} />
          <StatCard title="Pending submissions" value={pendingSubmissionCount} meta="awaiting admin review" icon={ClockIcon} />
          <StatCard title="Ready to download" value={issuedSubmissionCount} meta="with QR proof" icon={ShieldCheckIcon} />
        </div>
      </section>

      {/* Lifecycle Progress Stepper */}
      <section>
        <CredentialLifecycleStepper submissions={submissions} certificates={certificates} />
      </section>

      <section>
        <p className="trust-section-kicker">Execution lane</p>
        <h2 className="trust-title mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold">Quick actions</h2>
        <div className="mt-3 sm:mt-6 grid grid-cols-3 gap-1.5 sm:gap-4">
          <Link to="/submit-certificate" className="trust-card trust-card-glow block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <DocumentPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-[var(--text-primary,#ffffff)] leading-tight">Submit</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Upload your credential for admin review.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Upload ↗</p>
          </Link>
          <Link to="/certificates" className="trust-card block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <DocumentCheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-[var(--text-primary,#ffffff)] leading-tight">My Records</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Review issued records and download QR proofs.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">Registry ↗</p>
          </Link>
          <div className="trust-card block p-2.5 sm:p-5 min-h-0 sm:min-h-[10.5rem] flex flex-col justify-between text-center sm:text-left">
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto sm:mx-0 text-cyan-300">
                <InboxIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-4 text-xs sm:text-base font-semibold text-[var(--text-primary,#ffffff)] leading-tight">Status</h3>
              <p className="trust-muted mt-1 text-xs hidden sm:block">Admin notes and corrections stay visible here.</p>
            </div>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">{submissionCounts.rejected} attention</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Inbox</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Notifications</h2>
          </div>
          {notifications.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><InboxIcon /></span>
              <h3 className="trust-empty-title">No notifications yet</h3>
              <p className="trust-empty-copy">Submission updates, approval notes, and issued certificate alerts will appear here.</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="trust-row">
                <div>
                  <p className="font-semibold text-[var(--text-primary,#ffffff)]">{notification.title}</p>
                  <p className="trust-muted mt-1 text-sm">{notification.message}</p>
                  <p className="mt-2 font-mono text-xs text-sky-300">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                {notification.issuedCertificateId && (
                  <Link to={`/certificates/${notification.issuedCertificateId}`} className="btn-secondary px-4 py-2">Open</Link>
                )}
              </div>
            ))
          )}
        </div>

        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Lifecycle</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Request timeline</h2>
          </div>
          {timeline.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><ClockIcon /></span>
              <h3 className="trust-empty-title">No timeline activity</h3>
              <p className="trust-empty-copy">Your request history will build here after you submit a certificate for review.</p>
            </div>
          ) : (
            timeline.slice(0, 6).map((entry) => (
              <div key={entry.id} className="trust-row">
                <div className="flex items-center gap-3">
                  <span className="trust-icon-disc">
                    {entry.status === 'issued' ? <CheckCircleIcon className="h-5 w-5" /> : entry.status === 'rejected' ? <XCircleIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text-primary,#ffffff)]">{entry.title}</p>
                    <p className="trust-muted mt-1 text-sm">{entry.metadata?.program || 'Program not provided'}</p>
                    {entry.note && <p className="trust-muted mt-1 text-sm">Admin note: {entry.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusPill(entry.status)}
                  {entry.issuedCertificateId && (
                    <Link to={`/certificates/${entry.issuedCertificateId}`} className="text-sky-200">
                      <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="trust-table">
          <div className="p-5">
            <p className="trust-section-kicker">Intake</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">My submissions</h2>
          </div>
          {submissions.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><DocumentPlusIcon /></span>
              <h3 className="trust-empty-title">No submissions yet</h3>
              <p className="trust-empty-copy">Use the submit page to send your certificate evidence to the admin queue.</p>
            </div>
          ) : (
            submissions.slice(0, 6).map((submission) => (
              <div key={submission._id} className="trust-row">
                <div>
                  <p className="font-semibold text-[var(--text-primary,#ffffff)]">{submission.courseName}</p>
                  <p className="trust-muted mt-1 text-sm">{submission.metadata?.program || 'Program not provided'}</p>
                  <p className="mt-2 font-mono text-xs text-sky-300">Submitted {new Date(submission.createdAt).toLocaleString()}</p>
                  {submission.reviewNote && <p className="trust-muted mt-2 text-sm">Admin note: {submission.reviewNote}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {statusPill(submission.status)}
                  {submission.issuedCertificateId && (
                    <Link to={`/certificates/${submission.issuedCertificateId}`} className="btn-secondary px-4 py-2">Open</Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="trust-table">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="trust-section-kicker">Ledger</p>
              <h2 className="trust-title mt-3 text-2xl font-semibold">Issued certificates</h2>
            </div>
            <Link to="/certificates" className="text-sm font-bold text-sky-200">View all</Link>
          </div>
          {certificates.length === 0 ? (
            <div className="trust-empty-state">
              <span className="trust-empty-icon"><DocumentCheckIcon /></span>
              <h3 className="trust-empty-title">No issued certificates</h3>
              <p className="trust-empty-copy">Approved credentials will appear here with links to open or download them.</p>
            </div>
          ) : (
            certificates.slice(0, 6).map((certificate) => {
              const resolvedProgram = certificate.academicRecord?.program || certificate.courseName;
              const resolvedInstitution = certificate.issuerDetails?.institutionName || certificate.metadata?.institution || 'BlockD3 University';
              const issueDate = certificate.metadata?.issueDate || certificate.createdAt;

              return (
                <div key={certificate.certificateId} className="trust-row">
                  <div className="flex items-center gap-3">
                    <span className="trust-icon-disc"><DocumentCheckIcon className="h-5 w-5" /></span>
                    <div>
                      <p className="font-semibold text-[var(--text-primary,#ffffff)]">{resolvedProgram}</p>
                      <p className="trust-muted mt-1 text-sm">
                        {resolvedInstitution} • Issued {new Date(issueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Link to={`/certificates/${certificate.certificateId}`} className="text-sky-200">
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
