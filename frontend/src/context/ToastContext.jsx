import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {}
});

export const useToast = () => {
  try {
    const context = useContext(ToastContext);
    if (!context) {
      console.warn('useToast called outside ToastProvider, returning default functions');
      return {
        showToast: () => {},
        success: () => {},
        error: () => {},
        warning: () => {},
        info: () => {}
      };
    }
    return context;
  } catch (error) {
    console.error('useToast error:', error);
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {}
    };
  }
};

export const ToastProvider = ({ children }) => {
  // Add defensive check for useState
  if (!useState) {
    console.error('useState is not available, React may not be properly loaded');
    return <div>{children}</div>;
  }
  
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Convenience methods
  const success = (message, duration) => showToast(message, 'success', duration);
  const error = (message, duration) => showToast(message, 'error', duration);
  const warning = (message, duration) => showToast(message, 'warning', duration);
  const info = (message, duration) => showToast(message, 'info', duration);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
