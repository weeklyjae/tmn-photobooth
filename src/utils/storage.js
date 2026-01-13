// LocalStorage utilities for templates and settings

const TEMPLATES_KEY = 'photobooth_templates';
const CURRENT_TEMPLATE_KEY = 'photobooth_current_template';
const EVENT_SETTINGS_KEY = 'photobooth_event_settings';

const DEFAULT_EVENT_SETTINGS = {
  defaultCopies: 1,
  // 5 strips per A4 landscape by default (event-friendly cutting layout)
  printPoolSize: 5,
  autoPrintTimeout: 0,
  qrExpiryHours: 24,
  cutGuidesEnabled: true,
  printOrientation: 'landscape',
  printGapMm: 3,
  printMarginMm: 4
};

export const storage = {
  // Templates
  getTemplates() {
    try {
      const data = localStorage.getItem(TEMPLATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading templates:', error);
      return [];
    }
  },

  saveTemplate(template) {
    try {
      const templates = this.getTemplates();
      const index = templates.findIndex(t => t.id === template.id);
      if (index >= 0) {
        templates[index] = { ...template, updatedAt: Date.now() };
      } else {
        templates.push({ ...template, createdAt: Date.now(), updatedAt: Date.now() });
      }
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  },

  getTemplate(id) {
    const templates = this.getTemplates();
    return templates.find(t => t.id === id);
  },

  deleteTemplate(id) {
    try {
      const templates = this.getTemplates();
      const filtered = templates.filter(t => t.id !== id);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  },

  // Current template
  getCurrentTemplateId() {
    return localStorage.getItem(CURRENT_TEMPLATE_KEY);
  },

  setCurrentTemplateId(id) {
    localStorage.setItem(CURRENT_TEMPLATE_KEY, id);
  },

  // Event settings
  getEventSettings() {
    try {
      const data = localStorage.getItem(EVENT_SETTINGS_KEY);
      const parsed = data ? JSON.parse(data) : null;

      // Merge defaults to support new keys (migration)
      const merged = parsed ? { ...DEFAULT_EVENT_SETTINGS, ...parsed } : { ...DEFAULT_EVENT_SETTINGS };

      // Hard migration: older builds used 4-up. This project now standardizes on 5-up landscape.
      // If user previously had 4, upgrade them to 5 automatically.
      if (merged.printPoolSize === 4) {
        merged.printPoolSize = 5;
      }

      // Safety clamps
      if (!merged.printPoolSize || merged.printPoolSize < 1) merged.printPoolSize = 5;
      if (!merged.printOrientation) merged.printOrientation = 'landscape';
      if (typeof merged.printGapMm !== 'number') merged.printGapMm = 3;
      if (typeof merged.printMarginMm !== 'number') merged.printMarginMm = 4;

      return merged;
    } catch (error) {
      console.error('Error reading event settings:', error);
      return { ...DEFAULT_EVENT_SETTINGS };
    }
  },

  saveEventSettings(settings) {
    try {
      localStorage.setItem(EVENT_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving event settings:', error);
      return false;
    }
  }
};
