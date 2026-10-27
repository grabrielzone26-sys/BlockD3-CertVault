import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QRCodeDisplay from '../QRCodeDisplay';
import QRCode from 'qrcode';

// Mock qrcode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

describe('QRCodeDisplay', () => {
  const mockCertificate = {
    certificateId: 'CERT123',
    documentHash: 'hash123',
  };

  beforeEach(() => {
    // Clear mock calls between tests
    QRCode.toDataURL.mockClear();
    // Mock successful QR code generation
    QRCode.toDataURL.mockImplementation((data, options) => {
      return Promise.resolve('data:image/png;base64,mockQRCode');
    });
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<QRCodeDisplay certificate={mockCertificate} />);
    expect(getByText('Loading QR Code...')).toBeInTheDocument();
  });

  it('generates QR code with correct data', async () => {
    const { container } = render(<QRCodeDisplay certificate={mockCertificate} />);

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img.alt).toBe('Certificate QR Code');
      expect(img.className).toContain('w-64 h-64');
    });

    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        errorCorrectionLevel: 'H'
      })
    );
  });

  it('handles null certificate prop', () => {
    const { getByText } = render(<QRCodeDisplay certificate={null} />);
    expect(getByText('Loading QR Code...')).toBeInTheDocument();
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });
});
