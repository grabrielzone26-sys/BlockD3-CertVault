import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import graduationImage from '../../assets/images/view-3d-book-with-graduation-cap.jpg';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  AcademicCapIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const INSTITUTIONS = [
  { code: 'UNZA', name: 'THE UNIVERSITY OF ZAMBIA', label: 'The University of Zambia (UNZA)' },
  { code: 'CBU', name: 'THE COPPERBELT UNIVERSITY', label: 'The Copperbelt University (CBU)' },
  { code: 'MU', name: 'MULUNGUSHI UNIVERSITY', label: 'Mulungushi University (MU)' },
  { code: 'ZCAS', name: 'ZCAS UNIVERSITY', label: 'ZCAS University (ZCAS)' },
  { code: 'NIPA', name: 'NATIONAL INSTITUTE OF PUBLIC ADMINISTRATION', label: 'National Institute of Public Administration (NIPA)' },
  { code: 'KMU', name: 'KAPASA MAKASA UNIVERSITY', label: 'Kapasa Makasa University (KMU)' },
  { code: 'OTHER', name: 'Other', label: 'Other (Type custom name...)' },
];

const IssueCertificate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institutionType: 'University',
    institutionCode: 'UNZA',
    institutionName: 'THE UNIVERSITY OF ZAMBIA',
    customInstitutionName: '',
    certificationNumber: '',
    studentNumber: '',
    fullName: '',
    nationalId: '',
    program: '',
    programSpecification: '',
    awardClassification: 'With Merit',
    customAwardClassification: '',
    graduationDate: '',
  });

  useEffect(() => {
    if (user?.profile?.organization) {
      const org = user.profile.organization.toUpperCase();
      const matched = INSTITUTIONS.find(i => i.code !== 'OTHER' && (org.includes(i.code) || org.includes(i.name.toUpperCase())));
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          institutionCode: matched.code,
          institutionName: matched.name,
        }));
      }
    }
  }, [user]);

  const handleInstitutionChange = (e) => {
    const selectedCode = e.target.value;
    const inst = INSTITUTIONS.find((i) => i.code === selectedCode);
    setFormData((prev) => ({
      ...prev,
      institutionCode: selectedCode,
      institutionName: inst ? inst.name : selectedCode,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      const selectedInstitutionName =
        formData.institutionCode === 'OTHER' ? formData.customInstitutionName : formData.institutionName;
      const selectedAwardClassification =
        formData.awardClassification === 'Other' ? formData.customAwardClassification : formData.awardClassification;

      // Packaged structured JSON payload
      const certificatePayload = {
        institutionCode: formData.institutionCode,
        university: selectedInstitutionName,
        issuerDetails: {
          institutionType: formData.institutionType,
          institutionCode: formData.institutionCode,
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
          programSpecification: formData.programSpecification || '',
          major: formData.programSpecification || '',
          awardClassification: selectedAwardClassification,
          graduationDate: formData.graduationDate,
        },
        metadata: {
          institutionCode: formData.institutionCode,
          university: selectedInstitutionName,
          major: formData.programSpecification || '',
          program: formData.program,
          awardClassification: selectedAwardClassification,
          graduationDate: formData.graduationDate,
        },
        documentEvidence: {},
        certificateFile: undefined,
        fileName: null,
        fileType: null,
      };

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await apiClient.post('/api/certificates', certificatePayload);

      toast.success(response.data.message || 'Certificate issued and recorded on Fabric successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Certificate issuance error:', error);
      toast.error(error.response?.data?.error || 'Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="trust-dashboard space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="trust-hero">
          <p className="trust-section-kicker">Zambian Document Issuance control plane</p>
          <h1 className="trust-title mt-5 text-4xl font-semibold md:text-5xl">Create. Seal. Anchor.</h1>
          <p className="trust-muted mt-4 max-w-2xl text-base leading-7">
            Issue certified credentials for Zambian institutions. The private ledger records full metadata while a cryptographic fingerprint is anchored publicly on ICP.
          </p>

          <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-1.5 sm:gap-4">
            <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Authority</p>
                <BuildingOfficeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">Issuer</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">Certifying body</p>
              </div>
            </div>
            <div className="trust-card trust-card-glow p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Identity</p>
                <IdentificationIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">Student</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">Official records</p>
              </div>
            </div>
            <div className="trust-card p-2.5 sm:p-5 flex flex-col justify-between min-h-[4.75rem] sm:min-h-[7rem]">
              <div className="flex items-center justify-between">
                <p className="trust-section-kicker text-[10px] sm:text-xs truncate">Anchor</p>
                <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 shrink-0" />
              </div>
              <div className="mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">Public ICP</p>
                <p className="trust-muted mt-0.5 text-[10px] sm:text-xs truncate">Deterministic hash</p>
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
            Academic Credential Anchor
          </span>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="trust-table">
          <div className="border-b border-sky-500/10 p-5">
            <p className="trust-section-kicker">Zambian Certificate Profile</p>
            <h2 className="trust-title mt-3 text-2xl font-semibold">Issue Academic Certificate</h2>
            <p className="trust-muted mt-2 text-sm">
              Please enter the certificate details below. Ensure fields match physical documentation.
            </p>
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
                    className="input-field mt-2"
                  >
                    <option value="University">University</option>
                    <option value="College / TEVETA">College / TEVETA</option>
                    <option value="Secondary School">Secondary School</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="institutionCode" className="form-label">Conferring Institution / University</label>
                  <select
                    id="institutionCode"
                    name="institutionCode"
                    required
                    value={formData.institutionCode}
                    onChange={handleInstitutionChange}
                    className="input-field mt-2"
                  >
                    {INSTITUTIONS.map((inst) => (
                      <option key={inst.code} value={inst.code}>
                        {inst.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.institutionCode === 'OTHER' && (
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
                  <label htmlFor="certificationNumber" className="form-label">
                    Certification Number / Institutional Serial (e.g. SEN 25087, Serial No: 000857, MU/D 0008194)
                  </label>
                  <input
                    id="certificationNumber"
                    name="certificationNumber"
                    required
                    placeholder={
                      formData.institutionCode === 'UNZA' ? 'e.g. SEN 25087' :
                      formData.institutionCode === 'ZCAS' ? 'e.g. Serial No: 000857' :
                      formData.institutionCode === 'MU' ? 'e.g. MU/D 0008194' :
                      formData.institutionCode === 'CBU' ? 'e.g. CBU/SEN 10492' :
                      formData.institutionCode === 'NIPA' ? 'e.g. NIPA/SN 004192' :
                      formData.institutionCode === 'KMU' ? 'e.g. KMU/SEN 08310' :
                      'e.g. SEN 25087'
                    }
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
                  <p className="trust-muted text-xs">Verify recipient identity and national registration records.</p>
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
                    placeholder="e.g. Bachelor of Arts or Master of Science"
                    value={formData.program}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="programSpecification" className="form-label">
                    Major / Specialization (Optional)
                  </label>
                  <input
                    id="programSpecification"
                    name="programSpecification"
                    placeholder="e.g. Public Administration with Development Studies"
                    value={formData.programSpecification}
                    onChange={handleInputChange}
                    className="input-field mt-2"
                  />
                  <p className="trust-muted mt-1 text-[11px]">
                    Rendered centered in parenthetical Forest Green below the degree title.
                  </p>
                </div>

                <div>
                  <label htmlFor="awardClassification" className="form-label">Award Classification</label>
                  <select
                    id="awardClassification"
                    name="awardClassification"
                    required
                    value={formData.awardClassification}
                    onChange={handleInputChange}
                    className="input-field mt-2"
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

            {/* Auto-Generation Synthesis Summary */}
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl flex items-start sm:items-center gap-3 text-cyan-300 text-xs">
              <SparklesIcon className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5 sm:mt-0" />
              <span>
                ✦ <strong>Auto-Generation Active:</strong> The system will automatically synthesize the official A4 Portrait Institutional Security Certificate PDF with University Crest, Red Wafer Seal, Dual-Ledger Proof Bar, and dynamic QR code upon issuance.
              </span>
            </div>
          </div>

          <div className="border-t border-sky-500/10 p-5 text-right bg-slate-900/10">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <div className="spinner h-5 w-5" />
                  Anchor & Issuing...
                </>
              ) : (
                <>
                  <CheckBadgeIcon className="h-5 w-5" />
                  Issue Certificate
                </>
              )}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="trust-card">
            <p className="trust-section-kicker">Review state</p>
            <h2 className="trust-title mt-3 text-xl font-semibold">Before issuing</h2>
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <ExclamationTriangleIcon className="h-5 w-5 flex-none text-amber-300" />
              <p className="text-sm leading-6 text-amber-100">
                Once recorded, certificate metadata is permanent on the private ledger, and the fingerprint is anchored immutably on the public Internet Computer. Double check all names and numbers.
              </p>
            </div>
          </div>

          <div className="trust-card">
            <p className="trust-section-kicker">Credential Synthesis</p>
            <h2 className="trust-title mt-3 text-xl font-semibold">Official Certificate Output</h2>
            <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                <SparklesIcon className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>Automated Synthesis Active</span>
              </div>
              <p className="text-xs text-sky-200/90 leading-relaxed">
                The system automatically synthesizes the official A4 Portrait Institutional Security Certificate PDF with University Crest, Red Wafer Seal, Dual-Ledger Proof Bar, and dynamic verification QR code upon issuance.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default IssueCertificate;
