import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import { createApiClient } from '../../lib/apiClient';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const parseCertificateIds = (input) => {
  const rawIds = input
    .split(/[\n,\t; ]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  return [...new Set(rawIds)];
};

const extractCertificateId = (rawValue) => {
  const value = rawValue?.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      return parsed.certificateId || parsed.id || '';
    } catch (error) {
      return '';
    }
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const verifyIndex = pathParts.indexOf('verify');
      if (verifyIndex !== -1 && pathParts[verifyIndex + 1]) {
        return pathParts[verifyIndex + 1];
      }
      return url.searchParams.get('certificateId') || '';
    } catch (error) {
      return '';
    }
  }

  return value;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const getStudentName = (cert) => {
  if (!cert) return '-';
  return cert.studentDetails?.fullName || cert.metadata?.studentName || cert.studentName || '-';
};

const getCourseName = (cert) => {
  if (!cert) return '-';
  return cert.academicRecord?.program || cert.metadata?.program || cert.courseName || '-';
};

const getInstitutionName = (cert) => {
  if (!cert) return '-';
  return cert.issuerDetails?.institutionName || cert.metadata?.institution || '-';
};

const BatchVerifyCertificates = () => {
  const [inputValue, setInputValue] = useState('');
  const [certificateIds, setCertificateIds] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [lastDecodedFiles, setLastDecodedFiles] = useState([]);

  const exportCsv = () => {
    if (!results.length) {
      toast.error('No results available to export.');
      return;
    }

    const header = ['certificateId', 'status', 'studentName', 'courseName', 'institutionName', 'verificationDate', 'error'];
    const rows = results.map((item) => [
      item.certificateId || '',
      item.isValid ? 'valid' : item.success ? 'invalid' : 'failed',
      getStudentName(item.certificate),
      getCourseName(item.certificate),
      getInstitutionName(item.certificate),
      item.verificationDate || '',
      item.error || '',
    ]);

    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csvContent = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `batch-verification-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!results.length) {
      toast.error('No results available to export.');
      return;
    }

    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {
      toast.error('Pop-up blocked. Allow pop-ups to export PDF.');
      return;
    }

    const rowsMarkup = results
      .map(
        (item) => `
          <tr>
            <td>${item.certificateId || ''}</td>
            <td>${item.isValid ? 'Valid' : item.success ? 'Invalid' : 'Failed'}</td>
            <td>${getStudentName(item.certificate)}</td>
            <td>${getCourseName(item.certificate)}</td>
            <td>${getInstitutionName(item.certificate)}</td>
            <td>${item.verificationDate ? new Date(item.verificationDate).toLocaleString() : '-'}</td>
            <td>${item.error || '-'}</td>
          </tr>`
      )
      .join('');

    popup.document.write(`
      <html>
        <head>
          <title>Batch Verification Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { margin-bottom: 6px; }
            p { color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.04em; }
          </style>
        </head>
        <body>
          <h1>Batch Verification Report</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
          <p>Total: ${summary.total} | Valid: ${summary.valid} | Invalid: ${summary.invalid} | Failed: ${summary.failed}</p>
          <table>
            <thead>
              <tr>
                <th>Certificate ID</th>
                <th>Status</th>
                <th>Student</th>
                <th>Course</th>
                <th>Institution</th>
                <th>Checked At</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleIdsChange = (value) => {
    setInputValue(value);
    setCertificateIds(parseCertificateIds(value));
    setError('');
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const content = String(loadEvent.target?.result || '');
        handleIdsChange(content);
      } catch (fileError) {
        console.error('Batch verification file parse error:', fileError);
        setError('Failed to parse the uploaded file.');
      }
    };
    reader.onerror = () => setError('Failed to read the uploaded file.');
    reader.readAsText(selectedFile);
  };

  const decodeQrFiles = async (files) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'));

    if (!imageFiles.length) {
      toast.error('Upload one or more QR screenshots as image files.');
      return;
    }

    try {
      setScanLoading(true);
      setError('');

      const decodedEntries = await Promise.all(
        imageFiles.map(async (file) => {
          try {
            const dataUrl = await readFileAsDataUrl(file);
            const image = await loadImage(dataUrl);
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            const certificateId = extractCertificateId(code?.data || '');
            return {
              fileName: file.name,
              certificateId,
            };
          } catch (decodeError) {
            return {
              fileName: file.name,
              certificateId: '',
            };
          }
        })
      );

      const decodedIds = decodedEntries
        .map((entry) => entry.certificateId)
        .filter(Boolean);

      if (!decodedIds.length) {
        toast.error('No readable certificate QR codes were found in the uploaded images.');
        setLastDecodedFiles(decodedEntries);
        return;
      }

      const mergedIds = [...new Set([...certificateIds, ...decodedIds])];
      const mergedValue = mergedIds.join('\n');
      setInputValue(mergedValue);
      setCertificateIds(mergedIds);
      setLastDecodedFiles(decodedEntries);

      const unreadableCount = decodedEntries.length - decodedIds.length;
      toast.success(
        unreadableCount > 0
          ? `Decoded ${decodedIds.length} QR codes. ${unreadableCount} image(s) were skipped.`
          : `Decoded ${decodedIds.length} QR codes successfully.`
      );
    } catch (scanError) {
      console.error('Batch QR decode error:', scanError);
      setError('Failed to process uploaded QR screenshots.');
      toast.error('Batch QR decoding failed');
    } finally {
      setScanLoading(false);
      setIsDropActive(false);
    }
  };

  const handleQrFileChange = async (event) => {
    await decodeQrFiles(event.target.files);
  };

  const handleQrDrop = async (event) => {
    event.preventDefault();
    setIsDropActive(false);
    await decodeQrFiles(event.dataTransfer.files);
  };

  const runBatchVerification = async () => {
    if (certificateIds.length === 0) {
      setError('Add at least one certificate ID to verify.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const apiClient = createApiClient();
      const response = await apiClient.post('/api/batch/certificates/verify', {
        certificateIds,
      });

      const verificationResults = response.data.data || [];
      setResults(verificationResults);

      const validCount = verificationResults.filter((item) => item.isValid).length;
      toast.success(`Verified ${verificationResults.length} certificates. ${validCount} valid.`);
    } catch (requestError) {
      console.error('Batch verification error:', requestError);
      setError(requestError.response?.data?.error || 'Failed to verify certificates.');
      toast.error('Rapid verification failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setInputValue('');
    setCertificateIds([]);
    setResults([]);
    setError('');
    setSearch('');
    setResultFilter('all');
  };

  const summary = useMemo(() => {
    const total = results.length;
    const valid = results.filter((item) => item.isValid).length;
    const invalid = results.filter((item) => item.success && !item.isValid).length;
    const failed = results.filter((item) => !item.success).length;

    return { total, valid, invalid, failed };
  }, [results]);

  const filteredResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return results.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.certificateId?.toLowerCase().includes(normalizedSearch) ||
        getStudentName(item.certificate).toLowerCase().includes(normalizedSearch) ||
        getCourseName(item.certificate).toLowerCase().includes(normalizedSearch) ||
        getInstitutionName(item.certificate).toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        resultFilter === 'all' ||
        (resultFilter === 'valid' && item.isValid) ||
        (resultFilter === 'invalid' && item.success && !item.isValid) ||
        (resultFilter === 'failed' && !item.success);

      return matchesSearch && matchesFilter;
    });
  }, [results, resultFilter, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="tech-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="status-chip">Rapid verification lane</span>
            <h1 className="mt-4 text-3xl font-semibold text-gray-900">
              Multiple certificate verification
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Paste, upload, or queue many certificate IDs at once and validate them against the
              blockchain-backed record without stepping through one by one.
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Queued IDs</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{certificateIds.length}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last run</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="tech-card p-6">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-medium text-gray-900">Verification queue</h2>
              <p className="text-sm text-gray-500">
                One per line, or paste comma-separated IDs. Duplicates are removed automatically.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <label htmlFor="certificate-batch-input" className="form-label">
                Certificate IDs
              </label>
              <textarea
                id="certificate-batch-input"
                rows={14}
                className="input-field"
                placeholder="cert-001&#10;cert-002&#10;cert-003"
                value={inputValue}
                onChange={(event) => handleIdsChange(event.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-6 text-center">
                <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-3 text-sm text-gray-600">
                  Upload a `.txt` or `.csv` list of certificate IDs.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                  Select file
                  <input
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDropActive
                    ? 'border-primary-500 bg-primary-50/40'
                    : 'border-gray-300 bg-gray-50/70'
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDropActive(true);
                }}
                onDragLeave={() => setIsDropActive(false)}
                onDrop={handleQrDrop}
              >
                <PhotoIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  Decode QR screenshots in bulk
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Drop multiple certificate QR images here and extract IDs into the queue.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                  {scanLoading ? 'Decoding...' : 'Select images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleQrFileChange}
                  />
                </label>
                {lastDecodedFiles.length > 0 && (
                  <div className="mt-4 rounded-xl bg-white/80 p-3 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Latest QR import
                    </p>
                    <div className="mt-2 space-y-2">
                      {lastDecodedFiles.slice(0, 4).map((entry) => (
                        <div key={entry.fileName} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate text-gray-600">{entry.fileName}</span>
                          <span className={entry.certificateId ? 'text-green-600' : 'text-rose-600'}>
                            {entry.certificateId || 'Unreadable'}
                          </span>
                        </div>
                      ))}
                      {lastDecodedFiles.length > 4 && (
                        <p className="text-xs text-gray-500">
                          +{lastDecodedFiles.length - 4} more image(s)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ready to verify</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{certificateIds.length}</p>
                <p className="mt-2 text-sm text-gray-500">
                  Rapid verification works best with cleaned, unique IDs.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={runBatchVerification}
                  disabled={loading}
                  className="btn-primary"
                  type="button"
                >
                  {loading ? (
                    <>
                      <div className="spinner h-5 w-5 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Run verification
                    </>
                  )}
                </button>

                <button onClick={clearSession} type="button" className="btn-secondary">
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Clear session
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="tech-card p-6">
            <h2 className="text-lg sm:text-xl font-medium text-white">Result summary</h2>
            <div className="mt-3 sm:mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="glass-panel rounded-xl p-2.5 sm:p-4">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
                <p className="mt-1 text-xl sm:text-3xl font-semibold text-white">{summary.total}</p>
              </div>
              <div className="glass-panel rounded-xl p-2.5 sm:p-4 border-l-4 border-emerald-500">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-emerald-400">Valid</p>
                <p className="mt-1 text-xl sm:text-3xl font-semibold text-emerald-300">{summary.valid}</p>
              </div>
              <div className="glass-panel rounded-xl p-2.5 sm:p-4 border-l-4 border-amber-500">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-amber-400">Invalid</p>
                <p className="mt-1 text-xl sm:text-3xl font-semibold text-amber-300">{summary.invalid}</p>
              </div>
              <div className="glass-panel rounded-xl p-2.5 sm:p-4 border-l-4 border-rose-500">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-rose-400">Failed</p>
                <p className="mt-1 text-xl sm:text-3xl font-semibold text-rose-300">{summary.failed}</p>
              </div>
            </div>
          </div>

          <div className="tech-card p-6">
            <h2 className="text-xl font-medium text-[var(--text-primary,#ffffff)]">Operator notes</h2>
            <ul className="mt-4 space-y-3 text-sm trust-muted">
              <li>Use this lane when you already have certificate IDs from HR, admissions, or an uploaded register.</li>
              <li>Valid results confirm the stored hash path on the blockchain-backed ledger.</li>
              <li>Failed results usually mean missing IDs, revoked entries, or inaccessible records.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="tech-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-medium text-[var(--text-primary,#ffffff)]">Verification results</h2>
            <p className="text-sm trust-muted">
              Filter the current run and jump directly into a certificate record when needed.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button type="button" onClick={exportCsv} className="btn-secondary" disabled={!results.length}>
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>

            <button type="button" onClick={exportPdf} className="btn-secondary" disabled={!results.length}>
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export PDF
            </button>

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search result set"
                className="input-field pl-10"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All results</option>
                <option value="valid">Valid</option>
                <option value="invalid">Invalid</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="trust-empty-state mt-6">
            <span className="trust-empty-icon"><ClipboardDocumentListIcon /></span>
            <h3 className="trust-empty-title">No verification results</h3>
            <p className="trust-empty-copy">Run a batch verification to generate valid, invalid, and failed result rows.</p>
          </div>
        ) : (
          <>
          <div className="mt-6 hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Certificate ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student / Course / Institution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Checked at
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredResults.map((result, index) => (
                  <tr key={`${result.certificateId}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {result.certificateId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.isValid ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircleIcon className="mr-1 h-4 w-4" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                          <XCircleIcon className="mr-1 h-4 w-4" />
                          {result.success ? 'Invalid' : 'Failed'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result.certificate ? (
                        <>
                          <p className="font-medium text-gray-900">{getStudentName(result.certificate)}</p>
                          <p>{getCourseName(result.certificate)}</p>
                          <p className="text-xs text-gray-400">{getInstitutionName(result.certificate)}</p>
                        </>
                      ) : (
                        result.error || 'No certificate details returned'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.verificationDate
                        ? new Date(result.verificationDate).toLocaleString()
                        : 'Completed'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {result.isValid ? (
                        <Link
                          to={`/certificates/${result.certificateId}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View certificate
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-3 md:hidden">
            {filteredResults.map((result, index) => (
              <div key={`${result.certificateId}-${index}`} className="glass-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{result.certificateId}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {result.certificate ? `${getStudentName(result.certificate)} · ${getCourseName(result.certificate)} (${getInstitutionName(result.certificate)})` : (result.error || 'No certificate details returned')}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {result.verificationDate ? new Date(result.verificationDate).toLocaleString() : 'Completed'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${result.isValid ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                    {result.isValid ? 'Valid' : result.success ? 'Invalid' : 'Failed'}
                  </span>
                </div>
                {result.isValid && (
                  <div className="mt-4">
                    <Link
                      to={`/certificates/${result.certificateId}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      View certificate
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatchVerifyCertificates;
