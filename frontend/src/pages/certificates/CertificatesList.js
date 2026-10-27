import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { createApiClient } from '../../lib/apiClient';
import {
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  NoSymbolIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import registryHeroImg from '../../assets/images/3d-rendering-blockchain-technology (1).jpg';

const CertificatesList = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [allCertificates, setAllCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: 'all', dateRange: 'all' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [sortBy, setSortBy] = useState('issueDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const isAdminUser = isAdmin();

  const downloadCertificate = async (certificateId) => {
    try {
      const apiClient = createApiClient();
      toast.info('Downloading certificate...');
      const response = await apiClient.get(`/api/certificates/${certificateId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded successfully');
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      toast.error(downloadError.response?.data?.error || 'Failed to download certificate');
    }
  };

  const openRevokeModal = (certificate) => {
    setSelectedCertificate(certificate);
    setRevokeReason('');
    setShowRevokeModal(true);
  };

  const closeRevokeModal = () => {
    setSelectedCertificate(null);
    setRevokeReason('');
    setShowRevokeModal(false);
  };

  const revokeCertificate = async () => {
    if (!selectedCertificate) {
      return;
    }

    const reason = revokeReason.trim();
    if (!reason) {
      toast.error('Please provide a revocation reason.');
      return;
    }

    try {
      setIsRevoking(true);
      const apiClient = createApiClient();
      const response = await apiClient.put(
        `/api/certificates/revoke/${selectedCertificate.certificateId}`,
        { reason }
      );
      setAllCertificates((prev) =>
        prev.map((certificate) =>
          certificate.certificateId === selectedCertificate.certificateId ? response.data.data : certificate
        )
      );
      toast.success(response.data.message || 'Certificate revoked successfully');
      closeRevokeModal();
    } catch (revokeError) {
      console.error('Revoke error:', revokeError);
      toast.error(revokeError.response?.data?.error || 'Failed to revoke certificate');
    } finally {
      setIsRevoking(false);
    }
  };

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Authentication required. Please log in again.');
        setAllCertificates([]);
        return;
      }

      let endpoint;
      if (isAdminUser) endpoint = '/api/certificates';
      else if (user?.profile?.studentId) endpoint = `/api/certificates/student/${user.profile.studentId}`;
      else if (user?.studentId) endpoint = `/api/certificates/student/${user.studentId}`;
      else if (user?.id) endpoint = `/api/certificates/student/${user.id}`;
      else {
        setError('User profile is missing a student identifier.');
        setAllCertificates([]);
        return;
      }

      const apiClient = createApiClient();
      const response = await apiClient.get(endpoint);
      const rawCertificates = Array.isArray(response.data?.data)
        ? response.data.data
        : response.data?.data?.certificates || [];
      setAllCertificates(rawCertificates);
    } catch (fetchError) {
      console.error('Certificates fetch error:', fetchError);
      if (fetchError.response?.status === 403) {
        setError('Access denied. You do not have permission to view these certificates.');
      } else if (fetchError.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(fetchError.response?.data?.error || 'Failed to load certificates');
      }
      setAllCertificates([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminUser, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchCertificates();
    }
  }, [authLoading, fetchCertificates]);

  const filteredCertificates = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const now = new Date();

    return allCertificates
      .filter((certificate) => {
        const matchesSearch =
          !normalizedSearch ||
          certificate.certificateId?.toLowerCase().includes(normalizedSearch) ||
          certificate.studentId?.toLowerCase().includes(normalizedSearch) ||
          certificate.courseName?.toLowerCase().includes(normalizedSearch) ||
          certificate.metadata?.studentName?.toLowerCase().includes(normalizedSearch) ||
          certificate.studentDetails?.fullName?.toLowerCase().includes(normalizedSearch) ||
          certificate.studentDetails?.studentNumber?.toLowerCase().includes(normalizedSearch) ||
          certificate.academicRecord?.program?.toLowerCase().includes(normalizedSearch) ||
          certificate.academicRecord?.programSpecification?.toLowerCase().includes(normalizedSearch) ||
          certificate.issuerDetails?.institutionName?.toLowerCase().includes(normalizedSearch) ||
          certificate.issuerDetails?.certificationNumber?.toLowerCase().includes(normalizedSearch);

        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'valid' && certificate.isValid) ||
          (filters.status === 'revoked' && !certificate.isValid);

        const issueDate = new Date(certificate.metadata?.issueDate || certificate.createdAt);
        let matchesDateRange = true;

        if (filters.dateRange === 'today') {
          matchesDateRange = issueDate.toDateString() === now.toDateString();
        } else if (filters.dateRange === 'week') {
          matchesDateRange = now - issueDate <= 7 * 24 * 60 * 60 * 1000;
        } else if (filters.dateRange === 'month') {
          matchesDateRange =
            issueDate.getMonth() === now.getMonth() && issueDate.getFullYear() === now.getFullYear();
        } else if (filters.dateRange === 'year') {
          matchesDateRange = issueDate.getFullYear() === now.getFullYear();
        }

        return matchesSearch && matchesStatus && matchesDateRange;
      })
      .sort((a, b) => {
        const getSortValue = (certificate) => {
          if (sortBy === 'issueDate') return new Date(certificate.metadata?.issueDate || certificate.createdAt).getTime();
          if (sortBy === 'studentId') return certificate.studentId || '';
          if (sortBy === 'courseName') return certificate.courseName || '';
          return certificate.certificateId || '';
        };

        const valueA = getSortValue(a);
        const valueB = getSortValue(b);
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [allCertificates, filters, sortBy, sortOrder]);

  const paginatedCertificates = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredCertificates.slice(start, start + pagination.limit);
  }, [filteredCertificates, pagination]);

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / pagination.limit));

  useEffect(() => {
    if (pagination.page > totalPages) {
      setPagination((prev) => ({ ...prev, page: totalPages }));
    }
  }, [pagination.page, totalPages]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderPagination = () => (
    <div className="flex flex-col gap-4 border-t border-cyan/15 bg-slate-950/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-mono text-slate-400">
        Showing{' '}
        <span className="font-semibold text-cyan">
          {filteredCertificates.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
        </span>{' '}
        to{' '}
        <span className="font-semibold text-cyan">
          {Math.min(pagination.page * pagination.limit, filteredCertificates.length)}
        </span>{' '}
        of <span className="font-semibold text-cyan">{filteredCertificates.length}</span> certificates
      </p>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page === 1}
          className="btn-secondary text-xs px-3 py-1.5 font-mono"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5 mr-1 text-cyan" />
          Previous
        </button>
        <span className="text-xs font-mono text-slate-400">
          Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{totalPages}</strong>
        </span>
        <button
          type="button"
          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page === totalPages}
          className="btn-secondary text-xs px-3 py-1.5 font-mono"
        >
          Next
          <ChevronRightIcon className="h-3.5 w-3.5 ml-1 text-cyan" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Error loading certificates</h3>
          <p className="mt-2 text-sm">{error}</p>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button onClick={fetchCertificates} className="btn-primary" type="button">
            Try again
          </button>
          <Link to="/" className="btn-secondary">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="trust-hero relative overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-center">
          <div>
            <span className="status-chip status-chip-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              Certificate workspace
            </span>
            <h1 className="trust-title mt-4 text-3xl font-semibold md:text-4xl text-white">Certificate registry</h1>
            <p className="trust-muted mt-3 text-sm leading-6 text-slate-300">
              Review issued records, filter by status or date, and jump into each certificate’s trust
              details. The list is tuned for both desktop review and mobile lookup.
            </p>
          </div>

          <div className="hidden lg:block relative">
            <div className="w-full h-32 rounded-xl overflow-hidden border border-cyan/35 shadow-[0_0_24px_rgba(0,229,255,0.2)] relative">
              <img src={registryHeroImg} alt="Cryptographic Ledger Telemetry" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <span className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-wider text-cyan bg-slate-950/85 px-2.5 py-0.5 rounded border border-cyan/40 backdrop-blur-sm">
                Immutable Registry Telemetry
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
          <div className="trust-card p-3.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-cyan">Loaded</p>
            <p className="mt-1 text-2xl font-semibold text-white font-mono">{allCertificates.length}</p>
          </div>
          <div className="trust-card p-3.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-amber">Filtered</p>
            <p className="mt-1 text-2xl font-semibold text-white font-mono">{filteredCertificates.length}</p>
          </div>
        </div>
      </section>

      <div className="trust-table">
        <div className="border-b border-cyan/15 bg-slate-950/70 p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan/70" />
              <input
                type="text"
                placeholder="Search certificate ID, student, or course"
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
                className="input-field pl-10 bg-slate-900/90 text-white border-cyan/25 focus:border-cyan"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan/70" />
              <select
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
                className="input-field pl-10 bg-slate-900/90 text-white border-cyan/25 focus:border-cyan"
              >
                <option value="all">All status</option>
                <option value="valid">Valid only</option>
                <option value="revoked">Revoked only</option>
              </select>
            </div>

            <select
              value={filters.dateRange}
              onChange={(event) => handleFilterChange('dateRange', event.target.value)}
              className="input-field bg-slate-900/90 text-white border-cyan/25 focus:border-cyan"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>
        </div>

        {paginatedCertificates.length === 0 ? (
          <div className="trust-empty-state">
            <span className="trust-empty-icon"><MagnifyingGlassIcon /></span>
            <h3 className="trust-empty-title">No certificates found</h3>
            <p className="trust-empty-copy">Change the search, status, or date filters to reveal more certificate records.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-cyan/15">
                <thead className="bg-slate-950/90">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-mono font-semibold uppercase tracking-wider text-cyan">
                      <button type="button" onClick={() => handleSort('certificateId')} className="inline-flex items-center hover:text-white transition">
                        Certificate ID
                        <ArrowsUpDownIcon className="ml-1 h-3.5 w-3.5 text-cyan/70" />
                      </button>
                    </th>
                    {isAdminUser && (
                      <th className="px-6 py-3.5 text-left text-xs font-mono font-semibold uppercase tracking-wider text-cyan">
                        <button type="button" onClick={() => handleSort('studentId')} className="inline-flex items-center hover:text-white transition">
                          Student
                          <ArrowsUpDownIcon className="ml-1 h-3.5 w-3.5 text-cyan/70" />
                        </button>
                      </th>
                    )}
                    <th className="px-6 py-3.5 text-left text-xs font-mono font-semibold uppercase tracking-wider text-cyan">
                      <button type="button" onClick={() => handleSort('courseName')} className="inline-flex items-center hover:text-white transition">
                        Course
                        <ArrowsUpDownIcon className="ml-1 h-3.5 w-3.5 text-cyan/70" />
                      </button>
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-mono font-semibold uppercase tracking-wider text-cyan">
                      <button type="button" onClick={() => handleSort('issueDate')} className="inline-flex items-center hover:text-white transition">
                        Issue date
                        <ArrowsUpDownIcon className="ml-1 h-3.5 w-3.5 text-cyan/70" />
                      </button>
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-mono font-semibold uppercase tracking-wider text-cyan">Status</th>
                    <th className="px-6 py-3.5 text-right text-xs font-mono font-semibold uppercase tracking-wider text-cyan">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan/10 bg-slate-950/40">
                  {paginatedCertificates.map((certificate) => (
                    <tr key={certificate.certificateId} className="hover:bg-slate-900/60 transition duration-150">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-white">{certificate.certificateId}</td>
                      {isAdminUser && (
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <p className="font-semibold text-white">
                            {certificate.studentDetails?.fullName || certificate.metadata?.studentName || 'N/A'}
                          </p>
                          <p className="font-mono text-xs text-slate-400">{certificate.studentDetails?.studentNumber || certificate.studentId}</p>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-slate-200">
                        {certificate.academicRecord?.program || certificate.courseName}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">
                        {new Date(certificate.metadata?.issueDate || certificate.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ${
                            certificate.isValid 
                              ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 shadow-[0_0_12px_rgba(57,255,136,0.18)]' 
                              : 'bg-rose-400/10 text-rose-300 border border-rose-400/30 shadow-[0_0_12px_rgba(255,79,216,0.18)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${certificate.isValid ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {certificate.isValid ? 'Valid' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end items-center gap-3">
                          <Link to={`/certificates/${certificate.certificateId}`} className="font-mono text-xs font-semibold text-cyan hover:text-white uppercase tracking-wider">
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => downloadCertificate(certificate.certificateId)}
                            className="p-1 rounded text-amber hover:text-white hover:bg-amber/20 transition"
                            disabled={!certificate.isValid}
                            title="Download PDF"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          {isAdminUser && certificate.isValid && (
                            <button
                              type="button"
                              onClick={() => openRevokeModal(certificate)}
                              className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-500/20 transition"
                              title="Revoke certificate"
                            >
                              <NoSymbolIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {paginatedCertificates.map((certificate) => (
                <div key={certificate.certificateId} className="trust-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-mono font-semibold text-white">{certificate.certificateId}</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {certificate.academicRecord?.program || certificate.courseName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 font-mono">
                        {certificate.studentDetails?.fullName || certificate.metadata?.studentName || certificate.studentId}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ${
                        certificate.isValid 
                          ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30' 
                          : 'bg-rose-400/10 text-rose-300 border border-rose-400/30'
                      }`}
                    >
                      {certificate.isValid ? 'Valid' : 'Revoked'}
                    </span>
                  </div>

                  <div className="mt-3 text-xs font-mono text-slate-400">
                    Issued {new Date(certificate.metadata?.issueDate || certificate.createdAt).toLocaleDateString()}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link to={`/certificates/${certificate.certificateId}`} className="btn-secondary text-xs px-3 py-1.5 font-mono">
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => downloadCertificate(certificate.certificateId)}
                      className="btn-secondary text-xs px-3 py-1.5 font-mono text-amber"
                      disabled={!certificate.isValid}
                    >
                      Download
                    </button>
                    {isAdminUser && certificate.isValid && (
                      <button type="button" onClick={() => openRevokeModal(certificate)} className="btn-secondary text-xs px-3 py-1.5 font-mono text-rose-400">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {filteredCertificates.length > 0 && renderPagination()}
      </div>

      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-rose-500/40 shadow-[0_24px_70px_rgba(0,0,0,0.8),0_0_36px_rgba(244,63,94,0.15)] relative overflow-hidden bg-slate-950">
            {/* Top red accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Revoke certificate</h3>
                <p className="mt-1 font-mono text-xs text-rose-300">
                  {selectedCertificate?.certificateId} will be permanently marked invalid on the blockchain.
                </p>
              </div>
              <button type="button" onClick={closeRevokeModal} className="text-slate-400 hover:text-white p-1">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <label htmlFor="revoke-reason-list" className="form-label font-mono text-xs uppercase text-slate-300">
                Revocation reason
              </label>
              <textarea
                id="revoke-reason-list"
                rows={4}
                className="input-field mt-1.5 bg-slate-900 border-rose-500/30 text-white text-sm"
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                placeholder="Explain why this certificate is being revoked (recorded in immutable audit log)"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={closeRevokeModal} className="btn-secondary text-xs px-4 py-2 font-mono">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={revokeCertificate} 
                className="btn-primary text-xs px-4 py-2 font-mono bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-500/50 hover:from-rose-500 hover:to-rose-600" 
                disabled={isRevoking}
              >
                {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesList;
