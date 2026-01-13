import { Button } from '../shared/Button';
import './PhotoPreview.css';

export function PhotoPreview({ photos, onConfirm, onRetake, onRetakeOne }) {
  return (
    <div className="photo-preview">
      <h2>Preview</h2>
      <div className="preview-grid">
        {photos.map((photo, index) => (
          <div key={index} className="preview-item">
            <img src={photo.imageData} alt={`Preview ${index + 1}`} />
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
        ))}
      </div>
      <div className="preview-actions">
        <Button onClick={onRetake} variant="secondary" size="large">
          Retake All
        </Button>
        <Button onClick={onConfirm} variant="primary" size="large">
          Confirm
        </Button>
      </div>
    </div>
  );
}
