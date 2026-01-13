# Photobooth System

A web-based photobooth system for event use that automates photo layout, printing, and QR-based photo saving.

## Features

- **Template Management**: Upload PNG templates from Canva and visually add/edit photo slots
- **Photo Capture**: Camera-based photo capture with preview
- **Photo Composition**: Automatically fits photos into template slots
- **Print Pooling**: Queues strips and prints multiple per A4 page with cut guides
- **QR Photo Sharing**: Generates QR codes for mobile photo downloads with auto-expiry

## Tech Stack

- **Frontend**: React + Vite
- **Language**: JavaScript
- **Storage**: localStorage (templates) + Cloudflare Workers (photos, optional)
- **Print**: Browser native print API

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

For Cloudflare Pages deployment, the build output will be in the `dist` folder.

## Usage Flow

### 1. Create Template (One-time per event)

1. Click "Create Template" in the header
2. Upload your template PNG file
3. Enter a template name
4. Click "Add Slot" to create photo slots
5. Click on a slot to edit its position and size
6. Adjust properties in the sidebar (X, Y, Width, Height, Fit Mode)
7. Click "Save Template"

### 2. Capture Photos

1. On the home screen, adjust copies (default: 1)
2. Click "Start Capture"
3. Allow camera access when prompted
4. Click the capture button to take photos
5. Review photos in preview
6. Click "Confirm" or "Retake"

### 3. Print & Share

- Photos are automatically added to the print queue
- When the queue reaches the pool size (default: 4), it auto-prints
- Or click "Print Now" to force print
- A QR code is displayed for mobile photo download
- Photos expire after the configured time (default: 24 hours)

## Configuration

Event settings are stored in localStorage and can be configured:

- `defaultCopies`: Default number of copies (default: 1)
- `printPoolSize`: Number of strips per A4 page (default: 4)
- `autoPrintTimeout`: Auto-print timeout in seconds (0 = manual only)
- `qrExpiryHours`: Hours until QR photos expire (default: 24)
- `cutGuidesEnabled`: Show cut guides on print (default: true)

## Cloudflare Workers (Optional)

To enable cloud-based photo storage instead of localStorage:

1. Set up Cloudflare Workers with R2 or KV storage
2. Create API endpoints:
   - `POST /api/photos` - Upload photo
   - `GET /api/photos/:id` - Download photo
   - `DELETE /api/photos/:id` - Delete photo
3. Set `VITE_API_BASE_URL` environment variable to your Workers URL

## Project Structure

```
src/
├── components/
│   ├── editor/        # Template and slot editing
│   ├── capture/       # Camera capture and preview
│   ├── composition/   # Photo composition
│   ├── print/         # Print queue management
│   ├── qr/           # QR code display and download
│   └── shared/       # Reusable UI components
├── contexts/         # React contexts for state
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
└── services/        # External service clients
```

## Browser Requirements

- Modern browser with camera access support
- Print dialog support
- localStorage support

## License

MIT
