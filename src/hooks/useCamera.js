import { useState, useRef, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
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
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
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
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto
  };
}
