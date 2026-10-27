import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createApiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import graduationImage from '../../assets/images/view-3d-book-with-graduation-cap.jpg';
import {
  AcademicCapIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  SparklesIcon,
  ArrowPathIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const SubmitCertificateRequest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedSummary, setScannedSummary] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    institutionType: 'University',
    institutionName: '',
    customInstitutionName: '',
    certificationNumber: '',
    studentNumber: user?.profile?.studentId || '',
    fullName: user?.profile?.fullName || '',
    nationalId: '',
    program: '',
    programSpecification: '',
    awardClassification: 'With Merit',
    customAwardClassification: '',
    graduationDate: '',
    certificateFile: null,
    fileHash: '',
  });

  useEffect(() => {
    if (user?.profile) {
      setFormData((prev) => ({
        ...prev,
        studentNumber: prev.studentNumber || user.profile.studentId || '',
        fullName: prev.fullName || user.profile.fullName || '',
      }));
    }
  }, [user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleFileChange = async (event, autoTriggerScan = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormData((previous) => ({
      ...previous,
      certificateFile: file,
      fileHash: 'Calculating cryptographic fingerprint...',
    }));

    // Generate SHA-256 browser-side instantly
    try {
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setFormData((prev) => ({ ...prev, fileHash: hashHex }));
      toast.info('Browser-side SHA-256 fingerprint generated!');
    } catch (hashError) {
      console.error('SHA-256 generation failed:', hashError);
      setFormData((prev) => ({ ...prev, fileHash: 'Hash generation failed' }));
      toast.error('Could not generate cryptographic fingerprint');
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
    setScannedSummary(null);

    if (autoTriggerScan) {
      handleScanCertificate(file);
    }
  };

  const applyExtractedData = (extracted) => {
    if (!extracted) return 0;
    let fieldsPopulated = 0;

    setFormData((prev) => {
      const next = { ...prev };

      if (extracted.fullName && extracted.fullName.trim()) {
        next.fullName = extracted.fullName.trim();
        fieldsPopulated++;
      }
      if (extracted.studentNumber && extracted.studentNumber.trim()) {
        next.studentNumber = extracted.studentNumber.trim();
        fieldsPopulated++;
      }
      if (extracted.nationalId && extracted.nationalId.trim()) {
        next.nationalId = extracted.nationalId.trim();
        fieldsPopulated++;
      }
      if (extracted.certificationNumber && extracted.certificationNumber.trim()) {
        next.certificationNumber = extracted.certificationNumber.trim();
        fieldsPopulated++;
      }
      if (extracted.program && extracted.program.trim()) {
        next.program = extracted.program.trim();
        fieldsPopulated++;
      }
      if (extracted.programSpecification && extracted.programSpecification.trim()) {
        next.programSpecification = extracted.programSpecification.trim();
        fieldsPopulated++;
      }
      if (extracted.graduationDate && /^\d{4}-\d{2}-\d{2}$/.test(extracted.graduationDate)) {
        next.graduationDate = extracted.graduationDate;
        fieldsPopulated++;
      }

      const validTypes = ['University', 'College / TEVETA', 'Secondary School'];
      if (extracted.institutionType && validTypes.includes(extracted.institutionType)) {
        next.institutionType = extracted.institutionType;
      }

      const knownInstitutions = [
        'The University of Zambia',
        'Copperbelt University',
        'Kapasa Makasa University',
        'Mulungushi University',
        'Evelyn Hone College',
        'Zambia Centre for Accountancy Studies',
        'National Institute for Public Administration',
        'Examinations Council of Zambia',
      ];

      if (extracted.institutionName && extracted.institutionName.trim()) {
        fieldsPopulated++;
        const extNameLower = extracted.institutionName.toLowerCase();
        const match = knownInstitutions.find((inst) =>
          extNameLower.includes(inst.toLowerCase()) || inst.toLowerCase().includes(extNameLower)
        );

        if (match) {
          next.institutionName = match;
          next.customInstitutionName = '';
        } else {
          next.institutionName = 'Other';
          next.customInstitutionName = extracted.institutionName.trim();
        }
      }

      const knownClassifications = [
        'Distinction',
        'With Distinction',
        'Merit',
        'With Merit',
        'Credit',
        'With Credit',
        'Clear Pass',
        'Pass',
        'Satisfactory',
      ];

      if (extracted.awardClassification && extracted.awardClassification.trim()) {
        fieldsPopulated++;
        const extClassLower = extracted.awardClassification.toLowerCase().trim();
        const match = knownClassifications.find(
          (c) => c.toLowerCase() === extClassLower
        );

        if (match) {
          next.awardClassification = match;
          next.customAwardClassification = '';
        } else {
          next.awardClassification = 'Other';
          next.customAwardClassification = extracted.awardClassification.trim();
        }
      }

      return next;
    });

    return fieldsPopulated;
  };

  const handleScanCertificate = async (fileToScan = formData.certificateFile) => {
    if (!fileToScan) {
      toast.warn('Please select or upload a certificate file first.');
      return;
    }

    try {
      setScanning(true);
      setScannedSummary(null);
      toast.info('🔍 Scanning certificate with AI... Please wait.');

      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(fileToScan);
      });

      const apiClient = createApiClient();
      const response = await apiClient.post(
        '/api/submissions/scan',
        {
          certificateFile: fileBase64,
          fileType: fileToScan.type || 'image/jpeg',
        },
        { timeout: 40000 }
      );

      if (response.data.success && response.data.data) {
        const extracted = response.data.data;
        const count = applyExtractedData(extracted);
        setScannedSummary({
          success: true,
          count,
          institution: extracted.institutionName,
          program: extracted.program,
          name: extracted.fullName,
        });
        toast.success('✨ Scanned successfully! Certificate details auto-filled below.');
      } else {
        toast.warn('AI scan finished, but no distinct fields were identified.');
      }
    } catch (scanError) {
      console.error('Scan error:', scanError);
      if (scanError.response?.data?.code === 'GEMINI_KEY_MISSING') {
        toast.info(
          'AI Auto-Scan: Add your free Google AI Studio key to GEMINI_API_KEY in backend/.env to activate automatic scanning. You can continue typing manually!',
          { autoClose: 9000 }
        );
      } else {
        toast.error(
          scanError.response?.data?.error ||
            'Could not auto-extract details. You can continue by typing them manually.'
        );
      }
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.certificateFile) {
      toast.error('Upload the certificate file before submitting.');
      return;
    }
    if (formData.fileHash.startsWith('Calculating')) {
      toast.warn('Please wait for file hash calculation to complete');
      return;
    }

    try {
      setLoading(true);

      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(formData.certificateFile);
      });

      const selectedInstitutionName =
        formData.institutionName === 'Other' ? formData.customInstitutionName : formData.institutionName;
      const selectedAwardClassification =
        formData.awardClassification === 'Other' ? formData.customAwardClassification : formData.awardClassification;

      const submissionPayload = {
        issuerDetails: {
          institutionType: formData.institutionType,
          institutionName: selectedInstitutionName,
          certificationNumber: formData.certificationNumber,
        },
        studentDetails: {
          studentNumber: formData.studentNumber,
          fullName: formData.fullName,
          nationalId: formData.nationalId || '',
        },
        academicRecord: {
          program: formData.program,
          programSpecification: formData.programSpecification,
          awardClassification: selectedAwardClassification,
          graduationDate: formData.graduationDate,
        },
        documentEvidence: {
          fileHash: formData.fileHash,
        },
        certificateFile: fileBase64,
        fileName: formData.certificateFile?.name || null,
        fileType: formData.certificateFile?.type || null,
        metadata: {
          studentName: formData.fullName,
          program: formData.program,
          major: formData.programSpecification,
          cgpa: null,
          graduationDate: formData.graduationDate ? new Date(formData.graduationDate).toISOString() : null,
          issueDate: new Date().toISOString(),
        }
      };

      const apiClient = createApiClient();
      const response = await apiClient.post('/api/submissions', submissionPayload);

      toast.success(response.data.message || 'Submission received.');
      setFormData({
        institutionType: 'University',
        institutionName: 'The University of Zambia',
        customInstitutionName: '',
        certificationNumber: '',
        studentNumber: user?.profile?.studentId || '',
        fullName: user?.profile?.fullName || '',
        nationalId: '',
        program: '',
        programSpecification: '',
        awardClassification: 'With Merit',
        customAwardClassification: '',
        graduationDate: '',
        certificateFile: null,
        fileHash: '',
      });
      setPreviewUrl(null);
      const fileInput = document.getElementById('submission-certificate-file');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Certificate submission error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit certificate request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trust-dashboard space-y-6 sm:space-y-10">
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="trust-hero">
          <p className="trust-section-kicker">Student submission lane</p>
          <h1 className="trust-title mt-3 sm:mt-5 text-2xl sm:text-4xl md:text-5xl font-semibold">Upload. Review. Receive.</h1>
          <p className="trust-muted mt-2 sm:mt-4 max-w-2xl text-xs sm:text-base leading-relaxed sm:leading-7">
            Send your certificate evidence to the admin review queue. After approval, the system issues
            the blockchain-backed credential and makes it available from your dashboard.
          </p>

          <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-1.5 sm:gap-4">
            <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Evidence</p>
                <DocumentArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary,#ffffff)] truncate leading-tight">Upload</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">Attach PDF/image</p>
              </div>
            </div>
            <div className="trust-card trust-card-glow p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Review</p>
                <BuildingOfficeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary,#ffffff)] truncate leading-tight">Admin Intake</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">Enters review</p>
              </div>
            </div>
            <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Anchor</p>
                <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary,#ffffff)] truncate leading-tight">Verifiable</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">On-chain proof</p>
              </div>
            </div>
          </div>
        </div>

        <div className="trust-card overflow-hidden p-0 h-28 sm:h-44 lg:h-full lg:min-h-[18rem] relative rounded-xl sm:rounded-2xl">
          <img
            src={graduationImage}
            alt="Graduation cap and certificate"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
          <span className="absolute bottom-2 left-2.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-cyan bg-slate-950/85 px-2 py-0.5 rounded border border-cyan/40 backdrop-blur-sm">
            Student Submission Anchor
          </span>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        data-gramm="false"
        data-enable-grammarly="false"
        spellCheck={false}
        className="grid gap-6 xl:grid-cols-[1fr_0.42fr]"
      >
        <div className="trust-table">
          <div className="border-b border-sky-500/10 p-5">
            <p className="trust-section-kicker">Submission payload</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Certificate request</h2>
            <p className="trust-muted mt-2 text-sm">Use the same details that appear on the uploaded certificate.</p>
          </div>

          {/* Smart AI Extraction Banner - Professional Royal Blue & Slate */}
          <div className="mx-3 sm:mx-5 md:mx-6 mt-4 sm:mt-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 sm:p-5 shadow-lg shadow-black/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-inner shadow-blue-500/20">
                  <SparklesIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-white">AI Certificate Auto-Fill</span>
                    <span className="text-[10px] font-mono uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                      Vision AI
                    </span>
                    {scannedSummary && (
                      <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                        ✓ {scannedSummary.count} Fields Auto-Filled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    {formData.certificateFile
                      ? scannedSummary
                        ? `Extracted details from "${formData.certificateFile.name}". Review the fields below and edit if needed.`
                        : `File "${formData.certificateFile.name}" selected. Click the button to automatically fill the form.`
                      : 'Snap a photo with your mobile camera or upload a file (PDF / Image) to automatically extract your degree details.'}
                  </p>
                </div>
              </div>

              {formData.certificateFile ? (
                <button
                  type="button"
                  onClick={() => handleScanCertificate()}
                  disabled={scanning}
                  className="w-full md:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition shadow-md shadow-blue-900/30 active:scale-95 disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin text-white" />
                      <span>Analyzing Document...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 text-white" />
                      <span>{scannedSummary ? 'Re-Scan Certificate' : '✨ Scan & Auto-Fill Form'}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  {/* Mobile Camera Button - Professional Royal Blue */}
                  <label
                    htmlFor="top-scan-camera-input"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-900/30 active:scale-95 text-center font-medium"
                  >
                    <CameraIcon className="h-4 w-4 shrink-0 text-white" />
                    <span>Take Photo & Auto-Fill</span>
                    <input
                      id="top-scan-camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </label>

                  {/* Document / PDF Upload Button - Clean Dark Slate with White Text */}
                  <label
                    htmlFor="top-scan-file-input"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 text-center font-medium"
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 shrink-0 text-blue-400" />
                    <span>Upload PDF / Image</span>
                    <input
                      id="top-scan-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Scan Progress Indicator */}
            {scanning && (
              <div className="w-full mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-center gap-2 text-xs text-blue-300 animate-pulse text-center">
                <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
                <span>Reading certificate typography, seals, and recipient details with Vision AI...</span>
              </div>
            )}
          </div>

          <div className="space-y-8 p-5 md:p-6">
            {/* GROUP 1: Issuer Details */}
            <div className="rounded-2xl border border-sky-500/5 bg-slate-900/10 p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="trust-icon-disc">
                  <BuildingOfficeIcon className="h-5 w-5 text-cyan-400" />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary,#ffffff)] text-base">1. Issuer Details</h3>
                  <p className="trust-muted text-xs">Specify the conferring institution and certificate number.</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="institutionType" className="form-label">Institution Type</label>
                  <select
                    id="institutionType"
                    name="institutionType"
                    required
                    value={formData.institutionType}
                    onChange={handleInputChange}
                    className="input-field mt-2 border-sky-500/20"
                  >
                    <option value="University">University</option>
                    <option value="College / TEVETA">College / TEVETA</option>
                    <option value="Secondary School">Secondary School</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="institutionName" className="form-label">Institution Name</label>
                  <select
                    id="institutionName"
                    name="institutionName"
                    required
                    value={formData.institutionName}
                    onChange={handleInputChange}
                    className="input-field mt-2 border-sky-500/20"
                  >
                    <option value="">-- Select Issuing Institution --</option>
                    <option value="The University of Zambia">The University of Zambia (UNZA)</option>
                    <option value="Copperbelt University">Copperbelt University (CBU)</option>
                    <option value="Kapasa Makasa University">Kapasa Makasa University (KMU)</option>
                    <option value="Mulungushi University">Mulungushi University (MU)</option>
                    <option value="Evelyn Hone College">Evelyn Hone College (EHC)</option>
                    <option value="Zambia Centre for Accountancy Studies">Zambia Centre for Accountancy Studies (ZCAS)</option>
                    <option value="National Institute for Public Administration">National Institute for Public Administration (NIPA)</option>
                    <option value="Examinations Council of Zambia">Examinations Council of Zambia (ECZ)</option>
                    <option value="Other">Other (Type custom name...)</option>
                  </select>
                </div>

                {formData.institutionName === 'Other' && (
                  <div className="md:col-span-2">
                    <label htmlFor="customInstitutionName" className="form-label">Custom Institution Name</label>
                    <input
                      id="customInstitutionName"
                      name="customInstitutionName"
                      required
                      placeholder="Enter the full official name of the institution"
                      value={formData.customInstitutionName}
                      onChange={handleInputChange}
                      className="input-field mt-2"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label htmlFor="certificationNumber" className="form-label">Certification Number (e.g., Serial No, SEN, or Control Number)</label>
                  <input
                    id="certificationNumber"
                    name="certificationNumber"
                    required
                    placeholder="e.g. SEN 25087 or ECZ120938"
                    value={formData.certificationNumber}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 2: Student Details */}
            <div className="rounded-2xl border border-sky-500/5 bg-slate-900/10 p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="trust-icon-disc">
                  <IdentificationIcon className="h-5 w-5 text-emerald-400" />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary,#ffffff)] text-base">2. Student Details</h3>
                  <p className="trust-muted text-xs">Verify your identity details matching official records.</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="studentNumber" className="form-label">Student Number / Exam Number</label>
                  <input
                    id="studentNumber"
                    name="studentNumber"
                    required
                    placeholder="e.g. 2017010210"
                    value={formData.studentNumber}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="form-label">Full Name (must match National ID / NRC)</label>
                  <input
                    id="fullName"
                    name="fullName"
                    required
                    placeholder="e.g. Tobias Mwanza"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="nationalId" className="form-label">NRC / ID Number (Optional but recommended)</label>
                  <input
                    id="nationalId"
                    name="nationalId"
                    placeholder="e.g. 312695/31/1"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 3: Academic Record */}
            <div className="rounded-2xl border border-sky-500/5 bg-slate-900/10 p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="trust-icon-disc">
                  <AcademicCapIcon className="h-5 w-5 text-cyan-400" />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary,#ffffff)] text-base">3. Academic Record</h3>
                  <p className="trust-muted text-xs">Document the conferred program and academic achievement classification.</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="program" className="form-label">Program / Degree Type</label>
                  <input
                    id="program"
                    name="program"
                    required
                    placeholder="e.g. Bachelor of Arts or Grade 12 Certificate"
                    value={formData.program}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="programSpecification" className="form-label">Program Specification / Major</label>
                  <input
                    id="programSpecification"
                    name="programSpecification"
                    required
                    placeholder="e.g. Demography with Development Studies"
                    value={formData.programSpecification}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="awardClassification" className="form-label">Award Classification</label>
                  <select
                    id="awardClassification"
                    name="awardClassification"
                    required
                    value={formData.awardClassification}
                    onChange={handleInputChange}
                    className="input-field mt-2 border-sky-500/20"
                  >
                    <option value="Distinction">Distinction</option>
                    <option value="With Distinction">With Distinction</option>
                    <option value="Merit">Merit</option>
                    <option value="With Merit">With Merit</option>
                    <option value="Credit">Credit</option>
                    <option value="With Credit">With Credit</option>
                    <option value="Clear Pass">Clear Pass</option>
                    <option value="Pass">Pass</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Other">Other (Custom classification...)</option>
                  </select>
                </div>

                {formData.awardClassification === 'Other' && (
                  <div>
                    <label htmlFor="customAwardClassification" className="form-label">Custom Classification</label>
                    <input
                      id="customAwardClassification"
                      name="customAwardClassification"
                      required
                      placeholder="e.g. Honours, Upper Division"
                      value={formData.customAwardClassification}
                      onChange={handleInputChange}
                      className="input-field mt-2"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="graduationDate" className="form-label">Graduation / Conferment Date</label>
                  <input
                    id="graduationDate"
                    name="graduationDate"
                    type="date"
                    required
                    value={formData.graduationDate}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 4: Certificate Evidence */}
            <div className="rounded-2xl border border-sky-500/5 bg-slate-900/10 p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="trust-icon-disc">
                  <ArrowUpTrayIcon className="h-5 w-5 text-cyan-400" />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary,#ffffff)] text-base">4. Certificate Evidence</h3>
                  <p className="trust-muted text-xs">Upload your digital file and generate the cryptographic fingerprint.</p>
                </div>
              </div>

              <label htmlFor="submission-certificate-file" className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 bg-slate-900/60 hover:bg-slate-900/90 p-8 text-center transition">
                <SparklesIcon className="mx-auto h-10 w-10 text-blue-400" />
                <span className="mt-4 block text-sm font-semibold text-white">
                  {formData.certificateFile ? formData.certificateFile.name : 'Choose certificate file (AI Auto-Extraction Enabled)'}
                </span>
                <span className="text-slate-400 mt-2 block text-xs">PDF, PNG, or JPG formats. Automatically scans diploma & calculates hash.</span>
                <input
                  id="submission-certificate-file"
                  name="certificateFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>

              {!formData.certificateFile && (
                <div className="flex sm:hidden items-center justify-center gap-2">
                  <label
                    htmlFor="section4-camera-input"
                    className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white font-medium active:scale-95 shadow-md shadow-blue-900/30 text-center"
                  >
                    <CameraIcon className="h-4 w-4 shrink-0 text-white" />
                    <span>Take Photo with Camera</span>
                    <input
                      id="section4-camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </label>
                </div>
              )}

              {formData.certificateFile && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-700/80 bg-slate-900/90">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <SparklesIcon className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Save time typing: Auto-fill fields from this document.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleScanCertificate()}
                    disabled={scanning}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm disabled:opacity-50"
                  >
                    {scanning ? (
                      <>
                        <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-white" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-3.5 w-3.5 text-white" />
                        {scannedSummary ? 'Re-scan with AI' : '✨ Scan & Auto-Fill'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {formData.fileHash && (
                <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Cryptographic Fingerprint Generated</span>
                  </div>
                  <p className="font-mono text-xs text-slate-300 break-all bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    {formData.fileHash}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 p-5 text-right bg-slate-900/40">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner h-5 w-5" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Submit for approval
                </>
              )}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="trust-card">
            <p className="trust-section-kicker">Review notice</p>
            <h2 className="trust-title mt-3 text-xl font-semibold">Pending Request</h2>
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <ExclamationTriangleIcon className="h-5 w-5 flex-none text-amber-300" />
              <p className="text-sm leading-6 text-amber-100">
                This creates a pending submission only. An administrator must verify and approve it before blockchain issuance and anchoring to public ICP canister.
              </p>
            </div>
          </div>

          <div className="trust-card">
            <p className="trust-section-kicker">Preview</p>
            <h2 className="trust-title mt-3 text-xl font-semibold">Evidence Preview</h2>
            {previewUrl ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/60">
                {formData.certificateFile?.type === 'application/pdf' ? (
                  <div className="grid min-h-[12rem] place-items-center p-6 text-center">
                    <DocumentArrowUpIcon className="h-12 w-12 text-blue-400" />
                    <p className="text-slate-300 mt-3 text-sm font-medium">PDF Document Selected</p>
                    <p className="mt-1 break-all text-xs text-slate-400 font-mono">{formData.certificateFile.name}</p>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Submission preview" className="max-h-[24rem] w-full object-contain" />
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-500" />
                <p className="text-slate-400 mt-3 text-sm">No file selected yet.</p>
              </div>
            )}

            <div className="mt-4 p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <SparklesIcon className="h-4 w-4 text-blue-400" />
                  AI Vision Assistant
                </span>
                {scanning ? (
                  <span className="text-[11px] font-mono text-blue-300 animate-pulse">Scanning...</span>
                ) : scannedSummary ? (
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {scannedSummary.count} fields read
                  </span>
                ) : formData.certificateFile ? (
                  <span className="text-[10px] text-blue-400 font-mono">FILE READY</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">STANDBY</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {formData.certificateFile
                  ? 'Extract conferring institution, degree title, honors classification, and dates directly into the form.'
                  : 'Choose or drag a certificate file to automatically extract details with Gemini Vision.'}
              </p>
              {formData.certificateFile ? (
                <button
                  type="button"
                  onClick={() => handleScanCertificate()}
                  disabled={scanning}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-white" />
                      Analyzing Certificate...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-3.5 w-3.5 text-white" />
                      {scannedSummary ? 'Re-scan Certificate' : 'Scan & Auto-Fill Form'}
                    </>
                  )}
                </button>
              ) : (
                <label
                  htmlFor="sidebar-scan-file-input"
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer text-center font-medium"
                >
                  <DocumentArrowUpIcon className="h-3.5 w-3.5 text-blue-400" />
                  Select Document to Scan
                  <input
                    id="sidebar-scan-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => {
                      handleFileChange(e);
                      if (e.target.files?.[0]) {
                        handleScanCertificate(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default SubmitCertificateRequest;
