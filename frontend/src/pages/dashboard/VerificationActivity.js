import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentChartBarIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  SignalIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const VerificationActivity = () => {
  const { isAdmin, isVerifier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
  });
  const [stats, setStats] = useState({
    totalVerifications: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
  });

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        setError('');
        const apiClient = createApiClient();

        if (isAdmin()) {
          const response = await apiClient.get('/api/admin/audit-logs?limit=100&action=blockchain');
          const logs = response.data.data || [];
          const verificationLogs = logs.filter((log) =>
            ['fabric.certificate.verify', 'fabric.certificate.batch-verify'].includes(log.action)
          );

          const derivedStats = verificationLogs.reduce(
            (accumulator, log) => {
              if (log.action === 'fabric.certificate.batch-verify') {
                accumulator.totalVerifications += Number(log.metadata?.total || 0);
                accumulator.successfulVerifications += Number(log.metadata?.valid || 0);
                accumulator.failedVerifications +=
                  Number(log.metadata?.invalid || 0) + Number(log.metadata?.failed || 0);
              } else {
                accumulator.totalVerifications += 1;
                if (log.metadata?.isValid) {
                  accumulator.successfulVerifications += 1;
                } else {
                  accumulator.failedVerifications += 1;
                }
              }
              return accumulator;
            },
            { totalVerifications: 0, successfulVerifications: 0, failedVerifications: 0 }
          );

          setEntries(
            verificationLogs.map((log) => ({
              id: log._id,
              certificateId: log.target,
              type: log.action === 'fabric.certificate.batch-verify' ? 'batch' : 'single',
              actorEmail: log.actorEmail || 'system',
              status:
                log.action === 'fabric.certificate.batch-verify'
                  ? 'batch'
                  : log.metadata?.isValid
                    ? 'valid'
                    : 'invalid',
              createdAt: log.createdAt,
              metadata: log.metadata || {},
            }))
          );
          setStats(derivedStats);
          return;
        }

        const [historyResponse, statsResponse] = await Promise.allSettled([
          apiClient.get('/api/verifier/history'),
          apiClient.get('/api/verifier/stats'),
        ]);

        if (historyResponse.status === 'fulfilled') {
          setEntries(historyResponse.value.data.data || []);
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
        console.error('Verification activity fetch error:', fetchError);
        setError(fetchError.response?.data?.error || 'Failed to load verification activity.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [isAdmin, isVerifier]);

  const normalizedEntries = useMemo(
    () =>
      entries.map((entry) => {
        if (isAdmin()) {
          return {
            id: entry.id,
            label:
              entry.type === 'batch'
                ? `${entry.metadata?.total || 0} certificates processed`
                : entry.certificateId || 'Unknown certificate',
            sublabel:
              entry.type === 'batch'
                ? `${entry.metadata?.valid || 0} valid / ${entry.metadata?.invalid || 0} invalid / ${entry.metadata?.failed || 0} failed`
                : entry.actorEmail,
            status: entry.status,
            createdAt: entry.createdAt,
            linkTarget: entry.type === 'single' && entry.certificateId ? `/certificates/${entry.certificateId}` : null,
          };
        }

        return {
          id: entry.id,
          label:
            entry.type === 'batch'
              ? entry.courseName
              : entry.certificateId || 'Unknown certificate',
          sublabel:
            entry.type === 'batch'
              ? entry.studentName
              : `${entry.studentName} • ${entry.courseName}`,
          status:
            entry.status === 'success'
              ? 'valid'
              : entry.status === 'failed'
                ? 'invalid'
                : 'batch',
          createdAt: entry.timestamp,
          linkTarget: entry.certificateId ? `/certificates/${entry.certificateId}` : null,
        };
      }),
    [entries, isAdmin]
  );

  const filteredEntries = useMemo(() => normalizedEntries.filter((entry) => {
    if (filters.status !== 'all' && entry.status !== filters.status) {
      return false;
    }

    if (filters.type !== 'all') {
      const entryType = entry.status === 'batch' ? 'batch' : 'single';
      if (entryType !== filters.type) {
        return false;
      }
    }

    if (filters.query) {
      const haystack = `${entry.label} ${entry.sublabel}`.toLowerCase();
      if (!haystack.includes(filters.query.toLowerCase())) {
        return false;
      }
    }

    if (filters.startDate && new Date(entry.createdAt) < new Date(filters.startDate)) {
      return false;
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(entry.createdAt) > end) {
        return false;
      }
    }

    return true;
  }), [filters, normalizedEntries]);

  const exportCsv = () => {
    const rows = [
      ['Label', 'Details', 'Status', 'Timestamp', 'Record Link'],
      ...filteredEntries.map((entry) => [
        entry.label,
        entry.sublabel,
        entry.status,
        new Date(entry.createdAt).toISOString(),
        entry.linkTarget || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status) => {
    if (status === 'valid') {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          <CheckCircleIcon className="mr-1 h-4 w-4" />
          Valid
        </span>
      );
    }

    if (status === 'invalid') {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
          <XCircleIcon className="mr-1 h-4 w-4" />
          Invalid
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        <ClockIcon className="mr-1 h-4 w-4" />
        Batch
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero">
        <p className="trust-section-kicker">Verification reporting</p>
        <h1 className="trust-title mt-5 text-4xl font-semibold md:text-5xl">Trace. Filter. Export.</h1>
        <p className="trust-muted mt-4 max-w-2xl text-base leading-7">
          Review single checks and batch verification runs, then jump back into the certificate
          registry when an investigation needs detail.
        </p>

        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Total</p>
              <DocumentChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-white font-display leading-none">{stats.totalVerifications}</p>
          </div>
          <div className="trust-card trust-card-glow p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Valid</p>
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-emerald-300 font-display leading-none">{stats.successfulVerifications}</p>
          </div>
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Failed</p>
              <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-rose-300 font-display leading-none">{stats.failedVerifications}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="trust-table p-3.5 sm:p-6">
          <div className="flex items-center gap-3">
            <SignalIcon className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 shrink-0" />
            <div>
              <p className="trust-section-kicker">Ledger stream</p>
              <h2 className="trust-title mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold">Recent verification stream</h2>
              <p className="trust-muted mt-1 text-xs sm:text-sm">
                This surface shows the latest verification work visible to your role.
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
            <input
              type="text"
              className="input-field col-span-2 xl:col-span-1"
              placeholder="Search certificate or actor"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            />
            <select className="input-field text-xs sm:text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="all">All statuses</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
              <option value="batch">Batch</option>
            </select>
            <select className="input-field text-xs sm:text-sm" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="all">All types</option>
              <option value="single">Single</option>
              <option value="batch">Batch</option>
            </select>
            <input type="date" className="input-field text-xs sm:text-sm" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
            <input type="date" className="input-field text-xs sm:text-sm" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-3">
            <p className="text-xs sm:text-sm text-gray-400">{filteredEntries.length} item(s) match the current filters.</p>
            <button type="button" className="btn-secondary text-xs sm:text-sm py-1.5 px-3" onClick={exportCsv} disabled={filteredEntries.length === 0}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="trust-empty-state mt-6">
              <span className="trust-empty-icon"><FunnelIcon /></span>
              <h3 className="trust-empty-title">No matching activity</h3>
              <p className="trust-empty-copy">Adjust the search, status, type, or date filters to widen the verification stream.</p>
            </div>
          ) : (
            <div className="mt-4 sm:mt-6 space-y-2.5">
              {filteredEntries.map((entry) => (
              <div key={entry.id} className="trust-card rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{entry.label}</p>
                        {statusBadge(entry.status)}
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 truncate">{entry.sublabel}</p>
                      <p className="mt-1.5 text-[11px] font-mono text-cyan-300">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {entry.linkTarget && (
                      <Link to={entry.linkTarget} className="text-xs font-mono font-medium text-cyan hover:underline self-start">
                        Open record ↗
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="trust-card p-3.5 sm:p-6">
            <p className="trust-section-kicker">Guidance</p>
            <h2 className="trust-title mt-2 text-lg sm:text-xl font-semibold">Operator notes</h2>
            <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-300">
              <li>Single verification entries come from individual checks against the blockchain-backed record.</li>
              <li>Batch entries summarize multiple rapid checks run from the verification lane.</li>
              <li>Use the certificate registry when a failed check needs revocation or document review.</li>
            </ul>
          </div>

          <div className="trust-card p-3.5 sm:p-6">
            <div className="flex items-center gap-3">
              <DocumentMagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 shrink-0" />
              <div>
                <p className="trust-section-kicker">Actions</p>
                <h2 className="trust-title mt-1 text-lg sm:text-xl font-semibold">Next action</h2>
                <p className="trust-muted mt-0.5 text-xs sm:text-sm">Move directly back into verification or certificate review.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/verify-certificate" className="btn-primary text-xs font-mono py-1.5 px-3">
                Verify certificate
              </Link>
              <Link to="/batch-verify" className="btn-secondary text-xs font-mono py-1.5 px-3">
                Run batch verify
              </Link>
              <Link to="/certificates" className="btn-secondary text-xs font-mono py-1.5 px-3">
                Open registry
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationActivity;
