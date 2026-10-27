const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    })),
  },
}));

jest.mock('../../../lib/apiClient', () => ({
  __esModule: true,
  createApiClient: jest.fn(),
  createPublicApiClient: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';
import VerifyCertificate from '../VerifyCertificate';
import ViewCertificate from '../ViewCertificate';
import ErrorBoundary from '../../../components/ErrorBoundary';
import AuthContext from '../../../contexts/AuthContext';
const { createApiClient, createPublicApiClient } = require('../../../lib/apiClient');

const mockCertificate = {
  certificateId: 'CERT123',
  studentId: 'STD001',
  transactionHash: '0x123...abc',
  ipfsHash: 'Qm...xyz',
  documentHash: 'hash123',
  isValid: true,
  metadata: {
    studentName: 'John Doe',
    program: 'Computer Science',
    major: 'Software Engineering',
    graduationDate: '2023-06-15',
    issueDate: '2023-06-20',
    cgpa: 3.8,
  },
};

const mockNetworkInfo = {
  networkName: 'Internet Computer',
  canisterId: 'aaaaa-aa',
};

const renderWithContext = (ui, initialEntry = '/') =>
  render(
    <AuthContext.Provider
      value={{
        user: { role: 'admin', studentId: 'STD001' },
        loading: false,
        isAdmin: () => true,
        isStudent: () => false,
        isVerifier: () => false,
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <ErrorBoundary>{ui}</ErrorBoundary>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('Certificate Verification Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    createApiClient.mockReturnValue(mockApiClient);
    createPublicApiClient.mockReturnValue(mockApiClient);

    mockApiClient.get.mockImplementation((url) => {
      if (url === '/api/blockchain/network') {
        return Promise.resolve({ data: { data: mockNetworkInfo } });
      }

      if (url === '/api/certificates/CERT123') {
        return Promise.resolve({ data: { data: mockCertificate } });
      }

      if (url === '/api/certificates/verify/CERT123') {
        return Promise.resolve({
          data: {
            data: {
              isValid: true,
              certificate: mockCertificate,
              blockchainVerified: true,
              status: 'valid',
            },
          },
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    mockApiClient.post.mockResolvedValue({ data: { hash: 'hash123' } });
    mockApiClient.put.mockResolvedValue({
      data: {
        data: { ...mockCertificate, isValid: false },
        message: 'Certificate revoked successfully',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('completes the full manual verification flow', async () => {
    renderWithContext(
      <Routes>
        <Route path="/" element={<VerifyCertificate />} />
      </Routes>
    );

    fireEvent.change(screen.getByTestId('certificate-id-input'), {
      target: { value: 'CERT123' },
    });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('certificate-document-input');
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/utils/calculate-hash', {
        fileContent: expect.any(String),
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Verify Certificate/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Valid Certificate/i)).toBeInTheDocument();
    });

    expect(screen.getByText(mockCertificate.transactionHash)).toBeInTheDocument();
    expect(screen.getByText(mockCertificate.ipfsHash)).toBeInTheDocument();
    expect(screen.getByText(mockNetworkInfo.networkName)).toBeInTheDocument();
  });

  it('renders certificate details and opens the revoke modal', async () => {
    renderWithContext(
      <Routes>
        <Route path="/certificates/:id" element={<ViewCertificate />} />
      </Routes>,
      '/certificates/CERT123'
    );

    await waitFor(() => {
      expect(screen.getAllByText(mockCertificate.metadata.studentName).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(mockCertificate.metadata.program).length).toBeGreaterThan(0);
    expect(screen.getByText(mockCertificate.transactionHash)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    expect(screen.getByText(/Revocation reason/i)).toBeInTheDocument();
  });

  it('submits certificate revocation from the modal', async () => {
    renderWithContext(
      <Routes>
        <Route path="/certificates/:id" element={<ViewCertificate />} />
      </Routes>,
      '/certificates/CERT123'
    );

    await waitFor(() => {
      expect(screen.getByText(/Academic Certificate/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    fireEvent.change(screen.getByLabelText(/Revocation reason/i), {
      target: { value: 'Issued in error' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm revoke/i }));
    });

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/certificates/revoke/CERT123', {
        reason: 'Issued in error',
      });
      expect(toast.success).toHaveBeenCalledWith('Certificate revoked successfully');
    });
  });

  it('shows certificate loading errors gracefully', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ data: { data: mockNetworkInfo } })
      .mockRejectedValueOnce(new Error('Failed to load certificate'));

    renderWithContext(
      <Routes>
        <Route path="/certificates/:id" element={<ViewCertificate />} />
      </Routes>,
      '/certificates/CERT123'
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading certificate/i)).toBeInTheDocument();
    });
  });
});
