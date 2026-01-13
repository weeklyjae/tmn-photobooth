import { useState, useRef, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use lower resolution for preview to reduce GPU load
      // High resolution is only used during actual capture
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(err.message || 'Failed to access camera');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    const s = streamRef.current || stream;
    if (s) {
      s.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) {
      throw new Error('Camera not started');
    }

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    // Ensure video is ready and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('Video not ready for capture');
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    // Capture current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
  };

  // Wait for a fresh video frame (prevents duplicated captures on some GPUs/drivers)
  const waitForNextVideoFrame = () => {
    const video = videoRef.current;
    if (!video) return Promise.resolve();

    // Prefer requestVideoFrameCallback when available (Chrome, Edge)
    if (typeof video.requestVideoFrameCallback === 'function') {
      return new Promise((resolve) => {
        video.requestVideoFrameCallback(() => resolve());
      });
    }

    // Fallback: wait for next animation frame
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  };

  /**
   * Capture photo on a *fresh* frame.
   * Tries multiple frames if it keeps returning the same image data (rare driver issues).
   */
  const capturePhotoAsync = async ({ avoidDuplicateAgainst, maxAttempts = 6 } = {}) => {
    if (!videoRef.current || !stream) {
      throw new Error('Camera not started');
    }

    let last = null;
    for (let i = 0; i < maxAttempts; i++) {
      await waitForNextVideoFrame();
      const data = capturePhoto();

      // If caller provided a previous capture, ensure we don't return the same frame
      if (avoidDuplicateAgainst && data === avoidDuplicateAgainst) {
        last = data;
        continue;
      }

      // If we're looping (e.g. avoidDuplicateAgainst not set), avoid immediate identical repeats too
      if (last && data === last) {
        continue;
      }

      return data;
    }

    // Give up and return whatever we got last (better than failing)
    return last || capturePhoto();
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      // IMPORTANT: use streamRef so we stop the latest stream even if this effect
      // captured an older stopCamera reference.
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoAsync
  };
}
