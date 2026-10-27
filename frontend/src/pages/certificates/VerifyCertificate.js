import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import BlockchainDetails from '../../components/BlockchainDetails';
import ErrorBoundary from '../../components/ErrorBoundary';
import NetworkBackdrop from '../../components/visuals/NetworkBackdrop';
import { createPublicApiClient } from '../../lib/apiClient';
import {
  ArrowUpTrayIcon,
  CheckBadgeIcon,
  DocumentMagnifyingGlassIcon,
  FingerPrintIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const VerifyCertificate = ({ defaultMode }) => {
  const location = useLocation();
  const [mode, setMode] = useState(() => (defaultMode === 'qr' || location.pathname.endsWith('/scan') ? 'qr' : 'manual'));
  const [certificateId, setCertificateId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [matchedDoc, setMatchedDoc] = useState(null);
  const [scanImageName, setScanImageName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopQrScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const verifyCertificate = useCallback(async (id, hash) => {
    if (!id) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const apiClient = createPublicApiClient();
      const verifyResponse = await apiClient.get(`/api/certificates/verify/${id.trim()}`, {
        params: hash ? { documentHash: hash } : undefined,
      });

      const result = {
        isValid: verifyResponse.data.data.isValid,
        matchesHash: verifyResponse.data.data.matchesHash,
        certificate: verifyResponse.data.data.certificate,
        blockchainVerified: verifyResponse.data.data.blockchainVerified,
        fabricVerified: verifyResponse.data.data.fabricVerified,
        icpVerified: verifyResponse.data.data.icpVerified,
        icpDetails: verifyResponse.data.data.icpDetails,
        ecdsaVerified: verifyResponse.data.data.ecdsaVerified,
        status: verifyResponse.data.data.status,
      };

      setVerificationResult(result);

      if (result.isValid) {
        toast.success(
          result.blockchainVerified
            ? 'Certificate verified successfully on blockchain!'
            : 'Certificate verified successfully in database!'
        );
      } else if (result.status === 'hash_mismatch') {
        toast.warn('Certificate record found, but the uploaded document does not match the issued file.');
      } else if (result.status === 'revoked') {
        toast.error('Certificate has been revoked.');
      } else {
        toast.error('Invalid certificate');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.error || 'Error verifying certificate');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const extractCertificateId = useCallback((rawValue) => {
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
  }, []);

  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const scannedCertificateId = extractCertificateId(code.data);
        if (scannedCertificateId) {
          setCertificateId(scannedCertificateId);
          stopQrScanner();
          setMode('manual');
          toast.success('Certificate ID scanned successfully!');
          verifyCertificate(scannedCertificateId);
          return;
        }
      }
    }

    requestAnimationFrame(tick);
  }, [extractCertificateId, stopQrScanner, verifyCertificate]);

  const startQrScanner = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (error) {
      console.warn('Error accessing camera:', error);
      setCameraError('Camera access denied or unavailable. Please check permissions or upload a QR screenshot.');
      toast.error('Could not access camera');
    }
  }, [tick]);

  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode === 'qr') {
      startQrScanner();
    } else {
      stopQrScanner();
    }
  };

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const apiClient = createPublicApiClient();
        const response = await apiClient.get('/api/blockchain/network');
        setNetworkInfo(response.data.data);
      } catch (error) {
        console.warn('Failed to fetch blockchain network info:', error.response?.data || error.message);
      }
    };

    fetchNetworkInfo();
  }, []);

  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, [stopQrScanner]);

  useEffect(() => {
    if (defaultMode === 'qr' || location.pathname.endsWith('/scan')) {
      setMode('qr');
      startQrScanner();
    }
  }, [defaultMode, location.pathname, startQrScanner]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      try {
        const fileBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setSelectedFile({ ...file, hash: hashHex, previewName: file.name });

        // Auto-lookup certificate ID by hash
        try {
          const apiClient = createPublicApiClient();
          const lookupRes = await apiClient.get(`/api/certificates/lookup-by-hash/${hashHex}`);
          if (lookupRes.data?.success && lookupRes.data?.data) {
            const docData = lookupRes.data.data;
            setMatchedDoc(docData);
            setCertificateId(docData.certificateId);
            toast.success(`Identified credential: ${docData.certificateId}!`);
          } else {
            setMatchedDoc(null);
            toast.info('Document hash calculated. Ready to verify against blockchain.');
          }
        } catch (lookupErr) {
          setMatchedDoc(null);
          toast.info('Document hash calculated. Ready to verify against blockchain.');
        }
      } catch (error) {
        console.error('Hash calculation error:', error);
        toast.error('Failed to calculate document hash');
      }
    }
  };

  const scanQrImageFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith('image/')) {
        toast.error('Upload an image file containing the QR code.');
        return;
      }

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        const scannedCertificateId = extractCertificateId(code?.data || '');

        if (!scannedCertificateId) {
          toast.error('No readable QR code was found in the uploaded image.');
          return;
        }

        setScanImageName(file.name);
        setCertificateId(scannedCertificateId);
        setMode('manual');
        stopQrScanner();
        toast.success('QR screenshot decoded successfully!');
        verifyCertificate(scannedCertificateId);
      } catch (scanError) {
        console.error('QR image scan error:', scanError);
        toast.error('Failed to process the QR screenshot.');
      }
    },
    [extractCertificateId, stopQrScanner, verifyCertificate]
  );

  const handleScanImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await scanQrImageFile(file);
    }
  };

  const handleScanDrop = async (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await scanQrImageFile(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const targetId = certificateId.trim() || matchedDoc?.certificateId || 'by-hash';
    if (!targetId && !selectedFile?.hash) {
      toast.error('Please provide a certificate ID or upload a certificate document');
      return;
    }
    await verifyCertificate(targetId, selectedFile?.hash);
  };

  return (
    <div className="trust-dashboard space-y-4 sm:space-y-8">
      {/* Mobile-Only Header Strip (cleanly ordered on all screen sizes) */}
      <div className="lg:hidden flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-900/85 border border-cyan/25 shadow-[0_0_20px_rgba(0,229,255,0.12)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan shrink-0 animate-pulse shadow-[0_0_8px_#00E5FF]" />
            <h1 className="text-xs sm:text-sm font-bold text-white font-display leading-tight truncate">
              Verifier Inspection Portal
            </h1>
          </div>
          <p className="text-[10px] font-mono text-cyan-300 mt-0.5 pl-4 truncate">
            Hyperledger Fabric • Cryptographic Anchor
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 shrink-0 whitespace-nowrap self-center">
          ● Direct Lane
        </span>
      </div>

      {/* Desktop Hero Banner (Desktop Only to save mobile space) */}
      <section className="hidden lg:block trust-hero relative overflow-hidden">
        <NetworkBackdrop variant="zoom" />
        <div className="relative z-10">
          <p className="trust-section-kicker">Trust signal analyzer</p>
          <h1 className="trust-title mt-5 text-4xl font-semibold md:text-5xl">Inspect. Match. Confirm.</h1>
          <p className="trust-muted mt-4 max-w-2xl text-base leading-7">
            Verify a certificate by ID, QR code, or uploaded document hash against the blockchain-backed record.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="trust-card p-5 flex flex-col justify-between">
              <DocumentMagnifyingGlassIcon className="h-6 w-6 text-cyan-300" />
              <div className="mt-4">
                <p className="text-sm font-semibold text-white truncate">Certificate lookup</p>
                <p className="trust-muted mt-0.5 text-xs">Find issued record</p>
              </div>
            </div>
            <div className="trust-card trust-card-glow p-5 flex flex-col justify-between">
              <FingerPrintIcon className="h-6 w-6 text-amber" />
              <div className="mt-4">
                <p className="text-sm font-semibold text-white truncate">Hash match</p>
                <p className="trust-muted mt-0.5 text-xs">Document integrity</p>
              </div>
            </div>
            <div className="trust-card p-5 flex flex-col justify-between">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-300" />
              <div className="mt-4">
                <p className="text-sm font-semibold text-white truncate">Trust result</p>
                <p className="trust-muted mt-0.5 text-xs">Valid or revoked</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Three-Way Segmented Control */}
      <div className="flex p-1 rounded-xl bg-slate-950/90 border border-cyan/25 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => switchMode('qr')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'qr'
              ? 'bg-gradient-to-r from-cyan/30 to-blue-600/30 text-cyan border border-cyan/50 shadow-[0_0_16px_rgba(0,229,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          <span>Camera QR</span>
        </button>
        <button
          type="button"
          onClick={() => switchMode('manual')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'manual'
              ? 'bg-gradient-to-r from-cyan/30 to-blue-600/30 text-cyan border border-cyan/50 shadow-[0_0_16px_rgba(0,229,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DocumentMagnifyingGlassIcon className="w-4 h-4" />
          <span>Manual ID</span>
        </button>
        <button
          type="button"
          onClick={() => switchMode('upload')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'upload'
              ? 'bg-gradient-to-r from-cyan/30 to-blue-600/30 text-cyan border border-cyan/50 shadow-[0_0_16px_rgba(0,229,255,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          <span>Upload QR</span>
        </button>
      </div>

      {/* Mode 1: Camera QR Viewfinder */}
      {mode === 'qr' && (
        <div className="space-y-3">
          <div className="relative w-full h-[54vh] sm:h-[60vh] min-h-[360px] max-h-[640px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border-2 border-cyan/40 shadow-[0_0_40px_rgba(0,229,255,0.25)] flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              data-testid="qr-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Floating Live Sensor Indicator */}
            <div className="absolute top-3 sm:top-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/85 border border-cyan/40 backdrop-blur-md text-[11px] font-mono text-cyan shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#39FF88]" />
              <span className="font-semibold">SCANNER ACTIVE</span>
              <span className="text-slate-400 hidden sm:inline">| Point at Certificate QR</span>
            </div>

            {/* Native Camera Viewfinder Reticle with Neon Corner Brackets */}
            <div className="relative z-10 w-60 h-60 sm:w-72 sm:h-72 max-w-[78vw] max-h-[78vw] pointer-events-none flex flex-col items-center justify-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan rounded-tl-xl shadow-[0_0_15px_#00E5FF]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan rounded-tr-xl shadow-[0_0_15px_#00E5FF]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan rounded-bl-xl shadow-[0_0_15px_#00E5FF]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan rounded-br-xl shadow-[0_0_15px_#00E5FF]" />

              <div className="laser-scanner-beam" />

              <div className="w-9 h-9 rounded-full border border-cyan/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan/70 shadow-[0_0_6px_#00E5FF]" />
              </div>

              <p className="absolute -bottom-7 left-0 right-0 text-center text-[11px] font-mono text-white/90 bg-slate-950/75 px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow border border-cyan/20">
                Align certificate QR code within frame
              </p>
            </div>

            {cameraError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
                <p className="text-sm font-semibold text-rose-300">{cameraError}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Please allow camera permissions or upload a QR image screenshot instead.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={startQrScanner}
                    className="btn-primary text-xs font-mono px-4 py-2"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('upload')}
                    className="btn-secondary text-xs font-mono px-4 py-2"
                  >
                    Upload QR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Upload QR Screenshot */}
      {mode === 'upload' && (
        <div
          className={`trust-card p-6 sm:p-10 border-2 border-dashed transition-all ${
            isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-sky-500/30 hover:border-cyan/50'
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleScanDrop}
        >
          <div className="text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto text-cyan mb-4">
              <ArrowUpTrayIcon className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-white">Upload a QR Screenshot</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Drag &amp; drop or select an image containing the certificate QR code for immediate ledger verification.
            </p>
            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 px-5 py-3 text-xs font-semibold text-cyan font-mono tracking-wider uppercase transition w-full sm:w-auto min-h-[44px]">
              Browse QR Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScanImageChange}
              />
            </label>
            {scanImageName && (
              <p className="mt-3 text-xs text-cyan font-mono break-all">Last scanned: {scanImageName}</p>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Manual ID Input */}
      {mode === 'manual' && (
        <div className="trust-table">
          <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="certificateId" className="form-label">
                  Certificate ID {selectedFile ? <span className="text-emerald-400 font-normal">(Auto-identified / Optional)</span> : ''}
                </label>
                {selectedFile && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    File verification active
                  </span>
                )}
              </div>
              <input
                type="text"
                id="certificateId"
                className="input-field mt-1.5"
                placeholder={selectedFile ? 'Auto-identified from uploaded file (or leave as is)' : 'e.g. UNZA-SEN-25087 or KMU-KMU-00001'}
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                required={!selectedFile}
                data-testid="certificate-id-input"
              />
            </div>

            <div>
              <label htmlFor="certificate-document" className="form-label">
                Certificate Document (PDF / Image)
              </label>
              <div className="mt-1 space-y-3">
                <input
                  id="certificate-document"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan/15 file:text-cyan hover:file:bg-cyan/25 file:cursor-pointer"
                  data-testid="certificate-document-input"
                />
                <p className="text-xs text-slate-400">
                  Upload your official PDF or image certificate. The system will automatically compute its fingerprint and verify it on-chain without requiring manual ID entry.
                </p>
                {selectedFile?.hash && (
                  <div className="rounded-xl bg-slate-900/60 border border-sky-500/15 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan">
                      Document fingerprint calculated
                    </p>
                    <p className="mt-1 text-xs text-slate-200">{selectedFile.previewName || selectedFile.name}</p>
                    <code className="mt-1 block break-all text-[11px] font-mono text-slate-400">{selectedFile.hash}</code>
                  </div>
                )}
              </div>
            </div>

            {matchedDoc && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckBadgeIcon className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-white truncate">Document Recognized: {matchedDoc.certificateId}</p>
                    <p className="text-[11px] text-emerald-300/80 truncate">{matchedDoc.studentName} · {matchedDoc.courseName}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40 shrink-0">
                  Auto-Identified
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isVerifying || (!certificateId.trim() && !selectedFile)}
            >
              {isVerifying ? (
                <>
                  <div className="spinner h-4 w-4 mr-2" />
                  Verifying on Ledger...
                </>
              ) : (
                <>
                  <DocumentMagnifyingGlassIcon className="h-5 w-5 mr-2" />
                  {selectedFile && !certificateId.trim() ? 'Verify Uploaded Certificate Document' : 'Verify Certificate'}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Prominent Verification Results Section (Visible across all scan modes) */}
      {verificationResult && (
        <div className={`trust-card p-5 sm:p-6 border transition-all ${
          verificationResult.isValid
            ? 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
            : verificationResult.status === 'hash_mismatch'
              ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'bg-rose-950/30 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {verificationResult.isValid ? (
              <CheckBadgeIcon className="h-7 w-7 text-emerald-400 shrink-0" />
            ) : (
              <ExclamationTriangleIcon className={`h-7 w-7 shrink-0 ${
                verificationResult.status === 'hash_mismatch' ? 'text-amber-400' : 'text-rose-400'
              }`} />
            )}
            <div>
              <p className={`text-base font-bold font-display ${
                verificationResult.isValid
                  ? 'text-emerald-300'
                  : verificationResult.status === 'hash_mismatch'
                    ? 'text-amber-300'
                    : 'text-rose-300'
              }`}>
                {verificationResult.isValid
                  ? 'Valid Authentic Certificate'
                  : verificationResult.status === 'hash_mismatch'
                    ? 'Certificate Found, File Hash Mismatch'
                    : verificationResult.status === 'revoked'
                      ? 'Revoked Certificate'
                      : 'Invalid / Unverified Certificate'}
              </p>
              <p className="text-xs text-slate-300 font-mono">
                Status: {verificationResult.status || (verificationResult.blockchainVerified ? 'valid' : 'unknown')}
                {verificationResult.blockchainVerified && ' • Hyperledger Fabric Anchored'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 1: Permissioned</span>
                  <span className={verificationResult.blockchainVerified ? "text-emerald-400 font-semibold" : "text-amber font-semibold"}>
                    {verificationResult.blockchainVerified ? "✓ Hyperledger Fabric" : "Database Fallback"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 2: Public Anchor</span>
                  <span className={verificationResult.icpVerified ? "text-emerald-400 font-semibold" : (verificationResult.certificate?.bridge_status === "anchored" ? "text-emerald-400 font-semibold" : (verificationResult.certificate?.bridge_status ? "text-amber font-semibold" : "text-slate-300 font-semibold"))}>
                    {verificationResult.icpVerified ? "✓ ICP Canister Anchored" : (verificationResult.certificate?.bridge_status === "anchored" ? "✓ ICP Anchored" : (verificationResult.certificate?.bridge_status ? `ICP: ${verificationResult.certificate.bridge_status}` : "ICP Standby"))}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 3: Cryptography</span>
                  <span className="text-cyan font-semibold">
                    {verificationResult.ecdsaVerified ? "✓ ECDSA Signature Verified" : "✓ SHA-256 Digest Match"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {verificationResult.status === 'hash_mismatch' && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 text-xs sm:text-sm text-amber-200">
              The certificate ID exists and was found on the blockchain ledger, but the uploaded file SHA-256 hash does not match the original issued document hash.
            </div>
          )}

          {verificationResult.certificate && (() => {
            const cert = verificationResult.certificate;
            const institutionName = cert.issuerDetails?.institutionName || cert.metadata?.institution || 'BlockD3 University';
            const institutionType = cert.issuerDetails?.institutionType || 'University';
            const studentName = cert.studentDetails?.fullName || cert.metadata?.studentName || 'Unknown';
            const studentNumber = cert.studentDetails?.studentNumber || cert.studentId || 'N/A';
            const nationalId = cert.studentDetails?.nationalId || 'N/A';
            const program = cert.academicRecord?.program || cert.metadata?.program || cert.courseName || 'Not provided';
            const programSpecification = cert.academicRecord?.programSpecification || cert.metadata?.major || 'Not provided';
            const awardClassification = cert.academicRecord?.awardClassification || (cert.metadata?.cgpa ? `CGPA: ${cert.metadata.cgpa}` : cert.metadata?.grade || 'N/A');
            const graduationDate = cert.academicRecord?.graduationDate || cert.metadata?.graduationDate;
            const fileHash = cert.documentEvidence?.fileHash || cert.documentHash;

            const certFileBase64 = cert.metadata?.certificateFile;
            const origFileName = cert.metadata?.originalFileName || '';
            const isPdf = origFileName.toLowerCase().endsWith('.pdf') || cert.metadata?.originalFileType === 'application/pdf';
            const certFileSrc = certFileBase64
              ? (certFileBase64.startsWith('data:') ? certFileBase64 : `data:${isPdf ? 'application/pdf' : 'image/jpeg'};base64,${certFileBase64}`)
              : null;

            return (
              <div className="space-y-4">
                {/* Official Uploaded Certificate Document Preview */}
                {certFileSrc && (
                  <div className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-3 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-500/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-white font-display">
                            Official Uploaded Document Evidence
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Authentic credential issued by <strong className="text-cyan">{institutionName}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={certFileSrc}
                          download={origFileName || `certificate-${cert.certificateId}.${isPdf ? 'pdf' : 'jpg'}`}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 px-2.5 py-1 rounded transition"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          <span>Download Evidence</span>
                        </a>
                      </div>
                    </div>

                    <div className="rounded-lg overflow-hidden bg-slate-900/60 p-1 sm:p-2 border border-sky-500/15 text-center">
                      {isPdf ? (
                        <iframe
                          src={certFileSrc}
                          title={`Official ${institutionName} Certificate Document`}
                          className="w-full h-[60vh] rounded border border-slate-800 bg-white"
                        />
                      ) : (
                        <img
                          src={certFileSrc}
                          alt={`Official ${institutionName} Certificate`}
                          className="max-h-[65vh] w-auto mx-auto rounded shadow-xl object-contain border border-slate-800"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <ErrorBoundary>
                    <BlockchainDetails
                      transactionHash={cert.transactionHash || cert.documentEvidence?.fabricTxId}
                      fabricTxId={cert.documentEvidence?.fabricTxId || cert.transactionHash}
                      blockNumber={cert.documentEvidence?.blockNumber || 142}
                      channelId={cert.documentEvidence?.channelId || 'certificate-channel'}
                      ipfsHash={cert.ipfsHash || cert.documentEvidence?.ipfsHash}
                      networkName={networkInfo?.networkName || 'Hyperledger Fabric + ICP Anchor'}
                      canisterId={networkInfo?.canisterId || 'bkyz2-fmaaa-aaaaa-qaaaq-cai'}
                      documentHash={fileHash || cert.metadata?.documentHash}
                      matchesHash={verificationResult.matchesHash}
                      bridgeStatus={cert.bridge_status || 'anchored'}
                      issuerName={institutionName}
                    />
                  </ErrorBoundary>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/50 border border-sky-500/15 text-xs sm:text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Institution</h4>
                    <p className="mt-0.5 text-white font-medium">{institutionName} ({institutionType})</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Certification Number</h4>
                    <p className="mt-0.5 text-cyan-300 font-mono">{cert.issuerDetails?.certificationNumber || cert.certificateId}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Student Name</h4>
                    <p className="mt-0.5 text-white font-medium">{studentName}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Student ID / Exam Number</h4>
                    <p className="mt-0.5 text-white font-medium">{studentNumber}</p>
                  </div>
                  {cert.studentDetails?.nationalId && (
                    <div>
                      <h4 className="font-semibold text-slate-400 text-xs">National ID / NRC</h4>
                      <p className="mt-0.5 text-white font-medium">{nationalId}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Program / Degree</h4>
                    <p className="mt-0.5 text-white font-medium">{program}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Major / Specification</h4>
                    <p className="mt-0.5 text-white font-medium">{programSpecification}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Award Classification</h4>
                    <p className="mt-0.5 text-white font-medium">{awardClassification}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-400 text-xs">Graduation Date</h4>
                    <p className="mt-0.5 text-white font-medium">
                      {graduationDate ? new Date(graduationDate).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  {fileHash && (
                    <div className="sm:col-span-2">
                      <h4 className="font-semibold text-slate-400 text-xs">On-Chain Document Hash</h4>
                      <p className="mt-0.5 text-sky-300 font-mono text-[11px] break-all">{fileHash}</p>
                    </div>
                  )}
                </div>

                {/* Direct Action Links */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <Link
                    to={`/certificates/${cert.certificateId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 text-cyan text-xs font-mono font-semibold transition shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    <span>Open Full Certificate Record</span>
                  </Link>
                  <p className="text-[11px] font-mono text-slate-400">
                    Verified {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default VerifyCertificate;
