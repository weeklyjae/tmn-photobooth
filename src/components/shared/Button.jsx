import './Button.css';

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  size = 'medium',
  ...props 
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
