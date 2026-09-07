import React from 'react';
import { ScanLine } from 'lucide-react';

const ScanInput = ({
  label = 'Scan',
  placeholder = 'Scan barcode...',
  helperText,
  onScan,
  disabled,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.currentTarget.value;
      if (value && typeof onScan === 'function') {
        onScan(value);
      }
      e.currentTarget.value = '';
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-green-800 flex items-center gap-1">
          <ScanLine className="w-4 h-4" />
          <span>{label}</span>
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-green-700">
          <ScanLine className="w-4 h-4" />
        </span>
        <input
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-3 py-2 border border-green-400  bg-green-50 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
      {helperText && (
        <p className="text-xs text-amber-700">{helperText}</p>
      )}
    </div>
  );
};

export default ScanInput;
