/**
 * Frontend Accessibility (A11y) Utilities
 * WCAG 2.1 AA compliance
 */

// Check if component is visible and accessible
export function isAccessible(element) {
  return {
    isVisible: element.offsetParent !== null,
    isInViewport: element.getBoundingClientRect().top >= 0 &&
                  element.getBoundingClientRect().bottom <= window.innerHeight,
    hasLabel: element.hasAttribute('aria-label') || 
              document.querySelector(`label[for="${element.id}"]`),
    hasAlt: element.hasAttribute('alt'),
    isKeyboard: element.hasAttribute('tabindex') || 
                ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName),
  };
}

// Focus management utilities
export class FocusManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.focusableElements = this.getFocusableElements();
  }

  getFocusableElements() {
    if (!this.container) return [];
    return Array.from(
      this.container.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  focusFirst() {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  focusLast() {
    if (this.focusableElements.length > 0) {
      this.focusableElements[this.focusableElements.length - 1].focus();
    }
  }

  focusNext() {
    const currentIndex = this.focusableElements.indexOf(document.activeElement);
    const nextIndex = (currentIndex + 1) % this.focusableElements.length;
    if (this.focusableElements[nextIndex]) {
      this.focusableElements[nextIndex].focus();
    }
  }

  focusPrevious() {
    const currentIndex = this.focusableElements.indexOf(document.activeElement);
    const prevIndex = (currentIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
    if (this.focusableElements[prevIndex]) {
      this.focusableElements[prevIndex].focus();
    }
  }

  trapFocus(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === this.focusableElements[0]) {
          e.preventDefault();
          this.focusLast();
        }
      } else {
        if (document.activeElement === this.focusableElements[this.focusableElements.length - 1]) {
          e.preventDefault();
          this.focusFirst();
        }
      }
    }
  }
}

// Announce to screen readers
export function announceToScreenReader(message, priority = 'polite') {
  let container = document.querySelector('[role="status"]');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', priority);
    container.setAttribute('aria-atomic', 'true');
    container.className = 'sr-only';
    document.body.appendChild(container);
  }

  container.innerText = message;
  setTimeout(() => {
    container.innerText = '';
  }, 3000);
}

// Keyboard shortcut manager
export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
  }

  register(key, modifier, callback) {
    const shortcutKey = `${modifier}+${key}`;
    this.shortcuts.set(shortcutKey, callback);
  }

  init() {
    document.addEventListener('keydown', (e) => {
      const modifier = e.ctrlKey || e.metaKey ? 'ctrl' : 'alt';
      const key = e.key.toLowerCase();
      const shortcutKey = `${modifier}+${key}`;

      if (this.shortcuts.has(shortcutKey)) {
        e.preventDefault();
        this.shortcuts.get(shortcutKey)();
      }
    });
  }

  unregister(key, modifier) {
    const shortcutKey = `${modifier}+${key}`;
    this.shortcuts.delete(shortcutKey);
  }
}

// Color contrast checker (WCAG AAA)
export function checkContrast(foreground, background) {
  const getLuminance = (color) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const luminance =
      (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance <= 0.03928
      ? luminance / 12.92
      : Math.pow((luminance + 0.055) / 1.055, 2.4);
  };

  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  const contrast = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: contrast.toFixed(2),
    isAACompliant: contrast >= 4.5,
    isAAACompliant: contrast >= 7,
  };
}

// Skip to main content functionality
export function createSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-blue-600 focus:text-white focus:p-4';
  skipLink.textContent = 'Skip to main content';
  document.body.insertBefore(skipLink, document.body.firstChild);
}

// Language and direction support
export function setLanguageAndDirection(lang, direction = null) {
  document.documentElement.lang = lang;
  if (direction) {
    document.documentElement.dir = direction;
  }
}

// Motion preferences
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Color scheme preferences
export function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// High contrast mode detection
export function prefersHighContrast() {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

// Large text detection
export function prefersLargeText() {
  return window.matchMedia('(prefers-contrast: more)').matches ||
         (window.innerWidth / window.devicePixelRatio < 400);
}

// Validate ARIA attributes
export function validateAria(element) {
  const issues = [];

  // Check for required ARIA attributes
  const role = element.getAttribute('role');
  if (role) {
    const requiredAttrs = {
      button: ['aria-pressed'],
      listbox: ['aria-label'],
      radiogroup: ['aria-label'],
      tablist: [],
    };

    if (role in requiredAttrs) {
      requiredAttrs[role].forEach((attr) => {
        if (!element.hasAttribute(attr)) {
          issues.push(`Missing required ARIA attribute: ${attr}`);
        }
      });
    }
  }

  // Check for invalid ARIA values
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim().length === 0) {
    issues.push('aria-label is empty');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Export accessibility utilities
export const A11yUtils = {
  isAccessible,
  FocusManager,
  announceToScreenReader,
  KeyboardShortcuts,
  checkContrast,
  createSkipLink,
  setLanguageAndDirection,
  prefersReducedMotion,
  prefersDarkMode,
  prefersHighContrast,
  prefersLargeText,
  validateAria,
};
