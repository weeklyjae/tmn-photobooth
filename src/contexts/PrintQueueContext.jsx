import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { printStrips } from '../utils/printUtils';
import { useEvent } from './EventContext';

const PrintQueueContext = createContext();

export function PrintQueueProvider({ children }) {
  const { settings } = useEvent();
  const [queue, setQueue] = useState([]);
  const timeoutRef = useRef(null);

  const addToQueue = useCallback((stripImage, copies = 1) => {
    const items = Array(copies).fill(null).map(() => ({
      id: Date.now() + Math.random(),
      stripImage,
      copies: 1,
      createdAt: Date.now(),
      status: 'queued'
    }));
    
    setQueue(prev => [...prev, ...items]);
  }, []);

  const removeFromQueue = useCallback((ids) => {
    setQueue(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const printNow = useCallback(() => {
    if (queue.length === 0) return;

    const stripsToPrint = queue
      .filter(item => item.status === 'queued')
      .slice(0, settings.printPoolSize)
      .map(item => item.stripImage);

    if (stripsToPrint.length === 0) return;

    const idsToRemove = queue
      .filter(item => item.status === 'queued')
      .slice(0, settings.printPoolSize)
      .map(item => item.id);

    // Mark as printing
    setQueue(prev => prev.map(item => 
      idsToRemove.includes(item.id) 
        ? { ...item, status: 'printing' }
        : item
    ));

    printStrips(stripsToPrint, settings.printPoolSize, settings.cutGuidesEnabled, {
      orientation: settings.printOrientation || 'landscape',
      gapMm: typeof settings.printGapMm === 'number' ? settings.printGapMm : 3,
      marginMm: typeof settings.printMarginMm === 'number' ? settings.printMarginMm : 4,
    });

    // Mark as printed after a delay
    setTimeout(() => {
      removeFromQueue(idsToRemove);
    }, 2000);
  }, [queue, settings, removeFromQueue]);

  // Auto-print logic
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const queuedItems = queue.filter(item => item.status === 'queued');
    
    // Auto-print when pool is full
    if (queuedItems.length >= settings.printPoolSize) {
      printNow();
      return;
    }

    // Auto-print after timeout (if enabled)
    if (settings.autoPrintTimeout > 0 && queuedItems.length > 0) {
      timeoutRef.current = setTimeout(() => {
        printNow();
      }, settings.autoPrintTimeout * 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [queue, settings, printNow]);

  return (
    <PrintQueueContext.Provider value={{
      queue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      printNow
    }}>
      {children}
    </PrintQueueContext.Provider>
  );
}

export function usePrintQueue() {
  const context = useContext(PrintQueueContext);
  if (!context) {
    throw new Error('usePrintQueue must be used within PrintQueueProvider');
  }
  return context;
}
