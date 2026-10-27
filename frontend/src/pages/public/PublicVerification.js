import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import { createPublicApiClient } from '../../lib/apiClient';
import { AuthContext } from '../../contexts/AuthContext';
import BlockchainDetails from '../../components/BlockchainDetails';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  DocumentMagnifyingGlassIcon,
  QrCodeIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  DocumentCheckIcon,
  UserCircleIcon,
  HomeIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import heroChainImg from '../../assets/images/1-blockchain-technology.jpg';
import cryptoDocImg from '../../assets/images/3-blockchain-technology.jpg';

const PublicVerification = () => {
  const { certificateId: routeCertificateId } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  const isAdmin = auth?.isAdmin || (() => false);
  const isVerifier = auth?.isVerifier || (() => false);

  const [certificateId, setCertificateId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);

  const [mode, setMode] = useState(() => (routeCertificateId ? 'manual' : 'qr'));
  const [isDragActive, setIsDragActive] = useState(false);
  const [scanImageName, setScanImageName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [matchedDoc, setMatchedDoc] = useState(null);
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
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiClient = createPublicApiClient();
      const endpoint = `/api/certificates/verify/${id.trim()}`;
      const response = hash
        ? await apiClient.get(endpoint, { params: { documentHash: hash } })
        : await apiClient.get(endpoint);
      setResult(response.data.data);
      if (response.data.data.isValid) {
        toast.success('Certificate verified on Hyperledger Fabric!');
      } else if (response.data.data.status === 'hash_mismatch') {
        toast.warn('Certificate found, but uploaded document hash does not match!');
      } else {
        toast.error('Certificate status: ' + (response.data.data.status || 'invalid'));
      }
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.error || 'Failed to verify certificate');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const apiClient = createPublicApiClient();
        const response = await apiClient.get('/api/blockchain/network');
        if (response.data?.data) {
          setNetworkInfo(response.data.data);
        }
      } catch (err) {
        console.warn('Network info fetch skipped:', err.message);
      }
    };
    fetchNetwork();
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
      } catch (err) {
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
      } catch (err) {
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
          verifyCertificate(scannedCertificateId, selectedFile?.hash);
          return;
        }
      }
    }

    requestAnimationFrame(tick);
  }, [extractCertificateId, stopQrScanner, verifyCertificate, selectedFile?.hash]);

  const startQrScanner = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Camera access unavailable or permission denied.');
      toast.error('Could not access camera');
    }
  }, [tick]);

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
        verifyCertificate(scannedCertificateId, selectedFile?.hash);
      } catch (scanError) {
        console.error('QR image scan error:', scanError);
        toast.error('Failed to process the QR screenshot.');
      }
    },
    [extractCertificateId, stopQrScanner, verifyCertificate, selectedFile?.hash]
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

  const handleDocumentFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setSelectedFile({
        name: file.name,
        size: file.size,
        hash: hashHex,
      });

      // Automatically lookup certificate from backend by hash
      try {
        const apiClient = createPublicApiClient();
        const lookupRes = await apiClient.get(`/api/certificates/lookup-by-hash/${hashHex}`);
        if (lookupRes.data?.success && lookupRes.data?.data) {
          const docData = lookupRes.data.data;
          setMatchedDoc(docData);
          setCertificateId(docData.certificateId);
          toast.success(`Identified credential: ${docData.certificateId}`);
        } else {
          setMatchedDoc(null);
          toast.info('Document hash calculated. Ready to verify against blockchain.');
        }
      } catch (lookupErr) {
        setMatchedDoc(null);
        toast.info('Document hash calculated. Ready to verify against blockchain.');
      }
    } catch (calcError) {
      console.error('Failed to calculate document hash:', calcError);
      toast.error('Could not compute document hash');
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode === 'qr') {
      startQrScanner();
    } else {
      stopQrScanner();
    }
  };

  const resetForNewScan = () => {
    setResult(null);
    setError(null);
    setCertificateId('');
    setSelectedFile(null);
    setMatchedDoc(null);
    setScanImageName('');
    switchMode('qr');
  };

  useEffect(() => {
    if (mode === 'qr' && !routeCertificateId) {
      startQrScanner();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const incomingId = routeCertificateId || searchParams.get('certificateId') || '';
    if (incomingId) {
      setCertificateId(incomingId);
      verifyCertificate(incomingId);
    }
  }, [routeCertificateId, searchParams, verifyCertificate]);

  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, [stopQrScanner]);

  const handleVerify = async (e) => {
    e.preventDefault();
    const targetId = certificateId.trim() || matchedDoc?.certificateId || 'by-hash';
    if (!targetId && !selectedFile?.hash) {
      toast.error('Please enter a certificate ID or upload a certificate file.');
      return;
    }
    await verifyCertificate(targetId, selectedFile?.hash);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/verify/${certificateId}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  const getDashboardDestination = () => {
    if (!user) return '/login';
    if (isAdmin && isAdmin()) return '/admin';
    if (isVerifier && isVerifier()) return '/verifier';
    return '/student';
  };

  return (
    <div className="min-h-screen app-shell public-verification-shell pb-16 px-3 sm:px-6 lg:px-8">
      {/* Top Header Navigation Bar with Option to Go Back to Main System */}
      <header className="max-w-6xl mx-auto pt-3 sm:pt-6 pb-3 sm:pb-4 mb-4 flex items-center justify-between flex-wrap gap-2.5 sm:gap-4 border-b border-cyan/20">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            to={getDashboardDestination()}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-cyan/40 bg-cyan/10 hover:bg-cyan/20 text-cyan text-xs font-mono tracking-wide transition-all shadow-[0_0_15px_rgba(0,229,255,0.15)] group"
            title="Return to main system"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-semibold font-display">
              {user ? 'Dashboard' : 'Portal Home'}
            </span>
          </Link>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan shadow-[0_0_8px_#00E5FF] animate-pulse" />
            <span className="font-display font-bold text-white tracking-wider text-sm group-hover:text-cyan transition-colors">
              BlockD3 <span className="text-cyan">Vault</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300 hidden md:inline">
                Logged in as <span className="text-cyan font-semibold">{user.name || user.email}</span>
              </span>
              <Link
                to={getDashboardDestination()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan/20 to-violet/20 border border-cyan/40 hover:border-cyan text-white text-xs font-mono tracking-wide transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]"
              >
                <HomeIcon className="w-3.5 h-3.5 text-cyan" />
                <span>Portal Dashboard</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 hover:border-cyan/50 text-slate-200 text-xs font-mono tracking-wide transition-all hover:text-cyan"
              >
                <UserCircleIcon className="w-4 h-4 text-slate-400" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 text-cyan text-xs font-mono tracking-wide transition-all"
              >
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-8">
        {/* Mobile-Only Header Strip (cleanly ordered on all screen sizes) */}
        <div className="lg:hidden flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-900/85 border border-cyan/25 shadow-[0_0_20px_rgba(0,229,255,0.12)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan shrink-0 animate-pulse shadow-[0_0_8px_#00E5FF]" />
              <h1 className="text-xs sm:text-sm font-bold text-white font-display leading-tight truncate">
                CertVault Scanner
              </h1>
            </div>
            <p className="text-[10px] font-mono text-cyan-300 mt-0.5 pl-4 truncate">
              Hyperledger Fabric • ICP Bridge
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 shrink-0 whitespace-nowrap self-center">
            ● Direct Lane
          </span>
        </div>

        {/* Hero Section (Desktop Only to save mobile space) */}
        <div className="hidden lg:block tech-card relative overflow-hidden p-8 md:p-10 text-center border border-cyan/30 shadow-[0_0_60px_rgba(0,229,255,0.18)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none"
            style={{ backgroundImage: `url(${heroChainImg})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="relative z-10">
            <span className="status-chip status-chip-cyan mx-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              Public verification portal
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-white font-display">
              BlockD3 <span className="text-cyan">CertVault</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base leading-6 text-slate-300">
              Instantly validate credentials anchored on-chain with dual Hyperledger Fabric &amp; Internet Computer (ICP) cryptographic proof.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] items-start">
          {/* Left Context & Holographic preview card (Desktop Only) */}
          <div className="hidden lg:block glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan/20">
            {/* Holographic document preview using cryptoDocImg */}
            <div className="relative rounded-xl overflow-hidden border border-amber/40 h-44 shadow-[0_0_24px_rgba(255,138,43,0.25)] group">
              <img
                src={cryptoDocImg}
                alt="Cryptographic Document Verification"
                className="w-full h-full object-cover object-center brightness-95 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                <span className="status-chip status-chip-amber text-[10px]">
                  Tamper-proof Cryptographic Proof
                </span>
                <span className="text-xs font-mono text-cyan bg-slate-950/80 px-2 py-0.5 rounded border border-cyan/30">
                  IPFS + Hyperledger + ICP
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-sm bg-amber" />
                <h2 className="text-2xl font-semibold text-white font-display">Verification context</h2>
              </div>
              <p className="text-sm text-slate-300">
                Paste or scan a credential ID to validate issue status, revocation state, ledger transaction, and IPFS cryptographic evidence.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan/15 bg-slate-900/70 p-4 transition-all hover:border-cyan/40">
                <p className="text-xs font-semibold text-cyan uppercase tracking-wider font-mono">Result types</p>
                <p className="mt-2 text-sm text-slate-200">Valid, revoked, or not found with real-time Fabric verification.</p>
              </div>
              <div className="rounded-xl border border-amber/20 bg-slate-900/70 p-4 transition-all hover:border-amber/40">
                <p className="text-xs font-semibold text-amber uppercase tracking-wider font-mono">Chain integrity</p>
                <p className="mt-2 text-sm text-slate-200">SHA-256 document fingerprint checked against ledger blocks.</p>
              </div>
              <div className="rounded-xl border border-violet/20 bg-slate-900/70 p-4 transition-all hover:border-violet/40">
                <p className="text-xs font-semibold text-violet uppercase tracking-wider font-mono">Cross-Chain Anchor</p>
                <p className="mt-2 text-sm text-slate-200">Public anchor canister synced to the Internet Computer (ICP).</p>
              </div>
              <div className="rounded-xl border border-gold/20 bg-slate-900/70 p-4 transition-all hover:border-gold/40">
                <p className="text-xs font-semibold text-gold uppercase tracking-wider font-mono">Decentralized IPFS</p>
                <p className="mt-2 text-sm text-slate-200">Permanent decentralized archival via Kubo IPFS cluster.</p>
              </div>
            </div>

            {/* Quick action to main portal */}
            <div className="pt-2">
              <Link
                to={getDashboardDestination()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-cyan/30 bg-cyan/5 hover:bg-cyan/15 text-cyan hover:text-white transition-all text-sm font-display font-medium"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Return to {user ? 'Your Portal Dashboard' : 'Main Sign In / System Portal'}</span>
              </Link>
            </div>
          </div>

          {/* Right Verification Card / Direct Camera Viewport */}
          <div className="tech-card p-3 sm:p-7 border border-cyan/30 shadow-[0_0_40px_rgba(0,229,255,0.14)] w-full">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-5">
              <div>
                <h2 className="text-lg sm:text-2xl font-semibold text-white font-display">
                  {mode === 'qr' ? 'Live Camera Scanner' : mode === 'upload' ? 'Upload QR Proof' : 'Manual Certificate ID'}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-300">
                  {mode === 'qr'
                    ? 'Point camera at certificate QR code for instant ledger validation.'
                    : mode === 'upload'
                    ? 'Upload a screenshot or photo of the certificate QR code.'
                    : 'Enter the certificate ID to confirm on-chain authenticity.'}
                </p>
              </div>
            </div>

            {/* Three-Way Segmented Control */}
            <div className="flex p-1 rounded-xl bg-slate-950/90 border border-cyan/25 mb-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => switchMode('qr')}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all ${
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
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all ${
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
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold font-display flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'upload'
                    ? 'bg-gradient-to-r from-cyan/30 to-blue-600/30 text-cyan border border-cyan/50 shadow-[0_0_16px_rgba(0,229,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span>Upload QR</span>
              </button>
            </div>

            {mode === 'qr' && (
              <div className="space-y-3">
                {/* Dominant Camera Viewfinder like native camera app */}
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
                    {/* 4 Neon Cyber Corner Brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan rounded-tl-xl shadow-[0_0_15px_#00E5FF]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan rounded-tr-xl shadow-[0_0_15px_#00E5FF]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan rounded-bl-xl shadow-[0_0_15px_#00E5FF]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan rounded-br-xl shadow-[0_0_15px_#00E5FF]" />

                    {/* Animated Laser Scanning Beam */}
                    <div className="laser-scanner-beam" />

                    {/* Subtle Center Reticle Target */}
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
                          Upload Instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Floating Bottom Quick Action Toolbar */}
                  <div className="absolute bottom-3 sm:bottom-4 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startQrScanner}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 backdrop-blur-md transition-colors flex items-center gap-1.5"
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5 text-cyan" />
                      <span>Restart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('upload')}
                      className="px-3 py-1.5 rounded-lg bg-amber/20 hover:bg-amber/30 border border-amber/50 text-xs font-mono text-amber backdrop-blur-md transition-colors flex items-center gap-1.5"
                    >
                      <ArrowUpTrayIcon className="w-3.5 h-3.5 text-amber" />
                      <span>Upload Screenshot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'upload' && (
              <div
                className={`p-5 sm:p-8 border-2 border-dashed rounded-2xl transition-all ${
                  isDragActive
                    ? 'border-amber bg-amber/10 shadow-[0_0_30px_rgba(255,138,43,0.2)]'
                    : 'border-slate-700 bg-slate-900/40 hover:border-cyan/50 hover:bg-slate-900/70'
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleScanDrop}
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto mb-3">
                    <ArrowUpTrayIcon className="w-6 h-6 text-cyan" />
                  </div>
                  <p className="text-base font-medium text-white">Select Certificate QR Image</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    Upload a screenshot, photo, or scanned file containing the certificate's QR proof.
                  </p>
                  <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-cyan hover:bg-cyan-300 transition-colors px-5 py-2.5 text-xs font-semibold text-slate-950 font-mono tracking-wider uppercase shadow-[0_0_20px_rgba(0,229,255,0.35)] w-full sm:w-auto min-h-[44px]">
                    Choose Image File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScanImageChange}
                    />
                  </label>
                  {scanImageName && (
                    <p className="mt-3 text-xs font-mono text-amber break-all">Processed: {scanImageName}</p>
                  )}
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="certificateId" className="form-label font-mono text-xs uppercase tracking-wider text-slate-300">
                      Certificate ID {selectedFile ? <span className="text-emerald-400 font-normal">(Auto-identified / Optional)</span> : ''}
                    </label>
                    {selectedFile && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        File verification active
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <input
                      id="certificateId"
                      name="certificateId"
                      type="text"
                      required={!selectedFile}
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      className="input-field"
                      placeholder={selectedFile ? 'Auto-identified from uploaded file (or leave as is)' : 'Enter certificate ID (e.g. UNZA-SEN-44873 or KMU-KMU-00001)'}
                      data-testid="certificate-id-input"
                    />
                  </div>
                </div>

                {/* Optional Document File Upload for Hash Comparison */}
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cert-doc-file" className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <DocumentCheckIcon className="w-4 h-4 text-cyan" />
                      Upload Certificate Document (PDF / Image)
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setMatchedDoc(null);
                        }}
                        className="text-[11px] font-mono text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="cert-doc-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentFileChange}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan/15 file:text-cyan hover:file:bg-cyan/25 cursor-pointer"
                  />
                  {selectedFile?.hash ? (
                    <div className="rounded bg-slate-950/80 p-2.5 border border-cyan/30 text-[11px] font-mono">
                      <p className="text-cyan font-medium">Computed SHA-256 Fingerprint:</p>
                      <p className="break-all text-slate-300 mt-0.5">{selectedFile.hash}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Upload your certificate PDF or image. The system will automatically compute its fingerprint and verify it on-chain without requiring manual ID entry.
                    </p>
                  )}
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
                    <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 shrink-0">
                      Auto-Identified
                    </span>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading || (!certificateId.trim() && !selectedFile)}
                    className="btn-primary w-full shadow-[0_0_25px_rgba(0,229,255,0.3)] disabled:opacity-50"
                  >
                    {loading ? 'Verifying on Ledger...' : selectedFile && !certificateId.trim() ? 'Verify Uploaded Certificate Document' : 'Verify Certificate Authenticity'}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <div className="mt-6 bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 shadow-[0_0_24px_rgba(244,63,94,0.15)]">
                <div className="flex">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold font-mono text-rose-300 uppercase tracking-wider">Verification Failed</h3>
                    <div className="mt-2 text-sm text-rose-200">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className={`mt-6 rounded-xl border p-5 transition-all ${
                result.isValid
                  ? 'bg-emerald-950/40 border-green/50 shadow-[0_0_36px_rgba(57,255,136,0.15)]'
                  : 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_36px_rgba(244,63,94,0.15)]'
              }`}>
                <div className="flex">
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <span className={`status-chip ${result.isValid ? 'status-chip-verified' : 'status-chip-pending'}`}>
                        {result.isValid ? '✓ ' : '✗ '}
                        {result.isValid ? 'Certificate verified on-chain' : 'Certificate not valid'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Status: <span className="font-semibold text-white uppercase">{result.status}</span>
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-300 space-y-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 1: Permissioned</span>
                          <span className={result.blockchainVerified ? "text-emerald-400 font-semibold" : "text-amber font-semibold"}>
                            {result.blockchainVerified ? "✓ Hyperledger Fabric" : "Database Fallback"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 2: Public Anchor</span>
                          <span className={result.icpVerified ? "text-emerald-400 font-semibold" : (result.certificate?.bridge_status === "anchored" ? "text-emerald-400 font-semibold" : (result.certificate?.bridge_status ? "text-amber font-semibold" : "text-slate-300 font-semibold"))}>
                            {result.icpVerified ? "✓ ICP Canister Anchored" : (result.certificate?.bridge_status === "anchored" ? "✓ ICP Anchored" : (result.certificate?.bridge_status ? "ICP: " + result.certificate.bridge_status : "ICP Standby"))}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Layer 3: Cryptography</span>
                          <span className="text-cyan font-semibold">
                            {result.ecdsaVerified ? "✓ ECDSA Signature Verified" : "✓ SHA-256 Digest Match"}
                          </span>
                        </div>
                      </div>

                      {/* File hash check status if file was provided */}
                      {selectedFile?.hash && (
                        <div className={`mt-3 p-3 rounded-lg border text-xs font-mono ${
                          result.matchesHash
                            ? 'bg-emerald-950/50 border-green/40 text-emerald-300'
                            : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                        }`}>
                          {result.matchesHash
                            ? (result.verifiedDocumentType === 'issued_credential_pdf'
                                ? '✓ Cryptographic Match: Uploaded file is an authentic official credential PDF issued by BlockD3 CertVault.'
                                : '✓ Cryptographic Match: Uploaded document matches the on-chain ledger hash exactly.')
                            : '✗ Hash Mismatch: Uploaded document has been altered or does not match the ledger.'}
                        </div>
                      )}

                      {/* Academic & Student Details and Official Certificate Document */}
                      {result.certificate && (() => {
                        const cert = result.certificate;
                        const institutionName = cert.issuerDetails?.institutionName || cert.metadata?.institution || 'Academic Institution';
                        const institutionType = cert.issuerDetails?.institutionType || 'Accredited University';
                        const certFileBase64 = cert.metadata?.certificateFile;
                        const origFileName = cert.metadata?.originalFileName || '';
                        const isPdf = origFileName.toLowerCase().endsWith('.pdf') || cert.metadata?.originalFileType === 'application/pdf';
                        const certFileSrc = certFileBase64
                          ? (certFileBase64.startsWith('data:') ? certFileBase64 : `data:${isPdf ? 'application/pdf' : 'image/jpeg'};base64,${certFileBase64}`)
                          : null;

                        return (
                          <div className="space-y-4">
                            {/* Official Uploaded Certificate Document Preview ("You give me the one I give you") */}
                            {certFileSrc && (
                              <div className="mt-4 rounded-xl border border-sky-500/30 bg-slate-950/70 p-3 sm:p-5 space-y-3">
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
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
                                      <CheckBadgeIcon className="w-3.5 h-3.5" />
                                      <span>Cryptographically Verified</span>
                                    </span>
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

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-cyan/20 bg-slate-900/80 p-3.5">
                                <p className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-400">Student</p>
                                <p className="mt-1 font-medium text-white">
                                  {cert.studentDetails?.fullName || cert.metadata?.studentName || 'Unknown'}
                                </p>
                                <p className="mt-1 text-xs font-mono text-cyan">
                                  ID: {cert.studentDetails?.studentNumber || cert.studentId}
                                </p>
                              </div>
                              <div className="rounded-xl border border-amber/20 bg-slate-900/80 p-3.5">
                                <p className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-400">Institution</p>
                                <p className="mt-1 font-medium text-white">
                                  {institutionName}
                                </p>
                                <p className="mt-1 text-xs font-mono text-amber">
                                  {institutionType}
                                </p>
                              </div>
                              <div className="rounded-xl border border-violet/20 bg-slate-900/80 p-3.5">
                                <p className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-400">Program / Degree</p>
                                <p className="mt-1 font-medium text-white">
                                  {cert.academicRecord?.program || cert.courseName || 'Not provided'}
                                </p>
                                <p className="mt-1 text-xs font-mono text-violet">
                                  {cert.academicRecord?.programSpecification || cert.metadata?.major || 'Not provided'}
                                </p>
                              </div>
                              <div className="rounded-xl border border-gold/20 bg-slate-900/80 p-3.5">
                                <p className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-400">Award / Graduation</p>
                                <p className="mt-1 font-medium text-white">
                                  {cert.academicRecord?.awardClassification || (cert.metadata?.cgpa ? `CGPA: ${cert.metadata.cgpa}` : cert.metadata?.grade || 'N/A')}
                                </p>
                                <p className="mt-1 text-xs font-mono text-gold">
                                  Graduation: {cert.academicRecord?.graduationDate
                                    ? new Date(cert.academicRecord.graduationDate).toLocaleDateString()
                                    : (cert.metadata?.graduationDate
                                      ? new Date(cert.metadata.graduationDate).toLocaleDateString()
                                      : 'Unknown')}
                                </p>
                              </div>
                            </div>

                            {/* Integrated Multi-chain & IPFS Details Component */}
                            <div className="mt-4">
                              <ErrorBoundary>
                                <BlockchainDetails
                                  transactionHash={cert.transactionHash || cert.documentEvidence?.fabricTxId}
                                  fabricTxId={cert.documentEvidence?.fabricTxId || cert.transactionHash}
                                  blockNumber={cert.documentEvidence?.blockNumber || cert.blockNumber || 142}
                                  channelId={cert.documentEvidence?.channelId || 'certificate-channel'}
                                  ipfsHash={cert.ipfsHash || cert.documentEvidence?.ipfsHash}
                                  networkName={networkInfo?.networkName || 'Hyperledger Fabric + ICP Anchor'}
                                  canisterId={networkInfo?.canisterId || networkInfo?.bridge?.canisterId || 'bkyz2-fmaaa-aaaaa-qaaaq-cai'}
                                  documentHash={cert.documentHash || cert.metadata?.documentHash || cert.hash}
                                  matchesHash={result.matchesHash}
                                  bridgeStatus={cert.bridge_status || 'anchored'}
                                  issuerName={institutionName}
                                />
                              </ErrorBoundary>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action buttons: Share link, Print proof & Scan Another */}
                      <div className="mt-5 pt-4 border-t border-slate-700/70 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={resetForNewScan}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan/50 bg-cyan/15 hover:bg-cyan/25 text-cyan text-xs font-mono font-semibold transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                          >
                            <QrCodeIcon className="w-3.5 h-3.5" />
                            <span>Scan Another</span>
                          </button>
                          <button
                            type="button"
                            onClick={copyShareLink}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan/30 bg-slate-900 hover:bg-cyan/10 text-cyan text-xs font-mono transition-all"
                          >
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-all"
                          >
                            <PrinterIcon className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">
                          Verified at {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicVerification;
