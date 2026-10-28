import { Request, Response, NextFunction } from 'express';

/**
 * Checks if an object key contains MongoDB query operator prefixes or dot notation
 */
const hasForbiddenChar = (key: string): boolean => {
  return key.startsWith('$') || key.includes('.');
};

/**
 * Recursively strips MongoDB query operator keys ($gt, $ne, $where, etc.) and dot notation
 * from user-supplied input objects to prevent NoSQL operator injection attacks.
 */
const sanitizeInput = (target: any): any => {
  if (target === null || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(sanitizeInput);
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    if (hasForbiddenChar(key)) {
      // Strip forbidden NoSQL operators
      continue;
    }
    cleanObj[key] = sanitizeInput(value);
  }
  return cleanObj;
};

export const mongoSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeInput(req.params);
  }
  next();
};
