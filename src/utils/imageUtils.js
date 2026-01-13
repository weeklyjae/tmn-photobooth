// Image processing utilities using Canvas API

/**
 * Load image from URL or base64
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop and fit image to dimensions (cover mode)
 */
export function cropImageToFit(image, targetWidth, targetHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  const imgAspect = image.width / image.height;
  const targetAspect = targetWidth / targetHeight;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imgAspect > targetAspect) {
    // Image is wider - crop width
    sourceWidth = image.height * targetAspect;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    // Image is taller - crop height
    sourceHeight = image.width / targetAspect;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, targetWidth, targetHeight
  );

  return canvas;
}

/**
 * Compose photos into template
 * Photos are drawn first (underneath), then template is overlaid on top
 */
export async function composePhotoStrip(templateImage, photos, slots) {
  const canvas = document.createElement('canvas');
  const template = await loadImage(templateImage);
  
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext('2d');

  // First, draw photos into slots (underneath the template)
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const photo = photos[i];

    if (!photo) continue;

    try {
      const photoImg = await loadImage(photo.imageData);
      const cropped = cropImageToFit(photoImg, slot.width, slot.height);
      
      ctx.save();
      if (slot.rotation) {
        const centerX = slot.x + slot.width / 2;
        const centerY = slot.y + slot.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((slot.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      ctx.drawImage(cropped, slot.x, slot.y);
      ctx.restore();
    } catch (error) {
      console.error(`Error composing photo for slot ${slot.id}:`, error);
    }
  }

  // Then, draw template on top (as overlay/frame)
  ctx.drawImage(template, 0, 0);

  return canvas;
}

/**
 * Convert canvas to blob
 */
export function canvasToBlob(canvas, quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png', quality);
  });
}

/**
 * Convert canvas to data URL
 */
export function canvasToDataURL(canvas, quality = 0.95) {
  return canvas.toDataURL('image/png', quality);
}

/**
 * Convert blob to data URL
 */
export function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
