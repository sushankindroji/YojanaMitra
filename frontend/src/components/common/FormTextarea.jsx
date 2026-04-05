/**
 * FormTextarea Component with Validation Support
 */

import { AlertCircle, Check } from 'lucide-react'

export default function FormTextarea({
  label,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  required = false,
  rows = 4,
  maxLength,
  helperText,
  containerClassName = '',
  className = '',
}) {
  const hasError = touched && error;
  const charCount = value ? value.length : 0;
  const isSuccess = touched && !error && value;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
          className={`
            w-full px-4 py-2 border rounded-lg transition-all
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : isSuccess
              ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            focus:outline-none focus:ring-1 resize-none
            ${className}
          `}
        />

        {/* Success indicator */}
        {isSuccess && (
          <div className="absolute right-3 top-3 text-green-500">
            <Check size={18} />
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute right-3 top-3 text-red-500">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

      {/* Character count */}
      {maxLength && (
        <p className={`mt-1 text-xs ${charCount > maxLength * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
          {charCount} / {maxLength}
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {!hasError && helperText && (
        <p className="mt-1 text-sm text-gray-600">
          {helperText}
        </p>
      )}
    </div>
  );
}
