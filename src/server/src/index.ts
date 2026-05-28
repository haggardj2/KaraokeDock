import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { apiRouter, setPostQueueUpdate } from './routes/api';
import { mediaRouter } from './routes/media';
import { WebSocketServer } from 'ws';
import { qrRouter } from './routes/qr';
import { rotationRouter } from './routes/rotation';
import { processMissingDurations } from './scanner';
import { logger, setLogLevel, type LogLevel } from './logger';
import { ensureAdminUser, validateSessionInfo } from './db';

// Helper to add timestamps to console logs
function timestamp() {
  return new Date().toISOString();
}


const app = express();
const port = Number(process.env.PORT || 5174);
const BOOTSTRAP_PASSWORD_LOG_DELAY_MS = 60_000;
const bootstrapAdminPromise = ensureAdminUser().catch((e) => {
  console.error('ensureAdminUser failed', e);
  return null;
});

// Configure trust proxy for apps behind reverse proxies/load balancers
// This allows Express to properly identify client IPs from X-Forwarded-For headers
// Default: trust the first proxy (loopback, private networks)
// Can be configured via TRUST_PROXY env variable:
// - 'true' = trust all proxies
// - 'false' = trust no proxies  
// - number = trust first N hops
// - string = trust specific IP/CIDR ranges (comma-separated)
const trustProxyValue = process.env.TRUST_PROXY || '1';
if (trustProxyValue === 'true') {
  app.set('trust proxy', true);
} else if (trustProxyValue === 'false') {
  app.set('trust proxy', false);
} else if (!isNaN(Number(trustProxyValue))) {
  app.set('trust proxy', Number(trustProxyValue));
} else {
  // String value (IP/CIDR ranges)
  app.set('trust proxy', trustProxyValue);
}

// Security: Helmet middleware for security headers
// Note: CSP is disabled because the web app uses inline scripts/styles (React/Vite)
// and embeds external media (YouTube videos, CDG files). 
// Consider enabling CSP with proper directives in production for enhanced security.
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow inline scripts/styles and external media
  crossOriginEmbedderPolicy: false, // Allow external media embedding from YouTube, etc.
  crossOriginResourcePolicy: false, // Allow cross-origin loading of images, videos, and other media resources
}));

// CORS configuration
// Parse ORIGIN env variable and configure CORS to only allow specified origins
// If ORIGIN is not set, allow all origins (not recommended for production)
// IMPORTANT: CORS must be configured BEFORE rate limiting so that error responses
// (like 429 Too Many Requests) include proper CORS headers
const allowedOrigins = process.env.ORIGIN?.split(',').map(origin => origin.trim()) || ['*'];
const corsOptions = {
  origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' 
    ? true  // Allow all origins if ORIGIN is not configured
    : allowedOrigins,  // Only allow specified origins
  credentials: true,  // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-session-token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600  // Cache preflight requests for 10 minutes
};

const wildcardOriginAllowed = allowedOrigins.length === 1 && allowedOrigins[0] === '*';

function isOriginAllowed(origin: string | undefined) {
  if (wildcardOriginAllowed) return true;
  if (!origin) return false;
  return allowedOrigins.includes(origin.trim());
}

function rejectUpgrade(socket: import('node:net').Socket, statusCode: number, message: string) {
  socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

console.log(`[${timestamp()}] CORS configured for origins:`, allowedOrigins);

// Apply CORS middleware to all routes (including error responses)
app.use(cors(corsOptions));

// Global rate limiter: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (~66 req/min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks, media endpoints, and QR code
  skip: (req) => {
    return req.path === '/health' || 
           req.path.startsWith('/media/') || 
           req.path === '/api/qr';
  },
});

// Apply global rate limiter to all routes (after CORS)
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' })); // Limit request body size to prevent DoS

// Log IP addresses for all requests (except frequent/internal endpoints)
app.use((req, _res, next) => {
  // Skip logging for health endpoint
  if (req.path === '/health') {
    return next();
  }
  
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = forwardedFor 
    ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim())
    : req.socket.remoteAddress || 'unknown';
  if (req.method === 'GET' || req.path === '/api/player/timing' || req.path === '/api/break-music/timing' || req.path === '/api/break-music/auto-next') {
    logger.verbose(`[${timestamp()}] Request from IP: ${ip} - ${req.method} ${req.path}`);
  } else {
    logger.info(`[${timestamp()}] Request from IP: ${ip} - ${req.method} ${req.path}`);
  }
  next();
});

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// routes
app.use('/api', apiRouter);
app.use('/api', rotationRouter);
app.use('/media', mediaRouter);  // ADD THIS LINE - mount media router at /media
app.use(qrRouter);

// websockets: broadcast exact message types Player expects
const wss = new WebSocketServer({ noServer: true });

// Keep WebSocket connections alive with ping/pong
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.ping();
    }
  });
}, 30000); // Send ping every 30 seconds

setPostQueueUpdate((type = 'queue.updated', data?: any) => {
  const msg = JSON.stringify({ type, ...(data || {}) });
  wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
});

const server = app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  void bootstrapAdminPromise.then((bootstrapAdmin) => {
    if (!bootstrapAdmin) return;
    setTimeout(() => {
      console.log(
        `[security] No admin password was configured. Generated bootstrap credentials: username="${bootstrapAdmin.username}" password="${bootstrapAdmin.password}". Change this password immediately after first login.`
      );
    }, BOOTSTRAP_PASSWORD_LOG_DELAY_MS);
  });
});

server.on('upgrade', (req, socket, head) => {
  const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
  if (!isOriginAllowed(origin)) {
    rejectUpgrade(socket, 403, 'Forbidden');
    return;
  }

  const requestUrl = new URL(req.url || '/ws', `http://${req.headers.host || 'localhost'}`);
  if (requestUrl.pathname !== '/ws') {
    rejectUpgrade(socket, 404, 'Not Found');
    return;
  }

  const sessionToken = requestUrl.searchParams.get('sessionToken');
  const proceed = async () => {
    if (sessionToken) {
      const info = await validateSessionInfo(sessionToken);
      if (!info.valid) {
        rejectUpgrade(socket, 401, 'Unauthorized');
        return;
      }
      (req as any).user = { userId: info.userId, role: info.role };
    }

    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  };

  proceed().catch((err) => {
    console.error('WebSocket upgrade failed:', err);
    rejectUpgrade(socket, 500, 'Internal Server Error');
  });
});

// Background task to process tracks with missing duration
// Runs every 30 seconds to gradually fill in missing durations
const DURATION_PROCESSING_INTERVAL = 1 * 30 * 1000; // 30 seconds
const DURATION_BATCH_SIZE = 10; // Process 10 tracks at a time
const STARTUP_DELAY = 10000; // 10 seconds

let durationProcessingInterval: NodeJS.Timeout | null = null;

async function runDurationProcessing() {
  try {
    const processed = await processMissingDurations(DURATION_BATCH_SIZE);
    if (processed > 0) {
      logger.warn(`Background task: Processed ${processed} tracks with missing duration`);
    }
  } catch (err) {
    console.error('Background duration processing error:', err);
  }
}

// Start the background task after a short delay to allow the server to fully start
// Only starts if background tasks are enabled in settings
setTimeout(async () => {
  try {
    // Import getSetting dynamically to avoid circular dependencies
    const { getSetting } = await import('./db');

    // Load persisted log level
    const savedLogLevel = await getSetting('admin.log_level');
    if (savedLogLevel) {
      setLogLevel(savedLogLevel as LogLevel);
      logger.info(`[startup] Log level set to: ${savedLogLevel}`);
    }

    const backgroundTasksEnabled = await getSetting('admin.background_tasks_enabled');
    
    // Check if background tasks are enabled (default to true if setting doesn't exist)
    if (backgroundTasksEnabled === false) {
      console.log('Background tasks are disabled in settings');
      return;
    }
    
    runDurationProcessing(); // Run immediately on startup
    durationProcessingInterval = setInterval(runDurationProcessing, DURATION_PROCESSING_INTERVAL);
  } catch (err) {
    console.error('Failed to start background task:', err);
  }
}, STARTUP_DELAY);

// keep process alive, log crashes
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));