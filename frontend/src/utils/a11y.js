/**
 * Accessibility Utilities for ARIA and Semantic HTML
 * Provides helper functions and components for accessible components
 */

/**
 * Get progress bar screen reader text
 */
export const getProgressAriaLabel = (current, total, label) => {
  return `${label}: ${current} of ${total} completed, ${Math.round((current / total) * 100)}% progress`;
};

/**
 * Get form field error announcement
 */
export const getFieldErrorAnnouncement = (fieldName, error) => {
  return `${fieldName}: ${error}`;
};

/**
 * Get loading state announcement
 */
export const getLoadingAnnouncement = (context = 'data') => {
  return `Loading ${context}. Please wait.`;
};

/**
 * Get table cell header for accessibility
 */
export const getTableCellId = (rowId, columnKey) => {
  return `cell-${rowId}-${columnKey}`;
};

/**
 * Get list item count announcement
 */
export const getListItemCountAnnouncement = (count, itemType = 'items') => {
  return `${count} ${itemType}`;
};

/**
 * Get keyboard shortcut help text
 */
export const getKeyboardShortcutText = () => {
  return 'Use Tab to navigate, Enter to activate, Escape to close.';
};

/**
 * Announce dynamic content changes (for screen readers)
 */
export const announceContentChange = (message, priority = 'polite') => {
  const ariaLive = document.createElement('div');
  ariaLive.setAttribute('role', 'status');
  ariaLive.setAttribute('aria-live', priority); // 'polite' or 'assertive'
  ariaLive.setAttribute('aria-atomic', 'true');
  ariaLive.className = 'sr-only'; // Hide visually but accessible to screen readers
  ariaLive.textContent = message;
  
  document.body.appendChild(ariaLive);
  setTimeout(() => ariaLive.remove(), 3000);
};

/**
 * Skip to main content link
 */
export const SkipToMainContent = ({ href = '#main-content', label = 'Skip to main content' }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:bg-blue-600 focus:text-white focus:p-4 focus:z-50"
  >
    {label}
  </a>
);

/**
 * Accessible icon button
 */
export const AccessibleIconButton = ({
  icon: Icon,
  label,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
}) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg hover:bg-gray-100 transition ${className}`}
    aria-label={label}
    disabled={disabled}
    type="button"
  >
    <Icon size={20} aria-hidden="true" />
  </button>
);

/**
 * Accessible card component
 */
export const AccessibleCard = ({
  children,
  title,
  description,
  ariaLabelledby,
  ariaDescribedby,
  role = 'article',
  className = '',
}) => {
  const titleId = ariaLabelledby || `card-title-${Math.random()}`;
  const descId = ariaDescribedby || `card-desc-${Math.random()}`;

  return (
    <div
      className={`card ${className}`}
      role={role}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      {title && <h3 id={titleId} className="text-lg font-bold mb-2">{title}</h3>}
      {description && <p id={descId} className="text-gray-600 text-sm mb-4">{description}</p>}
      {children}
    </div>
  );
};

/**
 * Announce success/error messages to screen readers
 */
export const useA11yAnnounce = () => {
  const announceSuccess = (message) => {
    announceContentChange(message, 'polite');
  };

  const announceError = (message) => {
    announceContentChange(message, 'assertive');
  };

  return { announceSuccess, announceError };
};

/**
 * Accessible modal component props
 */
export const getModalA11yProps = (isOpen, title) => {
  return {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': isOpen ? 'modal-title' : undefined,
    'aria-hidden': !isOpen,
  };
};

/**
 * Focus management utility
 */
export const useFocusManagement = () => {
  const setFocus = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();
      }
    }, 0);
  };

  const setFocusTrap = (containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    return (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };
  };

  return { setFocus, setFocusTrap };
};

export default {
  getProgressAriaLabel,
  getFieldErrorAnnouncement,
  getLoadingAnnouncement,
  announceContentChange,
  SkipToMainContent,
  AccessibleIconButton,
  AccessibleCard,
  useA11yAnnounce,
  getModalA11yProps,
  useFocusManagement,
};
