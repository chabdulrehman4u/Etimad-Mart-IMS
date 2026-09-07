import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      icon: <CheckCircle className="text-white" size={22} />,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      progress: 'bg-emerald-500'
    },
    error: {
      icon: <XCircle className="text-white" size={22} />,
      iconBg: 'bg-gradient-to-br from-rose-500 to-red-500',
      bg: 'bg-gradient-to-r from-rose-50 to-red-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      progress: 'bg-rose-500'
    },
    warning: {
      icon: <AlertTriangle className="text-white" size={22} />,
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      progress: 'bg-amber-500'
    },
    info: {
      icon: <Info className="text-white" size={22} />,
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      progress: 'bg-blue-500'
    }
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} border-l-4 rounded-xl shadow-xl p-4 flex items-center gap-4 min-w-[320px] max-w-md animate-slide-in backdrop-blur-sm`}>
      <div className={`${style.iconBg} flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center shadow-md`}>
        {style.icon}
      </div>
      <p className={`${style.text} flex-1 font-semibold text-sm leading-relaxed`}>
        {message}
      </p>
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${style.text} hover:opacity-70 transition-opacity p-1 rounded-lg hover:bg-white/50`}
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;
