import { useEffect, useState, useRef } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../shared/Button';
import { loadImage } from '../../utils/imageUtils';
import './CameraCapture.css';

export function CameraCapture({ onCapture, onCancel, template, numPhotos = 1 }) {
  const { videoRef, startCamera, stopCamera, capturePhoto, error, isLoading } = useCamera();
  const [countdown, setCountdown] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const previewCanvasRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Live preview with template overlay
  useEffect(() => {
    if (!template || !videoRef.current || !previewCanvasRef.current || isLoading) return;

    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    let templateImg = null;
    let animationFrame = null;

    // Load template image once
    if (template && template.templateImage) {
      loadImage(template.templateImage).then(img => {
        templateImg = img;
      }).catch(err => {
        console.error('Error loading template:', err);
      });
    }

    const updatePreview = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Calculate aspect ratio to fit video
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let offsetX = 0;
        let offsetY = 0;

        if (videoAspect > canvasAspect) {
          // Video is wider
          drawHeight = canvas.width / videoAspect;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          // Video is taller
          drawWidth = canvas.height * videoAspect;
          offsetX = (canvas.width - drawWidth) / 2;
        }

        // Draw video frame
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        // Draw template overlay if available
        if (templateImg) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
        }
      }

      animationFrame = requestAnimationFrame(updatePreview);
    };

    updatePreview();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [template, videoRef, isLoading]);

  const captureSinglePhoto = () => {
    try {
      const photo = capturePhoto();
      const newPhotos = [...capturedPhotos, photo];
      setCapturedPhotos(newPhotos);
      
      // If we've captured all photos, call onCapture with all photos
      if (newPhotos.length >= numPhotos) {
        setIsCapturing(false);
        setCountdown(null);
        setCurrentPhotoIndex(0);
        onCapture(newPhotos);
      } else {
        // Continue to next photo
        // Auto-start next capture after 1 second
        setTimeout(() => {
          startNextCapture(newPhotos.length);
        }, 1000);
      }
    } catch (err) {
      alert('Failed to capture photo: ' + err.message);
      setIsCapturing(false);
      setCountdown(null);
      setCurrentPhotoIndex(0);
    }
  };

  const startNextCapture = (photoIndex = 0) => {
    if (photoIndex >= numPhotos) return;
    
    setCurrentPhotoIndex(photoIndex);
    setIsCapturing(true);
    setCountdown(5);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          // Auto-capture after countdown
          setTimeout(() => {
            captureSinglePhoto();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCapture = () => {
    if (countdown !== null || isCapturing) return; // Already counting down
    
    // Start capturing first photo
    setCapturedPhotos([]);
    startNextCapture(0);
  };

  const handleCancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setIsCapturing(false);
    setCountdown(null);
    setCurrentPhotoIndex(0);
    setCapturedPhotos([]);
    // Keep preview showing
  };

  if (error) {
    return (
      <div className="camera-error">
        <p>Error: {error}</p>
        <Button onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <div className="camera-preview-container">
        <div className="camera-preview-small">
          {isLoading ? (
            <div className="loading">Starting camera...</div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline className="video-preview" />
              <canvas ref={previewCanvasRef} className="preview-overlay" />
              {countdown !== null && countdown > 0 && (
                <div className="countdown-overlay">
                  <div className="countdown-number">{countdown}</div>
                  <div className="photo-progress">
                    Photo {currentPhotoIndex + 1} of {numPhotos}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="camera-controls">
        {countdown !== null || isCapturing ? (
          <>
            <Button onClick={handleCancelCountdown} variant="danger">Cancel</Button>
            <div className="countdown-text">
              {countdown > 0 ? `Capturing in ${countdown}...` : 'Processing...'}
              <div className="photo-counter">Photo {currentPhotoIndex + 1} of {numPhotos}</div>
            </div>
            <div style={{ width: '80px' }} />
          </>
        ) : (
          <>
            <Button onClick={onCancel} variant="secondary">Cancel</Button>
            <button className="capture-button" onClick={handleCapture} disabled={isLoading}>
              📷
            </button>
            <div style={{ width: '80px' }} />
          </>
        )}
      </div>
    </div>
  );
}
