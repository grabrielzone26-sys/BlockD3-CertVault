import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { createApiClient } from '../../lib/apiClient';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const REQUIRED_FIELDS = [
  'studentId',
  'studentName',
  'courseName',
  'program',
  'major',
  'cgpa',
  'graduationDate',
];

const splitCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const normalizeCertificateFile = (value) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const dataUrlMatch = trimmed.match(/^data:.*;base64,(.*)$/);
  return dataUrlMatch ? dataUrlMatch[1] : trimmed;
};

const parseCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error('The CSV file is empty.');
  }

  const headers = splitCsvLine(lines[0]);
  const missingFields = REQUIRED_FIELDS.filter((field) => !headers.includes(field));

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = headers.reduce((accumulator, header, headerIndex) => {
      accumulator[header] = values[headerIndex] || '';
      return accumulator;
    }, {});

    const preparedRow = {
      lineNumber: index + 2,
      studentId: row.studentId,
      studentName: row.studentName,
      courseName: row.courseName,
      program: row.program,
      major: row.major,
      cgpa: row.cgpa,
      graduationDate: row.graduationDate,
      certificateFile: normalizeCertificateFile(row.certificateFile),
    };

    const rowErrors = [];
    REQUIRED_FIELDS.forEach((field) => {
      if (!preparedRow[field]) {
        rowErrors.push(`${field} is required`);
      }
    });

    if (preparedRow.cgpa && Number.isNaN(Number(preparedRow.cgpa))) {
      rowErrors.push('cgpa must be numeric');
    }

    if (preparedRow.graduationDate && Number.isNaN(new Date(preparedRow.graduationDate).getTime())) {
      rowErrors.push('graduationDate must be a valid date');
    }

    return {
      ...preparedRow,
      isValidRow: rowErrors.length === 0,
      rowErrors,
    };
  });
};

const BatchCertificates = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [uploadedData, setUploadedData] = useState([]);

  const validRows = useMemo(
    () => uploadedData.filter((row) => row.isValidRow),
    [uploadedData]
  );

  const invalidRows = useMemo(
    () => uploadedData.filter((row) => !row.isValidRow),
    [uploadedData]
  );

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const csvData = parseCsv(String(loadEvent.target?.result || ''));
        setUploadedData(csvData);
        setResults(null);
        setError('');
      } catch (parseError) {
        console.error('Batch certificate CSV parse error:', parseError);
        setUploadedData([]);
        setResults(null);
        setError(parseError.message || 'Failed to parse the CSV file.');
      }
    };
    reader.onerror = () => {
      setUploadedData([]);
      setResults(null);
      setError('Error reading the CSV file.');
    };
    reader.readAsText(selectedFile);
  };

  const processCertificates = async () => {
    if (!validRows.length) {
      setError('No valid certificate rows are ready for issuance.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const certificates = validRows.map((student) => ({
        studentId: student.studentId,
        courseName: student.courseName,
        certificateFile: student.certificateFile,
        metadata: {
          studentName: student.studentName,
          program: student.program,
          major: student.major,
          cgpa: Number(student.cgpa),
          graduationDate: new Date(student.graduationDate).toISOString(),
          issueDate: new Date().toISOString(),
        },
        storeFileInDatabase: true,
      }));

      const apiClient = createApiClient();
      const response = await apiClient.post('/api/batch/certificates', { certificates });
      setResults(response.data.data);

      toast.success(
        `Issued ${response.data.data.successful} of ${response.data.data.totalProcessed} certificates.`
      );
    } catch (requestError) {
      console.error('Batch certificate error:', requestError);
      setError(requestError.response?.data?.error || 'Failed to process certificates.');
      toast.error('Certificate batch processing failed');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setUploadedData([]);
    setResults(null);
    setError('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="tech-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="status-chip">Batch issuance rail</span>
            <h1 className="mt-4 text-3xl font-semibold text-gray-900">
              Bulk certificate issuance
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Upload a CSV backed by real base64 certificate files. The frontend sends the actual
              certificate payloads to the batch issuance API for processing.
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Valid rows</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{validRows.length}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Needs review</p>
              <p className="mt-2 text-3xl font-semibold text-rose-600">{invalidRows.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="tech-card p-6">
          <h2 className="text-xl font-medium text-gray-900">Upload CSV manifest</h2>
          <p className="mt-2 text-sm text-gray-500">
            Required columns: {REQUIRED_FIELDS.join(', ')}. `certificateFile` must contain raw base64
            or a data URL for the certificate PDF/image.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-8 text-center">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600">
              Upload a real issuance manifest for bulk processing.
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
              Select CSV
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={processCertificates}
              disabled={loading || !validRows.length}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="spinner h-5 w-5 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <DocumentCheckIcon className="h-5 w-5 mr-2" />
                  Issue valid rows
                </>
              )}
            </button>

            <button type="button" onClick={resetSession} className="btn-secondary">
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Clear session
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="tech-card p-6">
            <h2 className="text-xl font-medium text-gray-900">Manifest checks</h2>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li>Each row must carry a real certificate payload in `certificateFile`.</li>
              <li>Rows with missing or malformed values are blocked before the API request.</li>
              <li>The backend still handles Fabric/IPFS recording after upload.</li>
            </ul>
          </div>

          {invalidRows.length > 0 && (
            <div className="tech-card p-6">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-rose-500" />
                <div>
                  <h2 className="text-xl font-medium text-gray-900">Rows requiring review</h2>
                  <p className="text-sm text-gray-500">
                    Fix these records in the CSV before re-uploading.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {invalidRows.slice(0, 6).map((row) => (
                  <div key={row.lineNumber} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-800">Line {row.lineNumber}</p>
                    <p className="mt-1 text-sm text-rose-700">{row.studentName || row.studentId || 'Unknown row'}</p>
                    <ul className="mt-2 space-y-1 text-xs text-rose-700">
                      {row.rowErrors.map((rowError) => (
                        <li key={rowError}>{rowError}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadedData.length > 0 && (
        <div className="tech-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-medium text-gray-900">Manifest preview</h2>
              <p className="text-sm text-gray-500">
                Showing the first rows from the uploaded manifest.
              </p>
            </div>
            <span className="status-chip">
              {uploadedData.length} rows loaded
            </span>
          </div>

          <div className="mt-6 hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Line</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {uploadedData.slice(0, 8).map((row) => (
                  <tr key={row.lineNumber}>
                    <td className="px-4 py-4 text-sm text-gray-500">{row.lineNumber}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{row.studentName}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.courseName}</td>
                    <td className="px-4 py-4 text-sm">
                      {row.isValidRow ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircleIcon className="mr-1 h-4 w-4" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                          <XCircleIcon className="mr-1 h-4 w-4" />
                          Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 md:hidden">
            {uploadedData.slice(0, 8).map((row) => (
              <div key={row.lineNumber} className="glass-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.studentName}</p>
                    <p className="text-sm text-gray-500">{row.courseName}</p>
                    <p className="mt-1 text-xs text-gray-500">Line {row.lineNumber}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.isValidRow ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                    {row.isValidRow ? 'Ready' : 'Review'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="tech-card p-6">
          <h2 className="text-xl font-medium text-gray-900">Issuance results</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{results.totalProcessed}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 border-l-4 border-green-500">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Successful</p>
              <p className="mt-2 text-3xl font-semibold text-green-600">{results.successful}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 border-l-4 border-rose-500">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Failed</p>
              <p className="mt-2 text-3xl font-semibold text-rose-600">{results.failed}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchCertificates;
