import { useEffect, useRef, useState } from 'react';
import './SlotCanvas.css';

export function SlotCanvas({ templateImage, slots, onSlotUpdate, selectedSlotId, onSlotSelect }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!templateImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate scale to fit container
      const container = containerRef.current;
      if (container) {
        const maxWidth = container.clientWidth - 40;
        const maxHeight = window.innerHeight - 200;
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
        
        canvas.width = img.width * newScale;
        canvas.height = img.height * newScale;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Draw slots first (underneath) with semi-transparent fill
      drawSlots(ctx, slots, selectedSlotId, true);
      
      // Then draw template on top
      ctx.globalAlpha = 0.7; // Make template semi-transparent so slots are visible
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
      
      // Draw slot outlines on top
      drawSlots(ctx, slots, selectedSlotId, false);
    };
    
    img.src = templateImage;
  }, [templateImage, slots, selectedSlotId]);

  const drawSlots = (ctx, slots, selectedId, fill = false) => {
    // Sort slots by Y position (top to bottom) for consistent rendering
    const sortedSlots = [...slots].sort((a, b) => a.y - b.y);
    sortedSlots.forEach(slot => {
      const isSelected = slot.id === selectedId;
      const x = slot.x * scale;
      const y = slot.y * scale;
      const width = slot.width * scale;
      const height = slot.height * scale;

      if (fill) {
        // Draw slot fill (underneath template)
        ctx.fillStyle = isSelected ? 'rgba(0, 123, 255, 0.3)' : 'rgba(40, 167, 69, 0.2)';
        ctx.fillRect(x, y, width, height);
      } else {
        // Draw slot outline (on top of template)
        ctx.strokeStyle = isSelected ? '#007bff' : '#28a745';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash(isSelected ? [] : [5, 5]);
        ctx.strokeRect(x, y, width, height);

        // Draw corner handles if selected
        if (isSelected) {
          const handleSize = 8;
          ctx.fillStyle = '#007bff';
          ctx.setLineDash([]);
          
          // Corner handles
          const corners = [
            [x, y], [x + width, y],
            [x + width, y + height], [x, y + height]
          ];
          
          corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx - handleSize/2, cy - handleSize/2, handleSize, handleSize);
          });
        }
      }
    });
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    // Check if clicking on a slot
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      if (
        pos.x >= slot.x && pos.x <= slot.x + slot.width &&
        pos.y >= slot.y && pos.y <= slot.y + slot.height
      ) {
        onSlotSelect(slot.id);
        return;
      }
    }
    
    onSlotSelect(null);
  };

  return (
    <div ref={containerRef} className="slot-canvas-container">
      <canvas
        ref={canvasRef}
        className="slot-canvas"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
