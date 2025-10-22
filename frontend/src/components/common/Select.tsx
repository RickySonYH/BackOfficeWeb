// frontend/src/components/common/Select.tsx

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = '선택하세요',
  error,
  disabled = false,
  fullWidth = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const baseStyles = 'relative';
  const buttonStyles = `
    w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-success-500 
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-success-400'}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
  `;

  return (
    <div className={`${baseStyles} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div ref={selectRef} className="relative">
        <button
          type="button"
          className={buttonStyles.trim()}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                옵션이 없습니다
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-success-50 focus:outline-none focus:bg-success-50
                    ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 cursor-pointer'}
                    ${value === option.value ? 'bg-success-100 text-success-900 font-medium' : ''}
                  `}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;
