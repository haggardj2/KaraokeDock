// server/src/middleware/rateLimiters.ts
import rateLimit from 'express-rate-limit';

// Stricter rate limiter for authentication endpoints: 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for search endpoints: 30 requests per minute per IP
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150, // Shared Wi-Fi guests can generate many debounced searches per minute
  message: 'Too many search requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.headers['x-session-token']),
});

// Rate limiter for queue operations: 20 requests per minute per IP
export const queueLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Allow multiple singers on one network to queue songs without repeated lockouts
  message: 'Too many queue requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.headers['x-session-token']),
});
