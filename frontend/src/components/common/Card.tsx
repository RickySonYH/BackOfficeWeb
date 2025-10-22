// frontend/src/components/common/Card.tsx

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  shadow = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  
  const cardClasses = `
    ${baseClasses}
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClasses}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
};

export default Card;
