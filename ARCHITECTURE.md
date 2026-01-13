# Photobooth System Architecture

## 1. Suggested Folder Structure

```
src/
├── components/
│   ├── editor/
│   │   ├── SlotEditor.jsx          # Visual slot editor with drag/resize
│   │   ├── TemplateUpload.jsx      # Template PNG upload
│   │   └── SlotCanvas.jsx          # Canvas for template + slot visualization
│   ├── capture/
│   │   ├── SetupScreen.jsx         # Pre-capture setup (mode, copies)
│   │   ├── CameraCapture.jsx       # Camera interface & capture
│   │   └── PhotoPreview.jsx         # Preview before finalizing
│   ├── composition/
│   │   ├── PhotoComposer.jsx       # Composes photos into template
│   │   └── ImageProcessor.jsx      # Image manipulation utilities
│   ├── print/
│   │   ├── PrintQueue.jsx          # Queue management UI
│   │   ├── PrintPool.jsx           # A4 page composition
│   │   └── PrintControls.jsx       # Print now / auto-print controls
│   ├── qr/
│   │   ├── QRDisplay.jsx           # Shows QR after photo
│   │   └── DownloadPage.jsx        # Mobile download page
│   └── shared/
│       ├── Button.jsx
│       ├── Modal.jsx
│       └── ProgressBar.jsx
├── hooks/
│   ├── useCamera.js                # Camera access & capture
│   ├── usePrintQueue.js            # Print queue state management
│   ├── useTemplates.js             # Template CRUD operations
│   └── usePhotoStorage.js          # QR photo storage (Cloudflare Workers)
├── utils/
│   ├── imageUtils.js               # Image processing (crop, fit, compose)
│   ├── printUtils.js               # A4 layout, cut guides
│   ├── qrUtils.js                  # QR code generation
│   └── storage.js                  # LocalStorage for templates/settings
├── services/
│   ├── photoStorage.js             # Cloudflare Workers API client
│   └── printService.js             # Browser print API wrapper
├── contexts/
│   ├── TemplateContext.jsx         # Template & slot management
│   ├── PrintQueueContext.jsx       # Print queue state
│   └── EventContext.jsx            # Current event settings
├── App.jsx                         # Main router/state coordinator
└── main.jsx
```

## 2. Data Models

### Template Model
```javascript
{
  id: string,                    // UUID
  name: string,                  // "Summer Party 2024"
  templateImage: string,         // Base64 or URL to PNG
  slots: Slot[],                 // Array of photo slots
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Slot Model
```javascript
{
  id: string,                    // UUID
  x: number,                     // Position from left (px or %)
  y: number,                     // Position from top (px or %)
  width: number,                 // Width (px or %)
  height: number,                // Height (px or %)
  fitMode: 'cover' | 'contain', // How photo fits in slot
  rotation: number               // Optional rotation (degrees)
}
```

### Photo Session Model
```javascript
{
  id: string,
  mode: 'solo' | 'group',
  copies: number,                // Copies per strip
  photos: Photo[],               // Captured photos
  templateId: string,
  createdAt: timestamp
}
```

### Photo Model
```javascript
{
  id: string,
  imageData: string,             // Base64 or Blob URL
  slotId: string,                // Which slot it fills
  timestamp: timestamp
}
```

### Print Queue Item Model
```javascript
{
  id: string,
  stripImage: string,            // Final composed strip (base64/URL)
  copies: number,                // How many copies
  createdAt: timestamp,
  status: 'queued' | 'printing' | 'printed'
}
```

### QR Photo Model (Cloudflare Workers)
```javascript
{
  id: string,                    // Short UUID for URL
  photoId: string,               // Original photo ID
  imageData: string,             // Base64 image
  expiresAt: timestamp,          // Auto-delete after this
  downloadCount: number,
  createdAt: timestamp
}
```

### Event Settings Model
```javascript
{
  currentTemplateId: string,
  defaultCopies: number,         // Default: 1
  printPoolSize: number,         // Strips per A4 (default: 4)
  autoPrintTimeout: number,      // Seconds (0 = manual only)
  qrExpiryHours: number,         // Default: 24
  cutGuidesEnabled: boolean
}
```

## 3. High-Level Flow

### Flow 1: Template Setup (One-time per event)
```
1. Admin uploads template PNG → TemplateUpload
2. Template displayed in SlotEditor canvas
3. Admin clicks "Add Slot" → creates draggable/resizable rectangle
4. Admin drags/resizes slot to desired position
5. Admin saves → stores template + slots in localStorage/Cloudflare Workers
6. Template ready for use
```

### Flow 2: Photo Capture to Print
```
1. User sees SetupScreen
   - Select mode: Solo or Group
   - Adjust copies: + / - buttons (default: 1)
   - Click "Start Capture"

2. CameraCapture component
   - Requests camera access
   - Shows live preview
   - User clicks capture button
   - Captures photo(s)
   - For Group mode: capture multiple photos (one per person)

3. PhotoPreview
   - Shows captured photos
   - User can retake or confirm

4. PhotoComposer
   - Takes captured photos + template + slots
   - For each slot:
     * Loads photo
     * Crops/fits to slot dimensions (cover mode)
     * Composites onto template at slot position
   - Generates final strip image

5. Print Queue
   - Adds strip(s) to queue
   - Solo mode: 1 strip × copies
   - Group mode: N strips (one per person) × copies
   - Shows queue progress (e.g., "2/4 filled")

6. Print Pooling
   - When queue reaches printPoolSize (e.g., 4) OR timeout expires:
     * Composes strips into A4 layout
     * Adds cut guides if enabled
     * Fills empty slots with blank/logo
     * Triggers browser print dialog
   - Or user clicks "Print Now" to force print

7. After print:
   - Queue cleared for printed items
   - Remaining items stay in queue
```

### Flow 3: QR Photo Saving
```
1. After photo composition:
   - Generate unique photo ID
   - Upload to Cloudflare Workers (photoStorage service)
   - Workers stores image + expiry timestamp
   - Returns short URL (e.g., /photo/abc123)

2. QRDisplay component
   - Generates QR code pointing to download URL
   - Shows QR on screen
   - User scans with phone

3. Download Page (mobile-optimized)
   - Receives photo ID from URL
   - Fetches photo from Cloudflare Workers
   - Shows photo with download button
   - Auto-deletes after expiry (Cloudflare Workers cron or scheduled task)
```

## 4. Key Technical Decisions

### Image Processing
- Use HTML5 Canvas API for composition
- `drawImage()` with cropping for cover mode
- Canvas toBlob() for final image generation

### Storage Strategy
- **Templates & Slots**: localStorage (or Cloudflare Workers KV for persistence)
- **Photos (QR)**: Cloudflare Workers + R2 (or Workers KV with size limits)
- **Print Queue**: In-memory state (React Context)

### Print Strategy
- Use browser's native `window.print()`
- Generate print-optimized HTML with A4 CSS
- CSS `@media print` for layout
- Cut guides as CSS borders/dashed lines

### QR Code
- Use library like `qrcode` (npm) or `qrcode-generator`
- Generate data URL for display

### Camera Access
- `navigator.mediaDevices.getUserMedia()`
- Capture to canvas or use `ImageCapture` API

## 5. Cloudflare Workers Endpoints (Optional Backend)

```
POST /api/photos
  - Upload photo, returns photo ID and expiry

GET /api/photos/:id
  - Download photo (if not expired)

DELETE /api/photos/:id
  - Manual deletion (or auto via cron)

GET /api/photos/:id/status
  - Check if photo exists and expiry time

POST /api/templates (optional)
  - Store templates in Workers KV

GET /api/templates/:id (optional)
  - Retrieve template
```

## 6. State Management

- **React Context** for:
  - Current template & slots
  - Print queue
  - Event settings
- **Local State** for:
  - Camera stream
  - Current capture session
  - UI modals/dialogs

## 7. UI Flow States

```
1. Template Editor (admin mode)
2. Setup Screen (mode selection)
3. Camera Capture
4. Photo Preview
5. QR Display (after composition)
6. Print Queue View (always visible in corner)
```

---

This architecture keeps things simple, event-focused, and avoids overengineering while supporting all required features.
