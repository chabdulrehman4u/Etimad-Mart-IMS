import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option",
  displayField = "name",
  valueField = "id",
  searchFields = ["name"],
  renderOption,
  className = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    
    return searchFields.some(field => {
      const fieldValue = option[field];
      return fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Get selected option
  const selectedOption = options.find(option => option[valueField] === value);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
    }
  };

  const handleSelect = (option) => {
    onChange(option[valueField]);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Select Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
          isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption 
              ? (renderOption ? renderOption(selectedOption) : selectedOption[displayField])
              : placeholder
            }
          </span>
          <div className="flex items-center gap-2">
            {selectedOption && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                tabIndex={-1}
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option[valueField]}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50' : ''
                  } ${
                    option[valueField] === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`}
                  role="option"
                  aria-selected={option[valueField] === value}
                >
                  {renderOption ? renderOption(option) : option[displayField]}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm">
                {searchTerm ? 'No products found' : 'No options available'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          value={value || ''}
          required={required}
          onChange={() => {}} // Controlled by the component
        />
      )}
    </div>
  );
};

export default SearchableSelect;
