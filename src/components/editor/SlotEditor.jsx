import { useState, useEffect } from 'react';
import { SlotCanvas } from './SlotCanvas';
import { Button } from '../shared/Button';
import { generateUUID } from '../../utils/uuid';
import { detectFramesByTransparency } from '../../utils/frameDetection';
import './SlotEditor.css';

export function SlotEditor({ template, onSave }) {
  const [slots, setSlots] = useState(template?.slots || []);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [background, setBackground] = useState(template?.background || null);

  useEffect(() => {
    if (template) {
      setSlots(template.slots || []);
      setBackground(template.background || null);
    }
  }, [template]);

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackground(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    setBackground(null);
    // Reset file input
    const input = document.getElementById('background-file-input');
    if (input) input.value = '';
  };

  const addSlot = () => {
    const newSlot = {
      id: generateUUID(),
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      fitMode: 'cover',
      rotation: 0
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotId(newSlot.id);
  };

  const deleteSlot = (id) => {
    setSlots(slots.filter(s => s.id !== id));
    if (selectedSlotId === id) {
      setSelectedSlotId(null);
    }
  };

  const updateSlot = (id, updates) => {
    setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAutoDetect = async () => {
    if (!template) return;
    
    setDetecting(true);
    try {
      const detectedFrames = await detectFramesByTransparency(template.templateImage, {
        minArea: 1000,
        maxFrames: 10
      });

      if (detectedFrames.length === 0) {
        alert('No frames detected. Try adjusting the template or add slots manually.');
        setDetecting(false);
        return;
      }

      // Convert detected frames to slots and sort by Y position (top to bottom)
      const newSlots = detectedFrames
        .map((frame) => ({
          id: generateUUID(),
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          fitMode: 'cover',
          rotation: 0
        }))
        .sort((a, b) => a.y - b.y); // Sort by Y position (top to bottom)

      setSlots(newSlots);
      if (newSlots.length > 0) {
        setSelectedSlotId(newSlots[0].id);
      }
      alert(`Detected ${newSlots.length} frame(s)!`);
    } catch (error) {
      console.error('Error detecting frames:', error);
      alert('Failed to detect frames. Please add slots manually.');
    } finally {
      setDetecting(false);
    }
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  const handleSave = () => {
    if (!template) return;
    // Sort slots by Y position before saving
    const sortedSlots = [...slots].sort((a, b) => a.y - b.y);
    onSave({
      ...template,
      slots: sortedSlots,
      background: background
    });
  };

  if (!template) {
    return <div className="slot-editor-empty">No template loaded</div>;
  }

  return (
    <div className="slot-editor">
      <div className="editor-header">
        <h2>Edit Template: {template.name}</h2>
        <div className="editor-actions">
          <Button onClick={handleAutoDetect} variant="success" disabled={detecting}>
            {detecting ? 'Detecting...' : 'Auto-Detect Frames'}
          </Button>
          <Button onClick={addSlot} variant="secondary">Add Slot</Button>
          <Button onClick={handleSave} variant="primary">Save Template</Button>
        </div>
      </div>

      <div className="editor-content">
        <div className="canvas-section">
          <SlotCanvas
            templateImage={template.templateImage}
            slots={slots}
            onSlotUpdate={updateSlot}
            selectedSlotId={selectedSlotId}
            onSlotSelect={setSelectedSlotId}
          />
        </div>

        <div className="properties-section">
          {selectedSlot ? (
            <div className="slot-properties">
              <h3>Slot Properties</h3>
              <div className="property-group">
                <label>X Position</label>
                <input
                  type="number"
                  value={selectedSlot.x}
                  onChange={(e) => updateSlot(selectedSlotId, { x: Number(e.target.value) })}
                />
              </div>
              <div className="property-group">
                <label>Y Position</label>
                <input
                  type="number"
                  value={selectedSlot.y}
                  onChange={(e) => updateSlot(selectedSlotId, { y: Number(e.target.value) })}
                />
              </div>
              <div className="property-group">
                <label>Width</label>
                <input
                  type="number"
                  value={selectedSlot.width}
                  onChange={(e) => updateSlot(selectedSlotId, { width: Number(e.target.value) })}
                />
              </div>
              <div className="property-group">
                <label>Height</label>
                <input
                  type="number"
                  value={selectedSlot.height}
                  onChange={(e) => updateSlot(selectedSlotId, { height: Number(e.target.value) })}
                />
              </div>
              <div className="property-group">
                <label>Fit Mode</label>
                <select
                  value={selectedSlot.fitMode}
                  onChange={(e) => updateSlot(selectedSlotId, { fitMode: e.target.value })}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </div>
              <Button onClick={() => deleteSlot(selectedSlotId)} variant="danger" size="small">
                Delete Slot
              </Button>
            </div>
          ) : (
            <div className="no-selection">
              <p>Click on a slot to edit its properties</p>
              <p>Or click "Add Slot" to create a new one</p>
            </div>
          )}

          <div className="template-properties">
            <h3>Template Background</h3>
            <div className="property-group">
              <label>Background Image</label>
              <label htmlFor="background-file-input" className="background-upload-label">
                {background ? 'Change Image' : 'Upload Image'}
              </label>
              <input
                id="background-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleBackgroundUpload}
                className="file-input"
              />
              {background && (
                <Button onClick={handleRemoveBackground} variant="danger" size="small" style={{ marginTop: '8px' }}>
                  Remove Background
                </Button>
              )}
              <p className="property-hint">Upload a background image for the home screen</p>
            </div>
            {background && (
              <div className="background-preview">
                <img src={background} alt="Background preview" />
              </div>
            )}
          </div>

          <div className="slots-list">
            <h3>Slots ({slots.length})</h3>
            {slots
              .slice()
              .sort((a, b) => a.y - b.y) // Sort by Y position (top to bottom)
              .map((slot, index) => (
                <div
                  key={slot.id}
                  className={`slot-item ${selectedSlotId === slot.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSlotId(slot.id)}
                >
                  Slot {index + 1}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
