import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.mock('../../../lib/apiClient', () => ({
  __esModule: true,
  createPublicApiClient: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('jsqr', () => jest.fn());

const { toast } = require('react-toastify');
const jsQR = require('jsqr');
const { createPublicApiClient } = require('../../../lib/apiClient');
import VerifyCertificate from '../VerifyCertificate';

describe('VerifyCertificate', () => {
  const mockStream = {
    getTracks: () => [{ stop: jest.fn() }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLMediaElement.prototype.play = jest.fn();
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream),
    };

    jsQR.mockReturnValue(null);
    createPublicApiClient.mockReturnValue(mockApiClient);
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          networkName: 'Local ICP',
          canisterId: 'aaaaa-aa',
        },
      },
    });
    mockApiClient.post.mockResolvedValue({ data: { hash: 'hash123' } });

    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(640 * 480 * 4),
        width: 640,
        height: 480,
      })),
    }));

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => setTimeout(cb, 0));
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
  });

  const renderPage = (initialEntry = '/verify-certificate') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/verify-certificate" element={<VerifyCertificate />} />
          <Route path="/verify-certificate/scan" element={<VerifyCertificate />} />
        </Routes>
      </MemoryRouter>
    );

  it('switches between manual and QR verification modes', async () => {
    const { getByRole, queryByTestId } = renderPage();

    expect(queryByTestId('qr-video')).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: /qr code scanner/i }));
    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
      });
    });

    fireEvent.click(getByRole('button', { name: /manual verification/i }));
    expect(queryByTestId('qr-video')).not.toBeInTheDocument();
  });

  it('verifies a certificate manually with an uploaded document hash', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ data: { data: { networkName: 'Local ICP', canisterId: 'aaaaa-aa' } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            isValid: true,
            blockchainVerified: true,
            status: 'valid',
            certificate: {
              certificateId: 'CERT123',
              documentHash: 'hash123',
              metadata: {
                studentName: 'John Doe',
                issueDate: new Date().toISOString(),
              },
            },
          },
        },
      });

    const { getByPlaceholderText, getByRole, getByTestId } = renderPage();

    fireEvent.change(getByPlaceholderText(/enter the certificate id/i), {
      target: { value: 'CERT123' },
    });

    const file = new File(['dummy content'], 'certificate.pdf', { type: 'application/pdf' });
    const fileInput = getByTestId('certificate-document-input');
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/utils/calculate-hash', {
        fileContent: expect.any(String),
      });
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /verify certificate/i }));
    });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/certificates/verify/CERT123', {
        params: { documentHash: 'hash123' },
      });
      expect(toast.success).toHaveBeenCalledWith('Certificate verified successfully on blockchain!');
    });
  });

  it('starts camera scanning immediately on the scan route', async () => {
    renderPage('/verify-certificate/scan');

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  it('handles camera access errors', async () => {
    global.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Camera access denied'));

    const { getByRole } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /qr code scanner/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not access camera');
    });
  });

  it('stops the active stream on unmount', async () => {
    const stopTrackMock = jest.fn();
    global.navigator.mediaDevices.getUserMedia.mockResolvedValueOnce({
      getTracks: () => [{ stop: stopTrackMock }],
    });

    const { getByRole, unmount } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /qr code scanner/i }));
    });

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    unmount();
    expect(stopTrackMock).toHaveBeenCalled();
  });
});
