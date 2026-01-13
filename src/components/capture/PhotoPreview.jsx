import { Button } from '../shared/Button';
import './PhotoPreview.css';

export function PhotoPreview({ photos, onConfirm, onRetake }) {
  return (
    <div className="photo-preview">
      <h2>Preview</h2>
      <div className="preview-grid">
        {photos.map((photo, index) => (
          <div key={index} className="preview-item">
            <img src={photo.imageData} alt={`Preview ${index + 1}`} />
            <div className="preview-label">Photo {index + 1}</div>
          </div>
        ))}
      </div>
      <div className="preview-actions">
        <Button onClick={onRetake} variant="secondary" size="large">
          Retake
        </Button>
        <Button onClick={onConfirm} variant="primary" size="large">
          Confirm
        </Button>
      </div>
    </div>
  );
}
