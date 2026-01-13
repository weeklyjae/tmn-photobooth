import './ProgressBar.css';

export function ProgressBar({ current, total, label }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="progress-bar-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-text">{current} / {total}</div>
    </div>
  );
}
