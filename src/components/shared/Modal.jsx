import './Modal.css';

export function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
