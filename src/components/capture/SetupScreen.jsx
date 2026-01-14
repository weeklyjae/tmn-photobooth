import { Button } from '../shared/Button';
import './SetupScreen.css';

export function SetupScreen({ onStart, template }) {
  // Get number of slots from template (auto-detected)
  const numSlots = template?.slots?.length || 0;
  // Get background image from template or use default gradient
  const backgroundImage = template?.background;
  const backgroundStyle = backgroundImage 
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  if (!template || numSlots === 0) {
    return (
      <div className="setup-screen" style={backgroundStyle}>
        <div className="setup-content">
          <h1>Welcome! Get started</h1>
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
    <div className="setup-screen" style={backgroundStyle}>
      <div className="setup-content">
        <h1>Welcome! Get started</h1>
        
        <Button onClick={() => onStart(numSlots)} variant="primary" size="large">
          Start Capture
        </Button>
      </div>
    </div>
  );
}
