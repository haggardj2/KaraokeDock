import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5173;
const HEALTH_PATH = '/health';

// Helper to add timestamps to console logs
function timestamp() {
  return new Date().toISOString();
}

// Log IP addresses for all requests (except health checks and GET requests which are verbose-level)
app.use((req, _res, next) => {
  if (req.path === HEALTH_PATH || req.method === 'GET') {
    return next();
  }
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = forwardedFor 
    ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim())
    : req.socket.remoteAddress || 'unknown';
  console.log(`[${timestamp()}] Request from IP: ${ip} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get(HEALTH_PATH, (_req, res) => res.json({ ok: true }));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all routes (Express 5 compatible wildcard)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Web server running on http://localhost:${port}`);
});
