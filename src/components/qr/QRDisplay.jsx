import { useState, useEffect } from 'react';
import { generateQRCode } from '../../utils/qrUtils';
import { Button } from '../shared/Button';
import './QRDisplay.css';

export function QRDisplay({ photoUrl, onClose }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const qr = await generateQRCode(photoUrl, { width: 400 });
        setQrCode(qr);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [photoUrl]);

  return (
    <div className="qr-display">
      <div className="qr-content">
        <h2>Scan to Download</h2>
        {loading ? (
          <div className="qr-loading">Generating QR code...</div>
        ) : (
          <div className="qr-code-container">
            <img src={qrCode} alt="QR Code" className="qr-code" />
            <p className="qr-instructions">Scan with your phone to download the photo</p>
          </div>
        )}
        <Button onClick={onClose} variant="primary">Done</Button>
      </div>
    </div>
  );
}
