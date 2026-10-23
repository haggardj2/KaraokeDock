import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
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
const staticFiles = express.static(path.join(__dirname, 'dist'), { index: false, redirect: false });
app.use((req, res, next) => {
  let pathname;
  try {
    pathname = decodeURIComponent(req.path);
  } catch {
    return res.sendStatus(400);
  }
  if (/\.html?$/i.test(pathname)) return next();
  staticFiles(req, res, next);
});

app.get(/^\/requests\/?$/, (req, res) => {
  res.redirect(308, `/request${req.url.slice(req.path.length)}`);
});

app.get(/^\/(?:player\/?|host\/?|admin\/?|request\/?)?$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((_req, res) => {
  res.status(404).type('text').send('404 - Page not found');
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(port, () => {
    const { version } = createRequire(import.meta.url)('./package.json');
    console.log(`KaraokeDock v${version}`);
    console.log(`Web server running on http://localhost:${port}`);
  });
}
