import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 flex items-center gap-2 justify-center';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg disabled:bg-blue-300',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:bg-slate-100',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg disabled:bg-rose-300',
    success: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg disabled:bg-indigo-300',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
