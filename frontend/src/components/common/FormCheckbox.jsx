/**
 * FormCheckbox Component with Validation Support
 */

import { AlertCircle } from 'lucide-react'

export default function FormCheckbox({
  label,
  name,
  checked = false,
  onChange,
  error,
  touched,
  disabled = false,
  required = false,
  helperText,
  containerClassName = '',
  className = '',
}) {
  const hasError = touched && error;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      <div className="flex items-start">
        <input
          id={name}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            mt-1 h-4 w-4 rounded border-gray-300 text-blue-600
            focus:ring-blue-500 focus:ring-1 cursor-pointer
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            transition-colors
            ${hasError ? 'border-red-500' : ''}
            ${className}
          `}
        />
        
        {label && (
          <label
            htmlFor={name}
            className={`ml-2 text-sm ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700'}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1 ml-6">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {!hasError && helperText && (
        <p className="mt-1 text-sm text-gray-600 ml-6">
          {helperText}
        </p>
      )}
    </div>
  );
}
