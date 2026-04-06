/**
 * FormSelect Component with Validation Support
 * Provides a reusable select dropdown with error states
 */

import { AlertCircle, Check } from 'lucide-react'

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  touched,
  disabled = false,
  required = false,
  placeholder = 'Select an option',
  helperText,
  containerClassName = '',
  className = '',
}) {
  const hasError = touched && error;
  const isSuccess = touched && !error && value;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="mb-2 block text-label font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`
            w-full border px-4 py-2 text-body rounded-lg transition-all
            appearance-none bg-white
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : isSuccess
              ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            focus:outline-none focus:ring-1
            ${className}
          `}
        >
          {!value && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        {/* Success indicator */}
        {isSuccess && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-green-500 pointer-events-none">
            <Check size={18} />
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-red-500 pointer-events-none">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p className="mt-1 flex items-center gap-1 text-caption text-red-600">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {!hasError && helperText && (
        <p className="mt-1 text-caption text-gray-600">
          {helperText}
        </p>
      )}
    </div>
  );
}
