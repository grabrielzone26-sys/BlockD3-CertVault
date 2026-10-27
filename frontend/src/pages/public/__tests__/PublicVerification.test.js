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
import PublicVerification from '../PublicVerification';

describe('PublicVerification QR Scanner', () => {
  const mockStream = {
    getTracks: () => [{ stop: jest.fn() }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLMediaElement.prototype.play = jest.fn();
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream),
    };

    // Mock video properties for JSDOM
    Object.defineProperty(window.HTMLVideoElement.prototype, 'readyState', {
      get: () => 4, // HAVE_ENOUGH_DATA
      configurable: true,
    });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', {
      get: () => 640,
      configurable: true,
    });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'videoHeight', {
      get: () => 480,
      configurable: true,
    });

    jsQR.mockReturnValue(null);
    createPublicApiClient.mockReturnValue(mockApiClient);
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          isValid: true,
          status: 'valid',
          blockchainVerified: true,
          certificate: {
            certificateId: 'CERT123',
            courseName: 'Computer Science',
            studentId: 'STUDENT456',
            metadata: {
              studentName: 'John Public',
              program: 'B.Sc.',
              major: 'AI',
              cgpa: 3.9,
              issueDate: new Date().toISOString(),
              graduationDate: new Date().toISOString(),
            },
          },
        },
      },
    });

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

  const renderPage = (initialEntry = '/verify') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/verify" element={<PublicVerification />} />
          <Route path="/verify/:certificateId" element={<PublicVerification />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders public verification portal in manual mode', () => {
    const { getByPlaceholderText, queryByTestId } = renderPage();
    expect(getByPlaceholderText(/enter certificate id/i)).toBeInTheDocument();
    expect(queryByTestId('qr-video')).not.toBeInTheDocument();
  });

  it('switches to QR scanner mode and requests camera stream', async () => {
    const { getByRole, getByTestId } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /scan qr/i }));
    });

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
      });
      expect(getByTestId('qr-video')).toBeInTheDocument();
    });
  });

  it('stops scanning and switches back to manual mode when requested', async () => {
    const stopTrackMock = jest.fn();
    global.navigator.mediaDevices.getUserMedia.mockResolvedValueOnce({
      getTracks: () => [{ stop: stopTrackMock }],
    });

    const { getByRole, queryByTestId } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /scan qr/i }));
    });

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /manual id/i }));
    });

    expect(queryByTestId('qr-video')).not.toBeInTheDocument();
    expect(stopTrackMock).toHaveBeenCalled();
  });

  it('decodes QR code from camera frame and verifies certificate', async () => {
    jsQR
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ data: 'https://blockd3.app/verify/SCANNED_CERT_789' });

    const { getByRole, getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /scan qr/i }));
    });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/certificates/verify/SCANNED_CERT_789');
      expect(toast.success).toHaveBeenCalledWith('Certificate ID scanned successfully!');
      expect(getByText('John Public')).toBeInTheDocument();
      expect(getByText('Computer Science')).toBeInTheDocument();
    });
  });

  it('shows error toast when camera access is denied', async () => {
    global.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    const { getByRole } = renderPage();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /scan qr/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not access camera');
    });
  });
});
