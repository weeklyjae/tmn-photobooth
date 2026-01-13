import { usePrintQueue } from '../../contexts/PrintQueueContext';
import { useEvent } from '../../contexts/EventContext';
import { ProgressBar } from '../shared/ProgressBar';
import { Button } from '../shared/Button';
import './PrintQueue.css';

export function PrintQueue() {
  const { queue, printNow } = usePrintQueue();
  const { settings } = useEvent();

  const queuedItems = queue.filter(item => item.status === 'queued');
  const filled = queuedItems.length;
  const poolSize = settings.printPoolSize;

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="print-queue">
      <div className="queue-header">
        <h3>Print Queue</h3>
        <Button onClick={printNow} variant="primary" size="small" disabled={filled === 0}>
          Print Now
        </Button>
      </div>
      <ProgressBar 
        current={filled} 
        total={poolSize} 
        label={`Queue: ${filled} / ${poolSize} strips`}
      />
      {filled >= poolSize && (
        <div className="queue-full">Pool full - ready to print!</div>
      )}
    </div>
  );
}
