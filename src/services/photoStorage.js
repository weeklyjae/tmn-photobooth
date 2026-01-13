// Cloudflare Workers API client for photo storage
// For now, using localStorage as fallback until Workers are set up

const PHOTOS_KEY = 'photobooth_photos';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const photoStorage = {
  /**
   * Upload photo and get shareable URL
   */
  async uploadPhoto(imageData, expiryHours = 24) {
    // If API is configured, use it
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData,
            expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000)
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            id: data.id,
            url: `${API_BASE_URL}/photo/${data.id}`,
            expiresAt: data.expiresAt
          };
        }
      } catch (error) {
        console.error('Error uploading to API:', error);
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
    
    const photos = this._getLocalPhotos();
    photos[id] = {
      id,
      imageData,
      expiresAt,
      createdAt: Date.now(),
      downloadCount: 0
    };
    
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    
    // Clean up expired photos
    this._cleanupExpired();
    
    // Extract just the ID part for the URL
    const urlId = id.replace('photo_', '');
    return {
      id,
      url: `${window.location.origin}/photo/${urlId}`,
      expiresAt
    };
  },

  /**
   * Get photo by ID
   */
  async getPhoto(id) {
    // If API is configured, use it
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/photos/${id}`);
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (error) {
        console.error('Error fetching from API:', error);
      }
    }

    // Fallback to localStorage
    // Try to find photo by ID or by URL ID (photo_ prefix removed)
    const photos = this._getLocalPhotos();
    let photo = photos[id];
    
    // If not found, try with photo_ prefix
    if (!photo && !id.startsWith('photo_')) {
      photo = photos[`photo_${id}`];
    }
    
    if (!photo) {
      return null;
    }
    
    if (Date.now() > photo.expiresAt) {
      delete photos[photo.id];
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
      return null;
    }
    
    // Increment download count
    photo.downloadCount++;
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    
    return photo;
  },

  /**
   * Delete photo
   */
  async deletePhoto(id) {
    if (API_BASE_URL) {
      try {
        await fetch(`${API_BASE_URL}/api/photos/${id}`, { method: 'DELETE' });
        return true;
      } catch (error) {
        console.error('Error deleting from API:', error);
      }
    }

    const photos = this._getLocalPhotos();
    delete photos[id];
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    return true;
  },

  _getLocalPhotos() {
    try {
      const data = localStorage.getItem(PHOTOS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading photos:', error);
      return {};
    }
  },

  _cleanupExpired() {
    const photos = this._getLocalPhotos();
    const now = Date.now();
    let cleaned = false;
    
    Object.keys(photos).forEach(id => {
      if (photos[id].expiresAt < now) {
        delete photos[id];
        cleaned = true;
      }
    });
    
    if (cleaned) {
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    }
  }
};
