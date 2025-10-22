// frontend/src/components/common/Input.tsx

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'block px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200';
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
    : 'border-gray-300 focus:border-[#A8D5E2] focus:ring-[#A8D5E2]';

  const inputClasses = `
    ${baseClasses}
    ${widthClass}
    ${errorClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      
      <input
        ref={ref}
        id={inputId}
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
