// frontend/src/components/common/Button.tsx

import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'light' | 'info';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-[#A8D5E2] hover:bg-[#96C7D6] text-gray-800 focus:ring-[#A8D5E2]',
    secondary: 'bg-[#E8B4D0] hover:bg-[#DDA3C4] text-gray-800 focus:ring-[#E8B4D0]',
    success: 'bg-[#B8E6B8] hover:bg-[#A6D9A6] text-gray-800 focus:ring-[#B8E6B8]',
    warning: 'bg-[#FFE4B5] hover:bg-[#F5D8A3] text-gray-800 focus:ring-[#FFE4B5]',
    danger: 'bg-red-100 hover:bg-red-200 text-red-800 focus:ring-red-200',
    light: 'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-200',
    info: 'bg-blue-100 hover:bg-blue-200 text-blue-800 focus:ring-blue-200'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : '';

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${disabledClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          처리중...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
