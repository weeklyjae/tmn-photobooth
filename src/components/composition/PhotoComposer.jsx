import { useState, useEffect } from 'react';
import { composePhotoStrip, canvasToDataURL } from '../../utils/imageUtils';
import { generateUUID } from '../../utils/uuid';

export function PhotoComposer({ template, photos, slots, onComplete }) {
  const [composing, setComposing] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const compose = async () => {
      if (!template || !photos.length || !slots.length) {
        setComposing(false);
        return;
      }

      try {
        setComposing(true);
        // Sort slots by Y position (top to bottom) to ensure correct order
        const sortedSlots = [...slots].sort((a, b) => a.y - b.y);
        
        // Map photos to slots (use first photo for each slot if multiple photos)
        const photosForSlots = sortedSlots.map((slot, index) => {
          const photo = photos[index] || photos[0]; // Use first photo as fallback
          return photo ? {
            imageData: photo.imageData,
            slotId: slot.id
          } : null;
        }).filter(Boolean);
        
        const canvas = await composePhotoStrip(
          template.templateImage,
          photosForSlots,
          sortedSlots
        );
        
        const dataURL = canvasToDataURL(canvas);
        setResult(dataURL);
        setComposing(false);
      } catch (error) {
        console.error('Error composing photo:', error);
        alert('Failed to compose photo strip');
        setComposing(false);
      }
    };

    compose();
  }, [template, photos, slots]);

  useEffect(() => {
    if (result && onComplete) {
      onComplete({
        id: generateUUID(),
        stripImage: result,
        createdAt: Date.now()
      });
    }
  }, [result, onComplete]);

  if (composing) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="spinner" style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Composing photo strip...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px'
      }}>
        <img 
          src={result} 
          alt="Composed photo strip" 
          style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
        />
      </div>
    );
  }

  return null;
}
