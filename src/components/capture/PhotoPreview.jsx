import { useState } from 'react';
import { Button } from '../shared/Button';
import { useEvent } from '../../contexts/EventContext';
import './PhotoPreview.css';

export function PhotoPreview({ photos, template, onConfirm, onRetake, onRetakeOne }) {
  const { settings } = useEvent();
  const [copies, setCopies] = useState(settings.defaultCopies || 1);

  const handleCopiesIncrement = () => {
    setCopies(copies + 1);
  };

  const handleCopiesDecrement = () => {
    if (copies > 1) {
      setCopies(copies - 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(copies);
  };

  // Get sorted slots to match photo order
  const sortedSlots = template?.slots ? [...template.slots].sort((a, b) => a.y - b.y) : [];

  return (
    <div className="photo-preview">
      <h2>Preview</h2>
      <div className="preview-layout">
        <div className="preview-grid">
          {photos.map((photo, index) => {
            // Get the corresponding slot for this photo
            const slot = sortedSlots[index];
            // Calculate aspect ratio from slot, or use default 4/3
            const aspectRatio = slot ? `${slot.width} / ${slot.height}` : '4 / 3';
            
            return (
              <div key={index} className="preview-item">
                <img 
                  src={photo.imageData} 
                  alt={`Preview ${index + 1}`}
                  style={{ aspectRatio }}
                />
                <div className="preview-label">
                  <span>Photo {index + 1}</span>
                  {onRetakeOne && (
                    <button
                      type="button"
                      className="retake-one-btn"
                      onClick={() => onRetakeOne(index)}
                    >
                      Retake this
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="preview-sidebar">
          <div className="preview-copies-selector">
            <label>Copies per strip</label>
            <p className="preview-selector-description">Ilang beses i-print ang strip</p>
            <div className="preview-copies-controls">
              <Button onClick={handleCopiesDecrement} variant="secondary" disabled={copies <= 1}>
                −
              </Button>
              <div className="preview-copies-value">{copies}</div>
              <Button onClick={handleCopiesIncrement} variant="secondary">
                +
              </Button>
            </div>
          </div>

          <div className="preview-actions">
            <Button onClick={onRetake} variant="secondary" size="large">
              Retake All
            </Button>
            <Button onClick={handleConfirm} variant="primary" size="large">
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
