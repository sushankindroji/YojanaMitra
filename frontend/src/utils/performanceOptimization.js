/**
 * Frontend Performance Optimization Utilities
 */

// Debounce utility for search and input handlers
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility for scroll and resize handlers
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Lazy load images
export function lazyLoadImages() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('loading');
        observer.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

// Prefetch resources
export function prefetchResources(urls) {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

// Battery status API
export async function checkBatteryStatus() {
  if ('getBattery' in navigator) {
    const battery = await navigator.getBattery();
    return {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
    };
  }
  return null;
}

// Connection speed detection
export function checkConnectionSpeed() {
  if ('connection' in navigator) {
    const connection = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
  }
  return null;
}

// Memory usage detection
export function checkMemoryUsage() {
  if ('memory' in performance) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
}

// Measure performance metrics
export function measurePerformance(name, callback) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}`;

  performance.mark(startMark);
  const result = callback();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  const measure = performance.getEntriesByName(measureName)[0];
  console.log(`${name} took ${measure.duration.toFixed(2)}ms`);

  return result;
}

// Report Web Vitals
export function reportWebVitals() {
  if ('web-vital' in window) {
    const webVital = window['web-vital'];
    console.log('Largest Contentful Paint (LCP):', webVital.lcp);
    console.log('First Input Delay (FID):', webVital.fid);
    console.log('Cumulative Layout Shift (CLS):', webVital.cls);
  }
}

// Worker thread support detection
export function hasWorkerSupport() {
  return typeof Worker !== 'undefined';
}

// Storage quota check
export async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: (estimate.usage / estimate.quota) * 100,
    };
  }
  return null;
}

// Optimize CSS
export function optimizeCSS() {
  // Remove unused CSS
  // Minify CSS
  // Load critical CSS inline
  // Defer non-critical CSS
}

// Optimize JavaScript
export function optimizeJS() {
  // Split code by routes
  // Lazy load non-critical scripts
  // Defer script execution
  // Use service workers for caching
}

// Cache API responses
export const apiCache = new Map();

export function getCachedAPI(key, ttl = 3600) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl * 1000) {
    return cached.data;
  }
  return null;
}

export function setCachedAPI(key, data) {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearAPICache(keyPattern = null) {
  if (keyPattern) {
    const keys = Array.from(apiCache.keys()).filter((key) =>
      key.includes(keyPattern)
    );
    keys.forEach((key) => apiCache.delete(key));
  } else {
    apiCache.clear();
  }
}

// Virtual scrolling for large lists
export function enableVirtualScroll(container, itemHeight, totalItems) {
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  return { startIndex, endIndex, visibleItems: endIndex - startIndex };
}

// Export all utilities for use
export const PerformanceUtils = {
  debounce,
  throttle,
  lazyLoadImages,
  prefetchResources,
  checkBatteryStatus,
  checkConnectionSpeed,
  checkMemoryUsage,
  measurePerformance,
  reportWebVitals,
  hasWorkerSupport,
  checkStorageQuota,
  optimizeCSS,
  optimizeJS,
  getCachedAPI,
  setCachedAPI,
  clearAPICache,
  enableVirtualScroll,
};
