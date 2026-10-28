import { Request, Response, NextFunction } from 'express';

/**
 * Standard OWASP and production-grade HTTP security headers middleware.
 * Uses native Express res.setHeader without requiring external third-party dependencies.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent framing & clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Modern browsers disable legacy buggy XSS filters
  res.setHeader('X-XSS-Protection', '0');

  // Force HTTPS in production environments
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict resource loading & frame ancestors
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none';");

  // Disable sensitive hardware access from API context
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
};
