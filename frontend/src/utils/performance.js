/**
 * Performance Utilities for YojanaMitra Frontend
 * Helps optimize bundle size, rendering, and load times
 */

/**
 * Lazy load images for better performance
 */
export const useLazyImageLoading = (imageRef, imageSrc) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imageRef.current) {
          imageRef.current.src = imageSrc;
          imageRef.current.classList.add('fade-in');
          observer.unobserve(imageRef.current);
        }
      },
      { threshold: 0.1 }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [imageSrc]);
};

/**
 * Debounce hook for search, resize, and scroll events
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Throttle hook for frequent events
 */
export const useThrottle = (value, delay) => {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRan = React.useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, delay]);

  return throttledValue;
};

/**
 * Measure performance metrics
 */
export const measurePerformance = (metricName) => {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(`${metricName}-start`);
    
    return () => {
      performance.mark(`${metricName}-end`);
      performance.measure(metricName, `${metricName}-start`, `${metricName}-end`);
      const measure = performance.getEntriesByName(metricName)[0];
      console.log(`${metricName}: ${measure.duration.toFixed(2)}ms`);
    };
  }
};

/**
 * Prefetch resources for better loading
 */
export const prefetchResource = (url, type = 'prefetch') => {
  const link = document.createElement('link');
  link.rel = type; // 'prefetch', 'preload', 'preconnect'
  link.href = url;
  if (type === 'preload') {
    link.as = 'script';
  }
  document.head.appendChild(link);
};

/**
 * Intersection Observer hook for infinite scroll
 */
export const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isVisible];
};

/**
 * Check if the browser supports a feature
 */
export const featureDetection = {
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  },
  
  supportsModuleScripts: () => {
    const script = document.createElement('script');
    return 'noModule' in script;
  },

  supportsServiceWorker: () => {
    return 'serviceWorker' in navigator;
  },

  supportsLocalStorage: () => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  supportsDarkMode: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },

  supportsReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

/**
 * Bundle size tracking (development)
 */
export const trackBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Performance Metrics:');
    performance.getEntries().forEach(entry => {
      if (entry.entryType === 'navigation') {
        console.log(`${entry.name}:`, {
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          request: entry.responseStart - entry.requestStart,
          response: entry.responseEnd - entry.responseStart,
          domInteractive: entry.domInteractive,
          domComplete: entry.domComplete,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
        });
      }
    });
  }
};

export default {
  useLazyImageLoading,
  useDebounce,
  useThrottle,
  measurePerformance,
  prefetchResource,
  useIntersectionObserver,
  featureDetection,
  trackBundleSize,
};
