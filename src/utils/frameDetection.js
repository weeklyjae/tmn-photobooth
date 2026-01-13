// Automatic frame/slot detection from template image
// Uses edge detection and contour finding to identify rectangular areas

/**
 * Detect potential photo slots/frames in an image
 * Returns array of {x, y, width, height} rectangles
 */
export async function detectFrames(imageSrc, options = {}) {
  const {
    minArea = 5000,        // Minimum area for a frame
    maxFrames = 10,        // Maximum number of frames to detect
    threshold = 128,       // Edge detection threshold
    blur = 3               // Blur radius for noise reduction
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const frames = detectRectangles(imageData, {
        minArea,
        maxFrames,
        threshold,
        blur
      });

      resolve(frames);
    };
    img.src = imageSrc;
  });
}

/**
 * Simple rectangle detection using edge detection and contour analysis
 */
function detectRectangles(imageData, options) {
  const { width, height, data } = imageData;
  const { minArea, maxFrames, threshold } = options;

  // Convert to grayscale and detect edges
  const gray = new Uint8Array(width * height);
  const edges = new Uint8Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (r + g + b) / 3;
  }

  // Simple edge detection (Sobel-like)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = -gray[(y - 1) * width + x - 1] - 2 * gray[y * width + x - 1] - gray[(y + 1) * width + x - 1] +
                 gray[(y - 1) * width + x + 1] + 2 * gray[y * width + x + 1] + gray[(y + 1) * width + x + 1];
      const gy = -gray[(y - 1) * width + x - 1] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + x + 1] +
                 gray[(y + 1) * width + x - 1] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + x + 1];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude > threshold ? 255 : 0;
    }
  }

  // Find rectangular regions using connected components
  const rectangles = findRectangles(edges, width, height, minArea);

  // Sort by area (largest first) and limit
  rectangles.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return rectangles.slice(0, maxFrames);
}

/**
 * Find rectangular regions from edge map
 */
function findRectangles(edges, width, height, minArea) {
  const rectangles = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx] > 0 && visited[idx] === 0) {
        // Found an edge pixel, try to find a rectangle
        const rect = findRectangleAt(edges, visited, width, height, x, y);
        if (rect && rect.width * rect.height >= minArea) {
          rectangles.push(rect);
        }
      }
    }
  }

  return rectangles;
}

/**
 * Find rectangle starting at given position
 */
function findRectangleAt(edges, visited, width, height, startX, startY) {
  // Simple approach: find bounding box of connected edge pixels
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  const stack = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          if (edges[idx] > 0 && visited[idx] === 0) {
            visited[idx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  // Add padding and return rectangle
  const padding = 10;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(width - (minX - padding), maxX - minX + padding * 2),
    height: Math.min(height - (minY - padding), maxY - minY + padding * 2)
  };
}

/**
 * Alternative: Detect frames by finding transparent or light-colored rectangular areas
 * This is simpler and often more reliable for templates
 */
export async function detectFramesByTransparency(imageSrc, options = {}) {
  const {
    minArea = 5000,
    maxFrames = 10,
    alphaThreshold = 0.1,  // Consider transparent if alpha < this
    brightnessThreshold = 200  // Or very light colored
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const frames = findTransparentAreas(imageData, {
        minArea,
        maxFrames,
        alphaThreshold,
        brightnessThreshold
      });

      resolve(frames);
    };
    img.src = imageSrc;
  });
}

function findTransparentAreas(imageData, options) {
  const { width, height, data } = imageData;
  const { minArea, maxFrames, alphaThreshold, brightnessThreshold } = options;

  // Create mask of transparent/light areas
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const alpha = data[i * 4 + 3] / 255;
    const brightness = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    
    // Mark as potential frame area if transparent or very light
    if (alpha < alphaThreshold || brightness > brightnessThreshold) {
      mask[i] = 255;
    }
  }

  // Find rectangular regions in mask (treat mask as edges)
  const rectangles = findRectanglesFromMask(mask, width, height, minArea);
  rectangles.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return rectangles.slice(0, maxFrames);
}

/**
 * Find rectangles from a mask (similar to findRectangles but for mask data)
 */
function findRectanglesFromMask(mask, width, height, minArea) {
  const rectangles = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] > 0 && visited[idx] === 0) {
        // Found a mask pixel, try to find a rectangle
        const rect = findRectangleAtMask(mask, visited, width, height, x, y);
        if (rect && rect.width * rect.height >= minArea) {
          rectangles.push(rect);
        }
      }
    }
  }

  return rectangles;
}

/**
 * Find rectangle starting at given position in mask
 */
function findRectangleAtMask(mask, visited, width, height, startX, startY) {
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  const stack = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          if (mask[idx] > 0 && visited[idx] === 0) {
            visited[idx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  // Add padding and return rectangle
  const padding = 10;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(width - (minX - padding), maxX - minX + padding * 2),
    height: Math.min(height - (minY - padding), maxY - minY + padding * 2)
  };
}
