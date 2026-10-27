import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const QRCodeDisplay = ({ certificate }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!certificate) {
      setQrDataUrl('');
      return;
    }

    const qrData = `${window.location.origin}/verify/${certificate.certificateId}`;

    QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H' })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        setQrDataUrl('');
      });
  }, [certificate]);

  if (!qrDataUrl) {
    return <div>Loading QR Code...</div>;
  }

  return <img src={qrDataUrl} alt="Certificate QR Code" className="w-64 h-64" />;
};

export default QRCodeDisplay;
