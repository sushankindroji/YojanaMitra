/**
 * FormInput Component with Validation Support
 * Provides a reusable form input with error states and validation feedback
 */

import { AlertCircle, Check } from 'lucide-react'

export default function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  required = false,
  autoComplete,
  pattern,
  maxLength,
  minLength,
  helperText,
  icon: Icon,
  successMessage,
  className = '',
  containerClassName = '',
}) {
  const hasError = touched && error;
  const isSuccess = touched && !error && value && !successMessage === false;

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
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}
        
        <input
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          pattern={pattern}
          maxLength={maxLength}
          minLength={minLength}
          required={required}
          className={`
            w-full px-4 py-2 border rounded-lg transition-all
            ${Icon ? 'pl-10' : 'pl-4'}
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
        />

        {/* Success indicator */}
        {isSuccess && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
            <Check size={18} />
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

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

      {/* Success message */}
      {isSuccess && successMessage && (
        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
          <Check size={14} />
          {successMessage}
        </p>
      )}
    </div>
  );
}
