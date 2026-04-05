/**
 * Form Validation Utility for YojanaMitra
 * Provides field-level validation with multi-language support
 */

const validators = {
  // Email validation
  email: (value, t) => {
    if (!value) return t('validation.emailRequired', 'Email is required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return t('validation.emailInvalid', 'Please enter a valid email address');
    }
    return '';
  },

  // Password validation
  password: (value, t) => {
    if (!value) return t('validation.passwordRequired', 'Password is required');
    if (value.length < 6) {
      return t('validation.passwordMinLength', 'Password must be at least 6 characters');
    }
    if (value.length > 72) {
      return t('validation.passwordMaxLength', 'Password must be less than 72 characters');
    }
    return '';
  },

  // Password confirmation
  confirmPassword: (value, confirmValue, t) => {
    if (!value) return t('validation.passwordRequired', 'Password is required');
    if (!confirmValue) return t('validation.confirmPasswordRequired', 'Please confirm your password');
    if (value !== confirmValue) {
      return t('validation.passwordMismatch', 'Passwords do not match');
    }
    return '';
  },

  // Name validation
  name: (value, t) => {
    if (!value) return t('validation.nameRequired', 'Name is required');
    if (value.trim().length < 2) {
      return t('validation.nameMinLength', 'Name must be at least 2 characters');
    }
    if (value.trim().length > 100) {
      return t('validation.nameMaxLength', 'Name must be less than 100 characters');
    }
    return '';
  },

  // Phone number validation (international format)
  phone: (value, t) => {
    if (!value) return t('validation.phoneRequired', 'Phone number is required');
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return t('validation.phoneInvalid', 'Please enter a valid phone number');
    }
    return '';
  },

  // Age validation
  age: (value, t, minAge = 18, maxAge = 120) => {
    if (!value) return t('validation.ageRequired', 'Age is required');
    const ageNum = parseInt(value, 10);
    if (isNaN(ageNum)) {
      return t('validation.ageInvalid', 'Age must be a number');
    }
    if (ageNum < minAge) {
      return t('validation.ageMin', `You must be at least ${minAge} years old`);
    }
    if (ageNum > maxAge) {
      return t('validation.ageMax', `Age must be less than ${maxAge}`);
    }
    return '';
  },

  // Aadhar/ID number validation (12 digits)
  aadhar: (value, t) => {
    if (!value) return t('validation.aadharRequired', 'Aadhar number is required');
    const aadharRegex = /^[0-9]{12}$/;
    if (!aadharRegex.test(value.replace(/\s/g, ''))) {
      return t('validation.aadharInvalid', 'Aadhar must be 12 digits');
    }
    return '';
  },

  // Income validation
  income: (value, t) => {
    if (!value) return t('validation.incomeRequired', 'Annual income is required');
    const incomeNum = parseFloat(value);
    if (isNaN(incomeNum) || incomeNum < 0) {
      return t('validation.incomeInvalid', 'Please enter a valid income amount');
    }
    return '';
  },

  // Required field
  required: (value, t, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return t('validation.fieldRequired', `${fieldName} is required`);
    }
    return '';
  },

  // URL validation
  url: (value, t) => {
    if (!value) return '';
    try {
      new URL(value);
      return '';
    } catch {
      return t('validation.urlInvalid', 'Please enter a valid URL');
    }
  },

  // File size validation (in MB)
  fileSize: (file, maxSizeMB, t) => {
    if (!file) return '';
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return t('validation.fileSizeExceeded', `File must be smaller than ${maxSizeMB}MB`);
    }
    return '';
  },

  // File type validation
  fileType: (file, allowedTypes, t) => {
    if (!file) return '';
    if (!allowedTypes.includes(file.type)) {
      return t('validation.fileTypeInvalid', `File type must be one of: ${allowedTypes.join(', ')}`);
    }
    return '';
  },
};

/**
 * Validate form fields
 * @param {Object} formData - Form data object
 * @param {Object} rules - Validation rules { fieldName: 'validator' or validatorFunction }
 * @param {Function} t - Translation function
 * @returns {Object} - Error object { fieldName: 'error message' }
 */
export const validateForm = (formData, rules, t) => {
  const errors = {};

  Object.entries(rules).forEach(([fieldName, rule]) => {
    const value = formData[fieldName];

    if (typeof rule === 'string') {
      // Built-in validator
      if (validators[rule]) {
        const error = validators[rule](value, t);
        if (error) errors[fieldName] = error;
      }
    } else if (typeof rule === 'function') {
      // Custom validator function
      const error = rule(value, t);
      if (error) errors[fieldName] = error;
    } else if (Array.isArray(rule)) {
      // Multiple validators for one field
      for (const validator of rule) {
        let error = '';
        if (typeof validator === 'string' && validators[validator]) {
          error = validators[validator](value, t);
        } else if (typeof validator === 'function') {
          error = validator(value, t);
        }
        if (error) {
          errors[fieldName] = error;
          break;
        }
      }
    }
  });

  return errors;
};

/**
 * Validate a single field
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @param {string|Function} rule - Validation rule
 * @param {Function} t - Translation function
 * @returns {string} - Error message or empty string
 */
export const validateField = (fieldName, value, rule, t) => {
  if (typeof rule === 'string' && validators[rule]) {
    return validators[rule](value, t);
  } else if (typeof rule === 'function') {
    return rule(value, t);
  }
  return '';
};

/**
 * Common validation schemas for different forms
 */
export const validationSchemas = {
  login: {
    email: 'email',
    password: 'password',
  },

  register: {
    name: 'name',
    email: 'email',
    password: 'password',
    confirmPassword: (value, t) => {
      if (!value) return t('validation.confirmPasswordRequired', 'Please confirm your password');
      return '';
    },
  },

  profile: {
    firstName: 'name',
    lastName: 'name',
    dateOfBirth: 'required',
    phone: 'phone',
    address: 'required',
    city: 'required',
    state: 'required',
    zipCode: 'required',
  },

  application: {
    schemeId: 'required',
    documents: 'required',
  },
};

export default {
  validateForm,
  validateField,
  validators,
  validationSchemas,
};
