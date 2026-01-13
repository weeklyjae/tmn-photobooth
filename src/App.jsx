import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { Modal } from './components/shared/Modal';
import { generateUUID } from './utils/uuid';
import { photoStorage } from './services/photoStorage';
import './App.css';

function MainApp() {
  const { currentTemplate, saveTemplate } = useTemplates();
  const { settings, setCurrentTemplateId } = useEvent();
  const { addToQueue } = usePrintQueue();
  
  const [view, setView] = useState('home');
  const [newTemplate, setNewTemplate] = useState(null);
  const [captureState, setCaptureState] = useState(null);
  const [composedStrip, setComposedStrip] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const { templates } = useTemplates();

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
    setCaptureState({ copies, numPhotos, photos: [], retakingIndex: null });
    setView('camera');
  };

  const handlePhotoCapture = (photosArray) => {
    // photosArray is either:
    // - full capture: array of all captured photos (length = numPhotos)
    // - retake: array of 1 photo (length = 1) + captureState.retakingIndex is set
    setCaptureState(prev => {
      if (!prev) return prev;

      const retakeIndex = prev.retakingIndex;
      if (retakeIndex !== null && retakeIndex !== undefined) {
        const newPhotoData = photosArray?.[0];
        if (!newPhotoData) return { ...prev, retakingIndex: null };

        const nextPhotos = [...prev.photos];
        nextPhotos[retakeIndex] = { id: generateUUID(), imageData: newPhotoData };
        return { ...prev, photos: nextPhotos, retakingIndex: null };
      }

      const photos = (photosArray || []).map((photoData) => ({
        id: generateUUID(),
        imageData: photoData
      }));

      return { ...prev, photos, retakingIndex: null };
    });
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

  const handlePreviewRetakeOne = (index) => {
    setCaptureState(prev => {
      if (!prev) return prev;
      return { ...prev, retakingIndex: index };
    });
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
          <Button onClick={() => setIsTemplateModalOpen(true)} variant="secondary" size="small">
            Change Template
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
            numPhotos={captureState?.retakingIndex !== null && captureState?.retakingIndex !== undefined ? 1 : (captureState?.numPhotos || 1)}
            retakeIndex={captureState?.retakingIndex}
            existingPhotos={captureState?.photos || []}
            onCapture={handlePhotoCapture}
            onCancel={() => {
              if (captureState?.retakingIndex !== null && captureState?.retakingIndex !== undefined) {
                setCaptureState(prev => (prev ? { ...prev, retakingIndex: null } : prev));
                setView('preview');
                return;
              }
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
            onRetakeOne={handlePreviewRetakeOne}
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

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Select Template"
        size="medium"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setIsTemplateModalOpen(false);
                setView('upload');
              }}
            >
              Upload New Template
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setIsTemplateModalOpen(false);
                // Start a new template immediately in editor (no image yet)
                // If you prefer forcing upload first, remove this and keep only Upload.
                setNewTemplate({
                  id: generateUUID(),
                  name: 'New Template',
                  templateImage: null,
                  slots: [],
                });
                setView('editor');
              }}
            >
              New (Blank)
            </Button>
          </div>

          {templates.length === 0 ? (
            <div style={{ color: '#666' }}>
              No templates yet. Click <b>Upload New Template</b> to add one.
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: currentTemplate?.id === t.id ? 'rgba(79, 70, 229, 0.08)' : '#fff',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{(t.slots?.length || 0)} slots</div>
                </div>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => {
                    setCurrentTemplateId(t.id);
                    setIsTemplateModalOpen(false);
                  }}
                >
                  Use
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
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
