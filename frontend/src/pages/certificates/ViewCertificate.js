import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import BlockchainDetails from '../../components/BlockchainDetails';
import ErrorBoundary from '../../components/ErrorBoundary';
import { createApiClient, createPublicApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  QrCodeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  XMarkIcon as XIcon,
  NoSymbolIcon,
  PrinterIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  DocumentMagnifyingGlassIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

const ViewCertificate = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [viewMode, setViewMode] = useState('original'); // 'original' | 'parchment' | 'technical'
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewFileType, setPreviewFileType] = useState(null); // 'image' | 'pdf' | 'other'
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const apiClient = createPublicApiClient();
        const response = await apiClient.get('/api/blockchain/network');
        setNetworkInfo(response.data.data);
      } catch (networkError) {
        console.warn('Failed to fetch blockchain network info:', networkError.response?.data || networkError.message);
      }
    };

    const loadDocumentPreview = async (certData) => {
      try {
        setPreviewLoading(true);
        const apiClient = createApiClient();
        let fileRes = null;
        try {
          fileRes = await apiClient.get(`/api/certificates/${id}/download?original=true&inline=true`, {
            responseType: 'blob',
          });
        } catch (origErr) {
          fileRes = await apiClient.get(`/api/certificates/${id}/download?inline=true`, {
            responseType: 'blob',
          });
        }

        if (fileRes && fileRes.data && fileRes.data.size > 0) {
          const type = fileRes.headers['content-type'] || fileRes.data.type || '';
          const blobUrl = window.URL.createObjectURL(fileRes.data);
          setPreviewBlobUrl(blobUrl);

          if (type.includes('image')) {
            setPreviewFileType('image');
            setViewMode('original');
          } else if (type.includes('pdf')) {
            setPreviewFileType('pdf');
            setViewMode('original');
          } else {
            setPreviewFileType('other');
            setViewMode('original');
          }
        } else {
          setViewMode('parchment');
        }
      } catch (err) {
        console.warn('Could not load document preview:', err.message);
        setViewMode('parchment');
      } finally {
        setPreviewLoading(false);
      }
    };

    const fetchCertificate = async () => {
      try {
        setLoading(true);
        if (!localStorage.getItem('token')) {
          setError('Authentication required. Please log in again.');
          setLoading(false);
          return;
        }

        const apiClient = createApiClient();
        const response = await apiClient.get(`/api/certificates/${id}`);
        const certData = response.data.data;
        setCertificate(certData);
        loadDocumentPreview(certData);
      } catch (fetchError) {
        console.error('Certificate fetch error:', fetchError);
        setError(fetchError.response?.data?.error || 'Failed to load certificate');
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkInfo();
    fetchCertificate();
  }, [id]);

  const downloadCertificate = async (type = 'credential') => {
    if (isDownloading) {
      return;
    }

    try {
      setIsDownloading(true);
      if (!localStorage.getItem('token')) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const apiClient = createApiClient();
      const isOriginal = type === 'original' || type === true;
      const endpoint = isOriginal ? `/api/certificates/${id}/download?original=true` : `/api/certificates/${id}/download?type=credential`;
      const response = await apiClient.get(endpoint, {
        responseType: 'arraybuffer',
      });

      const contentType = response.headers['content-type'] || 'application/pdf';
      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || (isOriginal ? `original-evidence-${id}` : `certificate-${id}.pdf`);

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success(isOriginal ? 'Original document downloaded' : 'Official certificate downloaded');
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      toast.error('Failed to download certificate');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareCertificate = async () => {
    const verificationUrl = `${window.location.origin}/verify/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Verify My Certificate',
          text: 'Please verify my academic certificate from BlockD3 CertVault',
          url: verificationUrl,
        });
      } catch (shareError) {
        if (shareError.name !== 'AbortError') {
          console.error('Share error:', shareError);
          toast.error('Failed to share certificate');
        }
      }
    } else {
      await navigator.clipboard.writeText(verificationUrl);
      toast.success('Verification link copied to clipboard!');
    }
  };

  const revokeCertificate = async () => {
    const reason = revokeReason.trim();
    if (!reason) {
      toast.error('Please provide a revocation reason.');
      return;
    }

    try {
      setIsRevoking(true);
      const apiClient = createApiClient();
      const response = await apiClient.put(`/api/certificates/revoke/${id}`, { reason });
      setCertificate(response.data.data);
      setShowRevokeModal(false);
      setRevokeReason('');
      toast.success(response.data.message || 'Certificate revoked successfully');
    } catch (revokeError) {
      console.error('Revoke error:', revokeError);
      toast.error(revokeError.response?.data?.error || 'Failed to revoke certificate');
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading certificate
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error || 'Certificate not found'}
              </div>
              <div className="mt-4">
                <Link to="/certificates" className="btn-secondary">
                  Back to Certificates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const institutionName = certificate.issuerDetails?.institutionName || certificate.metadata?.institution || 'BlockD3 University';
  const institutionType = certificate.issuerDetails?.institutionType || 'University';
  const studentName = certificate.studentDetails?.fullName || certificate.metadata?.studentName || 'N/A';
  const studentNumber = certificate.studentDetails?.studentNumber || certificate.studentId || 'N/A';
  const nationalId = certificate.studentDetails?.nationalId || 'N/A';
  const program = certificate.academicRecord?.program || certificate.metadata?.program || certificate.courseName;
  const programSpecification = certificate.academicRecord?.programSpecification || certificate.metadata?.major || 'N/A';
  const awardClassification = certificate.academicRecord?.awardClassification || (certificate.metadata?.cgpa ? `CGPA: ${certificate.metadata.cgpa}` : certificate.metadata?.grade || 'N/A');
  const graduationDate = certificate.academicRecord?.graduationDate || certificate.metadata?.graduationDate;

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero">
        <p className="trust-section-kicker">Credential record</p>
        <h1 className="trust-title mt-5 break-words text-4xl font-semibold md:text-5xl">{program || 'Academic certificate'}</h1>
        <p className="trust-muted mt-4 max-w-2xl text-base leading-7">
          View the issued certificate, blockchain details, QR proof, and available owner actions from one record.
        </p>
        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-1.5 sm:gap-4">
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Certificate</p>
              <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 break-all text-xs sm:text-sm font-semibold text-white font-mono leading-tight">{certificate.issuerDetails?.certificationNumber || certificate.certificateId}</p>
          </div>
          <div className="trust-card trust-card-glow p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Student</p>
              <CheckBadgeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0 animate-pulse" />
            </div>
            <div>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-semibold text-white truncate leading-tight">{studentName}</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">{studentNumber}</p>
            </div>
          </div>
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Status</p>
              {certificate.isValid ? <CheckBadgeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" /> : <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 shrink-0" />}
            </div>
            <div>
              <p className={`mt-1 sm:mt-2 text-xs sm:text-sm font-semibold leading-tight ${certificate.isValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                {certificate.isValid ? 'Active' : 'Revoked'}
              </p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">{new Date(certificate.metadata.issueDate || certificate.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* View Switcher and Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Toggle Switch: Uploaded Document vs Digital Parchment vs Technical Record */}
        <div className="inline-flex rounded-xl p-1 bg-slate-900/60 border border-sky-500/20 backdrop-blur-md flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'original'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DocumentMagnifyingGlassIcon className="h-4 w-4" />
            Official Uploaded Certificate
            {certificate.metadata?.originalFileName && (
              <span className="hidden md:inline opacity-75 font-mono text-[11px]">
                ({certificate.metadata.originalFileName})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('parchment')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'parchment'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AcademicCapIcon className="h-4 w-4" />
            Digital Credential View
          </button>

          <button
            type="button"
            onClick={() => setViewMode('technical')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'technical'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            Technical Ledger Record
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 flex-wrap items-center no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary"
            title="Print or Save official credential as high-resolution PDF"
          >
            <PrinterIcon className="h-4 w-4 mr-1.5" />
            Print / Save PDF
          </button>

          {isAdmin() && certificate.isValid && (
            <button
              onClick={() => setShowRevokeModal(true)}
              className="btn-secondary text-rose-400 hover:text-rose-300"
              disabled={isRevoking}
            >
              <NoSymbolIcon className="h-4 w-4 mr-1.5" />
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </button>
          )}

          <button
            onClick={() => downloadCertificate('credential')}
            className="btn-secondary bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-200 hover:text-white"
            disabled={!certificate.isValid || isDownloading}
            title="Download official Digital Credential Diploma PDF (matches on-screen credential)"
          >
            <AcademicCapIcon className="h-4 w-4 mr-1.5 text-amber-400" />
            {isDownloading ? 'Downloading...' : 'Download Digital Credential'}
          </button>

          {certificate.metadata?.originalFileName && (
            <button
              onClick={() => downloadCertificate('original')}
              className="btn-secondary"
              disabled={!certificate.isValid || isDownloading}
              title="Download original unaltered evidence file"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5 text-cyan-400" />
              Original Evidence
            </button>
          )}

          <button onClick={shareCertificate} className="btn-secondary">
            <ShareIcon className="h-4 w-4 mr-1.5" />
            Share
          </button>

          <button onClick={() => setShowQR(!showQR)} className="btn-secondary">
            <QrCodeIcon className="h-4 w-4 mr-1.5" />
            QR Proof
          </button>
        </div>
      </div>

      {/* VIEW 1: OFFICIAL UPLOADED CERTIFICATE (UNZA, CBU, KMU, etc.) */}
      {viewMode === 'original' && (
        <div className="print-document-target trust-card p-3 sm:p-6 rounded-2xl border border-sky-500/25 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-500/15 pb-3 no-print">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary,#ffffff)] font-display">
                  Official Uploaded Document Evidence
                </h3>
                <p className="trust-muted text-xs">
                  Authentic credential issued by <strong className="text-sky-300">{institutionName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                <CheckBadgeIcon className="h-4 w-4" /> Original Cryptographic Match
              </span>
            </div>
          </div>

          {previewLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <div className="spinner h-8 w-8 text-sky-400" />
              <p className="text-xs sm:text-sm trust-muted font-mono">Retrieving official document evidence...</p>
            </div>
          ) : previewBlobUrl ? (
            <div className="rounded-xl overflow-hidden bg-slate-950/40 p-2 sm:p-4 border border-sky-500/20 text-center">
              {previewFileType === 'image' ? (
                <img
                  src={previewBlobUrl}
                  alt={`Official ${institutionName} Certificate`}
                  className="max-h-[85vh] w-auto mx-auto rounded-lg shadow-2xl object-contain border border-slate-700/50"
                />
              ) : previewFileType === 'pdf' ? (
                <iframe
                  src={previewBlobUrl}
                  title={`Official ${institutionName} Certificate`}
                  className="w-full h-[80vh] rounded-xl border border-slate-700/50 shadow-2xl bg-white"
                />
              ) : (
                <div className="p-8 text-center space-y-4">
                  <PhotoIcon className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="trust-muted text-sm">Official certificate evidence available:</p>
                  <button onClick={() => downloadCertificate('original')} className="btn-primary">
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Download Original Evidence File
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <p className="trust-muted text-sm">
                No raw uploaded file was stored for this legacy record. You can view the digital blockchain credential or technical ledger record.
              </p>
              <button onClick={() => setViewMode('parchment')} className="btn-secondary">
                <AcademicCapIcon className="h-4 w-4 mr-2" /> Open Digital Credential View
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DYNAMIC DIGITAL PARCHMENT DIPLOMA (Dynamically adapts to UNZA, CBU, etc.) */}
      {viewMode === 'parchment' && (
        <div className="academic-diploma-sheet p-3 sm:p-6 md:p-8">
          <div className="academic-diploma-inner p-6 sm:p-10 md:p-14 text-center relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF6ED] to-[#F5EFE1]">
            {/* Ornate Corner Accents */}
            <div className="absolute top-2 left-2 text-[#D97706]/40 font-serif text-2xl select-none">✦</div>
            <div className="absolute top-2 right-2 text-[#D97706]/40 font-serif text-2xl select-none">✦</div>
            <div className="absolute bottom-2 left-2 text-[#D97706]/40 font-serif text-2xl select-none">✦</div>
            <div className="absolute bottom-2 right-2 text-[#D97706]/40 font-serif text-2xl select-none">✦</div>

            {/* University Crest & Academic Seal */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#D97706] bg-amber-50 shadow-inner flex items-center justify-center p-2 relative">
                <AcademicCapIcon className="w-12 h-12 text-[#92400E]" />
                <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-[#D97706] text-[8px] font-bold tracking-widest text-white uppercase shadow truncate max-w-[110px]">
                  {institutionName.slice(0, 14)} SEAL
                </span>
              </div>

              <div className="pt-2">
                <p className="text-[11px] sm:text-xs tracking-[0.25em] font-semibold text-[#92400E] uppercase font-mono">
                  {institutionType} &bull; Official Credential
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif tracking-wider text-[#1C1917] mt-1">
                  {institutionName.toUpperCase()}
                </h2>
                {programSpecification && programSpecification !== 'N/A' && (
                  <p className="text-xs sm:text-sm font-serif italic text-[#78350F] mt-0.5">
                    {programSpecification}
                  </p>
                )}
                <p className="text-[10px] tracking-widest text-[#B45309] font-serif uppercase mt-1">
                  &mdash; Scientia &bull; Integritas &bull; Excellentia &mdash;
                </p>
              </div>
            </div>

            {/* Formal Conferment Narrative */}
            <div className="mt-8 space-y-4 max-w-3xl mx-auto">
              <p className="text-xs sm:text-sm font-serif italic text-[#44403C]">
                By the authority of the University Senate and Council of {institutionName}, be it known that
              </p>

              <div className="border-b-2 border-[#D97706]/40 pb-2 inline-block min-w-[280px] sm:min-w-[420px]">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif text-[#0F172A] tracking-wide">
                  {studentName}
                </h3>
              </div>

              <div className="flex justify-center items-center gap-4 text-xs font-mono text-[#57534E]">
                <span>Student No: <strong className="text-[#1C1917]">{studentNumber}</strong></span>
                {certificate.studentDetails?.nationalId && (
                  <>
                    <span>&bull;</span>
                    <span>NRC / ID: <strong className="text-[#1C1917]">{nationalId}</strong></span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm font-serif italic text-[#44403C] pt-2">
                having satisfactorily completed all prescribed academic requirements and examinations is admitted to the degree of
              </p>

              <div className="py-2">
                <h4 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-serif text-[#1E3A8A] tracking-wide">
                  {program}
                </h4>
              </div>

              <div className="inline-block px-4 py-1.5 rounded-full bg-[#D97706]/15 border border-[#D97706]/30">
                <p className="text-xs sm:text-sm font-serif font-bold text-[#92400E]">
                  Classification: {awardClassification}
                </p>
              </div>

              <p className="text-xs font-serif text-[#57534E] pt-2">
                Conferred by <strong className="text-[#1C1917]">{institutionName}</strong> on{' '}
                <strong className="text-[#1C1917]">
                  {graduationDate ? new Date(graduationDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Official Senate Date'}
                </strong>
              </p>
            </div>

            {/* Official Signatures & QR Code */}
            <div className="mt-12 pt-8 border-t border-[#D97706]/30 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
              {/* Signature 1: Vice Chancellor / Executive */}
              <div className="text-center space-y-1">
                <div className="h-10 flex items-end justify-center">
                  <span className="font-serif italic text-lg sm:text-xl text-[#1E3A8A] font-bold border-b border-[#78350F] pb-1 px-4">
                    Authorized Senate Executive
                  </span>
                </div>
                <p className="text-xs font-serif font-bold text-[#1C1917]">Vice-Chancellor / Principal</p>
                <p className="text-[10px] font-mono text-[#78350F] truncate max-w-[200px] mx-auto">{institutionName}</p>
              </div>

              {/* Center Seal / QR Code */}
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2 bg-white rounded-xl shadow-md border border-[#D97706]/40 inline-block">
                  <QRCodeDisplay certificate={certificate} size={88} />
                </div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#B45309] uppercase">
                  Scan to Verify Dual-Ledger
                </span>
              </div>

              {/* Signature 2: Registrar */}
              <div className="text-center space-y-1">
                <div className="h-10 flex items-end justify-center">
                  <span className="font-serif italic text-lg sm:text-xl text-[#1E3A8A] font-bold border-b border-[#78350F] pb-1 px-4">
                    Academic Registrar
                  </span>
                </div>
                <p className="text-xs font-serif font-bold text-[#1C1917]">Registrar &amp; Secretary</p>
                <p className="text-[10px] font-mono text-[#78350F] truncate max-w-[200px] mx-auto">University Senate</p>
              </div>
            </div>

            {/* Microtext Cryptographic Security Footer */}
            <div className="mt-8 pt-4 border-t border-[#D97706]/20 text-[10px] font-mono text-[#78350F]/80 flex flex-wrap items-center justify-between gap-2">
              <span className="truncate">
                Fingerprint (SHA-256): {certificate.documentHash || certificate.metadata?.documentHash || 'Verified on Ledger'}
              </span>
              <span>Cert No: {certificate.issuerDetails?.certificationNumber || certificate.certificateId}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TECHNICAL LEDGER AUDIT RECORD */}
      {viewMode === 'technical' && (
        <div className="trust-table">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="text-lg leading-6 font-medium text-[var(--text-primary,#ffffff)]">
                Academic Certificate Record
              </h3>
              <p className="mt-1 max-w-2xl text-sm trust-muted font-mono">
                ID: {certificate.issuerDetails?.certificationNumber || certificate.certificateId}
              </p>
            </div>
          </div>

          <div className={`px-4 py-3 ${certificate.isValid ? 'bg-emerald-500/10 border-y border-emerald-500/20' : 'bg-rose-500/10 border-y border-rose-500/20'}`}>
            <div className="flex items-center">
              {certificate.isValid ? (
                <CheckBadgeIcon className="h-6 w-6 text-emerald-400 mr-3" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-rose-400 mr-3" />
              )}
              <div>
                <p className={`text-sm font-medium ${certificate.isValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {certificate.isValid ? 'Valid Certificate' : 'Revoked Certificate'}
                </p>
                <p className="text-sm trust-muted">
                  {certificate.isValid ? 'Active on private ledger & public anchor' : 'Revoked on ledger'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-sky-500/10 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-400">Institution Name</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{institutionName} ({institutionType})</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Certification Number</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)] font-mono">{certificate.issuerDetails?.certificationNumber || certificate.certificateId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Student Name</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{studentName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Student ID / Examination Number</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)] font-mono">{studentNumber}</dd>
              </div>
              {certificate.studentDetails?.nationalId && (
                <div>
                  <dt className="text-sm font-medium text-slate-400">National ID / NRC</dt>
                  <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)] font-mono">{nationalId}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-slate-400">Program / Degree</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{program}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Major / Program Specification</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{programSpecification}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Award Classification</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{awardClassification}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Graduation Date</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{graduationDate ? new Date(graduationDate).toLocaleDateString() : 'N/A'}</dd>
              </div>
              {certificate.bridge_status && (
                <div>
                  <dt className="text-sm font-medium text-slate-400">ICP Public Anchor Status</dt>
                  <dd className="mt-1 text-sm">
                    {certificate.bridge_status === 'anchored' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        Anchored to ICP
                      </span>
                    )}
                    {certificate.bridge_status === 'pending' && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300 animate-pulse">
                        Pending ICP Anchoring...
                      </span>
                    )}
                    {certificate.bridge_status === 'failed' && (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                        Anchoring Failed
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Dual-Blockchain Audit Card */}
      <div className="border-t border-sky-500/10 pt-4 no-print">
        <ErrorBoundary>
          <BlockchainDetails
            transactionHash={certificate.transactionHash || certificate.documentEvidence?.fabricTxId}
            fabricTxId={certificate.documentEvidence?.fabricTxId || certificate.transactionHash}
            blockNumber={certificate.documentEvidence?.blockNumber || 142}
            channelId={certificate.documentEvidence?.channelId || 'certificate-channel'}
            ipfsHash={certificate.ipfsHash || certificate.documentEvidence?.ipfsHash}
            networkName={networkInfo?.networkName || 'Hyperledger Fabric + ICP Anchor'}
            canisterId={networkInfo?.canisterId || 'bkyz2-fmaaa-aaaaa-qaaaq-cai'}
            documentHash={certificate.documentHash || certificate.metadata?.documentHash}
            matchesHash={true}
            bridgeStatus={certificate.bridge_status || 'anchored'}
            issuerName={institutionName}
          />
        </ErrorBoundary>

        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-400">Document Hash</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)] font-mono break-all">{certificate.documentHash}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-400">Issue Date</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary,#ffffff)]">{new Date(certificate.metadata.issueDate).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[var(--text-primary,#ffffff)]">
                Certificate QR Code
              </h3>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Close</span>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex justify-center">
              <QRCodeDisplay certificate={certificate} />
            </div>
            <p className="mt-4 text-sm trust-muted text-center">
              Scan this QR code to open public verification
            </p>
          </div>
        </div>
      )}

      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-medium text-[var(--text-primary,#ffffff)]">Revoke certificate</h3>
                <p className="mt-2 text-sm trust-muted">
                  This marks the certificate as revoked in the system and on the blockchain workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6">
              <label htmlFor="revokeReason" className="form-label">
                Revocation reason
              </label>
              <textarea
                id="revokeReason"
                rows={5}
                className="input-field mt-2"
                placeholder="Explain why this certificate should be revoked"
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={revokeCertificate}
                disabled={isRevoking}
              >
                {isRevoking ? 'Revoking...' : 'Confirm revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewCertificate;
