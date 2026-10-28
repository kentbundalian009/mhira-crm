/**
 * NoSQL Injection Protection Middleware
 * Recursively inspects and sanitizes request data (body, query, params)
 * by removing or stripping keys starting with '$' or containing dots.
 */

const sanitizeObject = (target) => {
  if (!target || typeof target !== "object") return target;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = sanitizeObject(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    // Check if key starts with '$' (Mongo operators) or contains '.'
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`🛡️ [Security] Blocked potential NoSQL injection key: "${key}"`);
      delete target[key];
    } else {
      target[key] = sanitizeObject(target[key]);
    }
  }

  return target;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

export default mongoSanitize;
