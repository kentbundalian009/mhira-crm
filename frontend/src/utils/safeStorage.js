/**
 * Safe LocalStorage Utility with automatic quota management & error suppression
 */

// Keys that are critical and must NOT be deleted during cache cleanup
const PRESERVED_KEYS = new Set(['token', 'user', 'user_role', 'theme']);

/**
 * Clean up old/large cache entries if localStorage exceeds quota
 */
export const cleanOldCaches = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !PRESERVED_KEYS.has(key)) {
        if (
          key.startsWith('cached_') ||
          key.startsWith('mhira_db_') ||
          key.startsWith('temp_') ||
          key.includes('_items_')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  } catch (err) {
    console.warn('Cache cleanup warning:', err);
  }
};

/**
 * Sanitize data before caching (removes heavy base64 strings if over 50KB)
 */
const sanitizeForStorage = (data) => {
  if (!data) return data;
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    // If payload is already compact (< 200KB), keep as is
    if (str.length < 200000) return str;

    // For large collections, clone and replace large base64 image strings with default path
    if (Array.isArray(data)) {
      const sanitized = data.slice(0, 100).map((item) => {
        if (item && typeof item === 'object') {
          const copy = { ...item };
          if (typeof copy.image === 'string' && copy.image.startsWith('data:image') && copy.image.length > 500) {
            copy.image = '/mhira_removebg.png';
          }
          if (copy.product && typeof copy.product === 'object') {
            copy.product = { ...copy.product };
            if (typeof copy.product.image === 'string' && copy.product.image.startsWith('data:image') && copy.product.image.length > 500) {
              copy.product.image = '/mhira_removebg.png';
            }
            if (Array.isArray(copy.product.images)) {
              copy.product.images = ['/mhira_removebg.png'];
            }
          }
          return copy;
        }
        return item;
      });
      return JSON.stringify(sanitized);
    }
    return str;
  } catch {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
};

/**
 * Safely store data in localStorage without throwing QuotaExceededError
 */
export const safeSetItem = (key, value) => {
  if (!key) return false;
  try {
    const payload = sanitizeForStorage(value);
    localStorage.setItem(key, payload);
    return true;
  } catch (err) {
    // If QuotaExceededError, clean old cache keys and retry once
    if (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    ) {
      cleanOldCaches();
      try {
        const payload = sanitizeForStorage(value);
        localStorage.setItem(key, payload);
        return true;
      } catch (retryErr) {
        console.warn(`[safeStorage] Storage quota full, unable to cache key "${key}". Preserving app execution.`);
        return false;
      }
    }
    console.warn(`[safeStorage] Failed to save key "${key}":`, err);
    return false;
  }
};

/**
 * Safely retrieve JSON or primitive data from localStorage
 */
export const safeGetItem = (key, defaultValue = null) => {
  if (!key) return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    return defaultValue;
  }
};

/**
 * Safely remove an item from localStorage
 */
export const safeRemoveItem = (key) => {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {}
};

export default {
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  cleanOldCaches,
};
