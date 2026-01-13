import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { photoStorage } from '../../services/photoStorage';
import './DownloadPage.css';

export function DownloadPage() {
  const { id } = useParams();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPhoto = async () => {
      if (!id) {
        setError('Invalid photo ID');
        setLoading(false);
        return;
      }

      try {
        const photoData = await photoStorage.getPhoto(id);
        if (!photoData) {
          setError('Photo not found or expired');
        } else {
          setPhoto(photoData);
        }
      } catch (err) {
        console.error('Error loading photo:', err);
        setError('Failed to load photo');
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [id]);

  const handleDownload = () => {
    if (!photo) return;

    const link = document.createElement('a');
    link.href = photo.imageData;
    link.download = `photobooth-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="download-page">
        <div className="loading">Loading photo...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="download-page">
        <div className="error">
          <h1>Oops!</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!photo) {
    return null;
  }

  return (
    <div className="download-page">
      <div className="download-content">
        <h1>Your Photo</h1>
        <div className="photo-container">
          <img src={photo.imageData} alt="Photobooth photo" />
        </div>
        <button className="download-button" onClick={handleDownload}>
          Download Photo
        </button>
        <p className="expiry-info">
          This photo will expire in {Math.ceil((photo.expiresAt - Date.now()) / (1000 * 60 * 60))} hours
        </p>
      </div>
    </div>
  );
}
