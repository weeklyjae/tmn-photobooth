import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

const EventContext = createContext();

export function EventProvider({ children }) {
  const [settings, setSettings] = useState(() => storage.getEventSettings());
  const [currentTemplateId, setCurrentTemplateId] = useState(() => 
    storage.getCurrentTemplateId()
  );

  useEffect(() => {
    storage.saveEventSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (currentTemplateId) {
      storage.setCurrentTemplateId(currentTemplateId);
    }
  }, [currentTemplateId]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <EventContext.Provider value={{
      settings,
      updateSettings,
      currentTemplateId,
      setCurrentTemplateId
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within EventProvider');
  }
  return context;
}
