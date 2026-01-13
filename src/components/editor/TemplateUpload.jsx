import { useState } from 'react';
import { Button } from '../shared/Button';
import './TemplateUpload.css';

export function TemplateUpload({ onUpload }) {
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!preview || !name.trim()) {
      alert('Please provide a template name and upload an image');
      return;
    }
    onUpload({ name: name.trim(), image: preview });
    setName('');
    setPreview(null);
    // Reset file input
    const input = document.getElementById('template-file-input');
    if (input) input.value = '';
  };

  return (
    <div className="template-upload">
      <div className="upload-section">
        <label htmlFor="template-file-input" className="upload-label">
          <span>📷</span>
          <span>Upload Template PNG</span>
        </label>
        <input
          id="template-file-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      {preview && (
        <div className="preview-section">
          <img src={preview} alt="Template preview" className="preview-image" />
          <input
            type="text"
            placeholder="Template name (e.g., Summer Party 2024)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="name-input"
          />
          <Button onClick={handleUpload} variant="primary">
            Use This Template
          </Button>
        </div>
      )}
    </div>
  );
}
