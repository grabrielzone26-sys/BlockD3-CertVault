import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../config/api';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  FolderArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const BatchDownloadCertificates = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [certificateIds, setCertificateIds] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const ids = event.target.result
            .split('\n')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);

          setCertificateIds(ids);
          setError(null);
        } catch (err) {
          setError('Failed to parse the file. Please check the format.');
          setCertificateIds([]);
        }
      };
      reader.onerror = () => {
        setError('Error reading the file.');
        setCertificateIds([]);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleTextAreaChange = (e) => {
    const ids = e.target.value
      .split('\n')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    setCertificateIds(ids);
  };

  const processBatchDownload = async () => {
    if (certificateIds.length === 0) {
      setError('Please enter at least one certificate ID to download');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      const apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await apiClient.post('/api/batch/certificates/download', { certificateIds });

      if (!response.data.data || !response.data.data.length) {
        throw new Error('No certificates found for download');
      }

      let successCount = 0;
      let failCount = 0;

      for (const urlInfo of response.data.data) {
        if (!urlInfo.downloadUrl) {
          failCount++;
          console.error(`No URL available for certificate ${urlInfo.certificateId}`);
          continue;
        }

        try {
          const downloadClient = axios.create({
            baseURL: API_BASE_URL,
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          });

          const downloadResponse = await downloadClient.get(urlInfo.downloadUrl);
          const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `certificate-${urlInfo.certificateId}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          successCount++;
        } catch (err) {
          console.error(`Failed to download certificate ${urlInfo.certificateId}:`, err);
          failCount++;
        }
      }

      toast.success(`Successfully downloaded ${successCount} of ${response.data.data.length} certificates`);
      if (failCount > 0) {
        toast.warning(`Failed to download ${failCount} certificates`);
      }
    } catch (err) {
      console.error('Batch download error:', err);
      setError(err.response?.data?.error || 'Failed to download certificates');
      toast.error('Certificate batch download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trust-dashboard space-y-10">
      <section className="trust-hero">
        <p className="trust-section-kicker">Download control plane</p>
        <h1 className="trust-title mt-5 text-4xl font-semibold md:text-5xl">Queue. Resolve. Download.</h1>
        <p className="trust-muted mt-4 max-w-2xl text-base leading-7">
          Paste or upload certificate IDs, then let the system resolve each accessible certificate into
          a downloadable PDF.
        </p>
        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-1.5 sm:gap-4">
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Queue</p>
              <ClipboardDocumentListIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">ID Queue</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">{certificateIds.length} loaded</p>
            </div>
          </div>
          <div className="trust-card trust-card-glow p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Export</p>
              <FolderArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">Batch</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">PDF bundles</p>
            </div>
          </div>
          <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
            <div className="flex items-center justify-between">
              <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Security</p>
              <DocumentArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">Permission</p>
              <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">RBAC control</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="trust-table">
          <div className="border-b border-sky-500/10 p-5">
            <p className="trust-section-kicker">Input manifest</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Certificate IDs</h2>
            <p className="trust-muted mt-2 text-sm">Enter one certificate ID per line or upload a text file.</p>
          </div>

          <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <label htmlFor="certificateIds" className="form-label">Certificate IDs</label>
              <textarea
                id="certificateIds"
                rows={14}
                className="input-field mt-2"
                placeholder="Enter certificate IDs, one per line"
                onChange={handleTextAreaChange}
                value={certificateIds.join('\n')}
              />
            </div>

            <div className="space-y-5">
              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-sky-400/30 bg-slate-950/30 p-8 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
                <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-cyan-300" />
                <span className="mt-4 block text-sm font-semibold text-white">Upload TXT manifest</span>
                <span className="trust-muted mt-2 block text-sm">One certificate ID per line.</span>
                <input type="file" className="sr-only" accept=".txt" onChange={handleFileChange} />
              </label>

              <div className="trust-card">
                <p className="trust-section-kicker">Ready</p>
                <p className="mt-3 text-3xl font-semibold text-white">{certificateIds.length}</p>
                <p className="trust-muted mt-2 text-sm">certificate {certificateIds.length === 1 ? 'ID' : 'IDs'} queued</p>
              </div>

              {error && (
                <div className="flex gap-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-100">
                  <XCircleIcon className="h-5 w-5 flex-none" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-sky-500/10 p-5 text-right">
            <button onClick={processBatchDownload} disabled={loading || certificateIds.length === 0} className="btn-primary" type="button">
              {loading ? 'Downloading...' : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download certificates
                </>
              )}
            </button>
          </div>
        </div>

        <aside className="trust-card">
          <p className="trust-section-kicker">Download notes</p>
          <h2 className="trust-title mt-3 text-xl font-semibold">What happens next</h2>
          <div className="mt-5 space-y-4">
            {[
              'The system asks the API for downloadable records matching your IDs.',
              'Each certificate is saved as a separate PDF file.',
              'Your browser may ask for permission when many files download at once.',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-sky-500/15 bg-slate-950/30 p-4">
                <ExclamationTriangleIcon className="h-5 w-5 flex-none text-cyan-300" />
                <p className="trust-muted text-sm">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
};

export default BatchDownloadCertificates;
