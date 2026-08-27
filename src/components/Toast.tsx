type ToastTone = 'error' | 'success' | 'info';

type ToastProps = {
  message: string;
  tone?: ToastTone;
  onClose: () => void;
};

const Toast = ({message, tone = 'info', onClose}: ToastProps) => {
  if (!message) return null;

  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
};

export default Toast;
