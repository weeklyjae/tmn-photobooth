import { useState } from 'react';
import { Button } from '../shared/Button';
import { useEvent } from '../../contexts/EventContext';
import './SetupScreen.css';

export function SetupScreen({ onStart, template }) {
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

  // Get number of slots from template (auto-detected)
  const numSlots = template?.slots?.length || 0;

  if (!template || numSlots === 0) {
    return (
      <div className="setup-screen">
        <div className="setup-content">
          <h1>Photobooth Setup</h1>
          <p style={{ color: '#dc3545', marginBottom: '20px' }}>
            Please create a template with slots first!
          </p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Go to Template Editor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-screen">
      <div className="setup-content">
        <h1>Photobooth Setup</h1>
        
        <div className="selector-group">
          <div className="copies-selector">
            <label>Copies per strip</label>
            <p className="selector-description">Ilang beses i-print ang strip</p>
            <div className="copies-controls">
              <Button onClick={handleCopiesDecrement} variant="secondary" disabled={copies <= 1}>
                −
              </Button>
              <div className="copies-value">{copies}</div>
              <Button onClick={handleCopiesIncrement} variant="secondary">
                +
              </Button>
            </div>
          </div>

          <div className="info-display">
            <label>Bilang ng slot per strip</label>
            <p className="selector-description">Auto-detected mula sa template</p>
            <div className="info-value">{numSlots} slot{numSlots !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <Button onClick={() => onStart(copies, numSlots)} variant="primary" size="large">
          Start Capture
        </Button>
      </div>
    </div>
  );
}
