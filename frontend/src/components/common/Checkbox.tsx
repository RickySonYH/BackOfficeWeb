// [advice from AI] Checkbox 컴포넌트
import React from 'react';

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50"
      />
      <label 
        htmlFor={id} 
        className={`ml-2 text-sm text-gray-700 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      >
        {label}
      </label>
    </div>
  );
};

export default Checkbox;
