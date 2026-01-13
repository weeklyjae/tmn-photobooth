import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { EventProvider } from './contexts/EventContext';
import { TemplateProvider } from './contexts/TemplateContext';
import { PrintQueueProvider, usePrintQueue } from './contexts/PrintQueueContext';
import { useTemplates } from './contexts/TemplateContext';
import { useEvent } from './contexts/EventContext';
import { TemplateUpload } from './components/editor/TemplateUpload';
import { SlotEditor } from './components/editor/SlotEditor';
import { SetupScreen } from './components/capture/SetupScreen';
import { CameraCapture } from './components/capture/CameraCapture';
import { PhotoPreview } from './components/capture/PhotoPreview';
import { PhotoComposer } from './components/composition/PhotoComposer';
import { QRDisplay } from './components/qr/QRDisplay';
import { PrintQueue } from './components/print/PrintQueue';
import { DownloadPage } from './components/qr/DownloadPage';
import { Button } from './components/shared/Button';
import { generateUUID } from './utils/uuid';
import { photoStorage } from './services/photoStorage';
import './App.css';

function MainApp() {
  const navigate = useNavigate();
  const { currentTemplate, saveTemplate } = useTemplates();
  const { settings, setCurrentTemplateId } = useEvent();
  const { addToQueue } = usePrintQueue();
  
  const [view, setView] = useState('home');
  const [newTemplate, setNewTemplate] = useState(null);
  const [captureState, setCaptureState] = useState(null);
  const [composedStrip, setComposedStrip] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);

  // Template management
  const handleTemplateUpload = async (data) => {
    const template = {
      id: generateUUID(),
      name: data.name,
      templateImage: data.image,
      slots: []
    };
    setNewTemplate(template);
    setView('editor');
  };

  const handleTemplateSave = (template) => {
    saveTemplate(template);
    setCurrentTemplateId(template.id);
    setNewTemplate(null);
    setView('home');
    alert('Template saved successfully!');
  };

  // Capture flow
  const handleStartCapture = (copies, numPhotos) => {
    if (!currentTemplate) {
      alert('Please select or create a template first');
      return;
    }
    setCaptureState({ copies, numPhotos, photos: [] });
    setView('camera');
  };

  const handlePhotoCapture = (photosArray) => {
    // photosArray is an array of all captured photos
    const photos = photosArray.map(photoData => ({
      id: generateUUID(),
      imageData: photoData
    }));
    setCaptureState(prev => ({
      ...prev,
      photos
    }));
    setView('preview');
  };

  const handlePreviewConfirm = () => {
    if (captureState.photos.length === 0) {
      alert('No photos captured');
      return;
    }
    setView('composing');
  };

  const handlePreviewRetake = () => {
    setCaptureState(prev => ({ ...prev, photos: [] }));
    setView('camera');
  };

  // Composition
  const handleCompositionComplete = async (strip) => {
    setComposedStrip(strip);
    
    // Add to print queue
    addToQueue(strip.stripImage, captureState.copies);
    
    // Upload for QR
    try {
      const photoData = await photoStorage.uploadPhoto(
        strip.stripImage,
        settings.qrExpiryHours
      );
      setQrUrl(photoData.url);
      setView('qr');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to generate QR code, but photo is in print queue');
      setView('home');
      resetCapture();
    }
  };

  const resetCapture = () => {
    setCaptureState(null);
    setComposedStrip(null);
    setQrUrl(null);
  };

  const handleQRClose = () => {
    setView('home');
    resetCapture();
  };

  // Navigation
  const goToEditor = () => {
    if (currentTemplate) {
      setNewTemplate(null);
      setView('editor');
    } else {
      setView('upload');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Photobooth System</h1>
        <nav className="app-nav">
          <Button onClick={() => setView('home')} variant="secondary" size="small">
            Home
          </Button>
          <Button onClick={goToEditor} variant="secondary" size="small">
            {currentTemplate ? 'Edit Template' : 'Create Template'}
          </Button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <SetupScreen onStart={handleStartCapture} template={currentTemplate} />
        )}

        {view === 'upload' && (
          <div className="upload-view">
            <TemplateUpload onUpload={handleTemplateUpload} />
            <Button onClick={() => setView('home')} variant="secondary">
              Cancel
            </Button>
          </div>
        )}

        {view === 'editor' && (
          <SlotEditor
            template={newTemplate || currentTemplate}
            onSave={handleTemplateSave}
          />
        )}

        {view === 'camera' && (
          <CameraCapture
            template={currentTemplate}
            numPhotos={captureState?.numPhotos || 1}
            onCapture={handlePhotoCapture}
            onCancel={() => {
              setView('home');
              resetCapture();
            }}
          />
        )}

        {view === 'preview' && (
          <PhotoPreview
            photos={captureState.photos}
            onConfirm={handlePreviewConfirm}
            onRetake={handlePreviewRetake}
          />
        )}

        {view === 'composing' && currentTemplate && (
          <PhotoComposer
            template={currentTemplate}
            photos={captureState.photos}
            slots={currentTemplate.slots}
            onComplete={handleCompositionComplete}
          />
        )}

        {view === 'qr' && qrUrl && (
          <QRDisplay photoUrl={qrUrl} onClose={handleQRClose} />
        )}
      </main>

      <PrintQueue />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <TemplateProvider>
          <PrintQueueProvider>
            <Routes>
              <Route path="/" element={<MainApp />} />
              <Route path="/photo/:id" element={<DownloadPage />} />
            </Routes>
          </PrintQueueProvider>
        </TemplateProvider>
      </EventProvider>
    </BrowserRouter>
  );
}

export default App;
