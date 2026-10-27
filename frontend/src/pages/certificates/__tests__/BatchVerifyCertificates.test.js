import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import jsQR from 'jsqr';
import BatchVerifyCertificates from '../BatchVerifyCertificates';

const mockApiClient = {
  post: jest.fn(),
};

jest.mock('jsqr', () => jest.fn());

jest.mock('../../../lib/apiClient', () => ({
  __esModule: true,
  createApiClient: jest.fn(() => mockApiClient),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BatchVerifyCertificates', () => {
  const originalFileReader = global.FileReader;
  const originalImage = global.Image;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    jest.clearAllMocks();
    jsQR.mockReturnValue({ data: 'https://example.com/verify/CERT-QR-001' });

    global.FileReader = class {
      readAsDataURL() {
        setTimeout(() => {
          this.result = 'data:image/png;base64,qr-image';
          this.onload?.();
        }, 0);
      }
    };

    global.Image = class {
      set src(_value) {
        setTimeout(() => {
          this.width = 256;
          this.height = 256;
          this.onload?.();
        }, 0);
      }
    };

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: jest.fn(() => ({
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({
              data: new Uint8ClampedArray(256 * 256 * 4),
              width: 256,
              height: 256,
            })),
          })),
        };
      }

      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    document.createElement.mockRestore();
    global.FileReader = originalFileReader;
    global.Image = originalImage;
  });

  it('decodes uploaded QR screenshots into the verification queue', async () => {
    render(
      <MemoryRouter>
        <BatchVerifyCertificates />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Select images/i, { selector: 'input' });
    const file = new File(['fake image'], 'qr-shot.png', { type: 'image/png' });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Certificate IDs/i)).toHaveValue('CERT-QR-001');
    });

    expect(screen.getByText(/qr-shot\.png/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CERT-QR-001/i).length).toBeGreaterThan(0);
  });
});
