import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { useEvent } from './EventContext';

const TemplateContext = createContext();

export function TemplateProvider({ children }) {
  const { currentTemplateId } = useEvent();
  const [templates, setTemplates] = useState(() => storage.getTemplates());
  const [currentTemplate, setCurrentTemplate] = useState(null);

  useEffect(() => {
    const saved = storage.getTemplates();
    setTemplates(saved);
  }, []);

  useEffect(() => {
    if (currentTemplateId) {
      const template = templates.find(t => t.id === currentTemplateId);
      setCurrentTemplate(template || null);
    } else {
      setCurrentTemplate(null);
    }
  }, [currentTemplateId, templates]);

  const saveTemplate = (template) => {
    const success = storage.saveTemplate(template);
    if (success) {
      const updated = storage.getTemplates();
      setTemplates(updated);
      return true;
    }
    return false;
  };

  const deleteTemplate = (id) => {
    const success = storage.deleteTemplate(id);
    if (success) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    }
    return false;
  };

  return (
    <TemplateContext.Provider value={{
      templates,
      currentTemplate,
      saveTemplate,
      deleteTemplate
    }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplates must be used within TemplateProvider');
  }
  return context;
}
