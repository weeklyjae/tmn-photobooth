import { useEffect, useState, useRef } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../shared/Button';
import './CameraCapture.css';

// Component to show template with photos in slots
function StripPreviewWithSlots({ template, displayPhotos }) {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      const updateSize = () => {
        // Use the *rendered* box size, not container size (prevents misalignment)
        const rect = img.getBoundingClientRect();
        if (img.naturalWidth > 0 && img.naturalHeight > 0 && rect.width > 0 && rect.height > 0) {
          setImgSize({
            width: rect.width,
            height: rect.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          });
        }
      };

      // If the image is cached, onload might not fire; measure on next frame
      const raf = requestAnimationFrame(updateSize);
      img.addEventListener('load', updateSize);

      // Keep it aligned if layout changes (retake banner, font loads, etc.)
      let ro = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => updateSize());
        ro.observe(img);
      } else {
        window.addEventListener('resize', updateSize);
      }

      return () => {
        cancelAnimationFrame(raf);
        img.removeEventListener('load', updateSize);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', updateSize);
      };
    }
  }, [template.templateImage]);

  const sortedSlots = template.slots ? [...template.slots].sort((a, b) => a.y - b.y) : [];

  // Calculate scale factors
  const scaleX = imgSize.naturalWidth > 0 ? imgSize.width / imgSize.naturalWidth : 1;
  const scaleY = imgSize.naturalHeight > 0 ? imgSize.height / imgSize.naturalHeight : 1;

  return (
    <div className="strip-preview-wrapper">
      {/* Template image container - used for positioning reference */}
      <div className="template-image-container">
        {/* Photos layer (underneath) */}
        {imgSize.naturalWidth > 0 && (
          <div 
            className="slot-photos-layer"
            style={{
              width: `${imgSize.width}px`,
              height: `${imgSize.height}px`,
            }}
          >
            {/* Render only captured photos, one per slot */}
            {displayPhotos.map((photoObj, photoIndex) => {
              // Only render if we have a corresponding slot
              if (photoIndex >= sortedSlots.length) return null;
              
              const slot = sortedSlots[photoIndex];
              if (!slot) return null;
              
              const photo = typeof photoObj === 'string' ? photoObj : photoObj.data;
              const photoId = typeof photoObj === 'string' ? photoIndex : photoObj.id;
              
              // Each photo renders once in its designated slot (by index)
              return (
                <div
                  key={`photo-${photoId}-slot-${slot.id}`}
                  className="slot-photo-container"
                  style={{
                    position: 'absolute',
                    left: `${slot.x * scaleX}px`,
                    top: `${slot.y * scaleY}px`,
                    width: `${slot.width * scaleX}px`,
                    height: `${slot.height * scaleY}px`,
                  }}
                >
                  <img 
                    src={photo} 
                    alt={`Photo ${photoIndex + 1} in Slot ${photoIndex + 1}`}
                    className="slot-photo-image"
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Template layer (on top) */}
        <img 
          ref={imgRef}
          src={template.templateImage} 
          alt="Template" 
          className="strip-preview-image" 
        />
      </div>
    </div>
  );
}

export function CameraCapture({ onCapture, onCancel, template, numPhotos = 1, retakeIndex = null, existingPhotos = [] }) {
  const { videoRef, startCamera, stopCamera, capturePhotoAsync, error, isLoading } = useCamera();
  const [countdown, setCountdown] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const photoIdCounterRef = useRef(0);
  const lastCaptureRef = useRef(null);
  const runIdRef = useRef(0);
  const capturedRef = useRef([]);

  useEffect(() => {
    startCamera();
    return () => {
      runIdRef.current += 1; // cancel any running capture loops
      stopCamera();
    };
  }, []);

  // Simple preview - just show template with photo thumbnails (no canvas composition)
  // Canvas composition was causing GPU crashes

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateCapturedPhotosState = () => {
    const arr = capturedRef.current.map((dataUrl, i) => ({
      id: `cap-${i}`,
      data: dataUrl,
      index: i
    }));
    setCapturedPhotos(arr);
  };

  const captureUniqueFrame = async (runId) => {
    // Try hard to not accept the same frame twice. If driver keeps returning same buffer,
    // we keep retrying and DO NOT advance the slot index.
    for (let attempt = 0; attempt < 12; attempt++) {
      if (runIdRef.current !== runId) return null;

      const photo = await capturePhotoAsync({
        avoidDuplicateAgainst: lastCaptureRef.current,
        maxAttempts: 10
      });

      if (runIdRef.current !== runId) return null;

      // If we still got the same as lastCaptureRef, wait and retry without advancing.
      if (lastCaptureRef.current && photo === lastCaptureRef.current) {
        await sleep(120);
        continue;
      }

      return photo;
    }

    // As a last resort, return whatever capturePhotoAsync gave us (better UX than hard fail)
    return await capturePhotoAsync({ avoidDuplicateAgainst: null, maxAttempts: 3 });
  };

  const runCaptureSequence = async ({ totalShots, runId }) => {
    try {
      setIsCapturing(true);

      for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
        if (runIdRef.current !== runId) return;

        // For UI label: if retaking a slot, show that slot number; otherwise show sequential
        const uiIndex = retakeIndex !== null && retakeIndex !== undefined ? retakeIndex : shotIndex;
        setCurrentPhotoIndex(uiIndex);

        // Countdown 5..1
        for (let t = 5; t >= 1; t--) {
          if (runIdRef.current !== runId) return;
          setCountdown(t);
          await sleep(1000);
        }
        setCountdown(null);

        if (runIdRef.current !== runId) return;
        if (!videoRef.current || !videoRef.current.srcObject) {
          throw new Error('Camera not started');
        }

        // Small settle delay (lets webcam frame update / exposure settle)
        await sleep(160);

        const photo = await captureUniqueFrame(runId);
        if (runIdRef.current !== runId) return;
        if (!photo) return;

        // Accept capture
        lastCaptureRef.current = photo;
        photoIdCounterRef.current += 1;
        capturedRef.current = [...capturedRef.current, photo];
        updateCapturedPhotosState();

        // Pause before next shot
        if (shotIndex < totalShots - 1) {
          await sleep(650);
        }
      }

      // Finish
      if (runIdRef.current !== runId) return;
      setIsCapturing(false);
      setCountdown(null);
      // Turn off camera ASAP so the cam light goes off even before navigating away
      stopCamera();
      // Return data URLs only
      onCapture([...capturedRef.current]);
    } catch (err) {
      if (runIdRef.current !== runId) return;
      alert('Failed to capture photo: ' + (err?.message || String(err)));
      setIsCapturing(false);
      setCountdown(null);
      setCurrentPhotoIndex(0);
    }
  };

  const handleCapture = () => {
    if (countdown !== null || isCapturing) return; // Already counting down
    
    // Start capturing first photo
    capturedRef.current = [];
    setCapturedPhotos([]);
    photoIdCounterRef.current = 0;
    lastCaptureRef.current = null;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    runCaptureSequence({ totalShots: numPhotos, runId });
  };

  const handleCancelCountdown = () => {
    runIdRef.current += 1; // cancel loop
    setIsCapturing(false);
    setCountdown(null);
    setCurrentPhotoIndex(0);
    capturedRef.current = [];
    setCapturedPhotos([]);
    photoIdCounterRef.current = 0;
    lastCaptureRef.current = null;
  };

  if (error) {
    return (
      <div className="camera-error">
        <p>Error: {error}</p>
        <Button onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  // For the strip preview: either show in-progress capture, or show existing photos with a retake replacement
  const existingPhotoDataUrls = Array.isArray(existingPhotos)
    ? existingPhotos.map(p => (typeof p === 'string' ? p : p?.imageData)).filter(Boolean)
    : [];

  let displayPhotos = capturedPhotos;
  if (retakeIndex !== null && retakeIndex !== undefined) {
    // Base = existing photos, then replace the slot being retaken with the newly captured photo (first capture in this session)
    const base = existingPhotoDataUrls.map((d, i) => ({ id: `existing-${i}`, data: d }));
    if (capturedPhotos[0]?.data) {
      base[retakeIndex] = { id: `retake-${capturedPhotos[0].id}`, data: capturedPhotos[0].data };
    }
    displayPhotos = base;
  }

  const overlayLabel = retakeIndex !== null && retakeIndex !== undefined
    ? `Retake Photo ${retakeIndex + 1}`
    : `Photo ${currentPhotoIndex + 1} of ${numPhotos}`;

  // Make camera preview match the current slot aspect ratio so users can frame correctly.
  const sortedSlotsForAspect = template?.slots ? [...template.slots].sort((a, b) => a.y - b.y) : [];
  const activeSlot = sortedSlotsForAspect[currentPhotoIndex] || sortedSlotsForAspect[0] || null;
  const activeAspectRatio = activeSlot ? `${activeSlot.width} / ${activeSlot.height}` : '16 / 9';

  return (
    <div className="camera-capture">
      <div className="camera-layout">
        {/* Large live camera frame */}
        <div className="camera-live-column">
          <div className="camera-live-frame" style={{ aspectRatio: activeAspectRatio }}>
            {isLoading ? (
              <div className="loading">Starting camera...</div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline className="video-preview-large" />
                {countdown !== null && countdown > 0 && (
                  <div className="countdown-overlay">
                    <div className="countdown-number">{countdown}</div>
                    <div className="photo-progress">
                      {overlayLabel}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Template strip preview */}
        <div className="strip-preview-panel">
          <h3>Strip Preview</h3>
          <div className="strip-preview-container">
            {template && template.templateImage ? (
              <StripPreviewWithSlots 
                template={template}
                displayPhotos={displayPhotos}
              />
            ) : (
              <div className="strip-preview-placeholder">No template</div>
            )}
          </div>
          <div className="photo-status">
            <div className="status-text">
              {retakeIndex !== null && retakeIndex !== undefined
                ? `Retaking photo ${retakeIndex + 1}`
                : `${capturedPhotos.length} of ${numPhotos} photos captured`}
            </div>
          </div>
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
