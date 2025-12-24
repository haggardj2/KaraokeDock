import express from 'express';
import cors from 'cors';
import { apiRouter, setPostQueueUpdate } from './routes/api';
import { mediaRouter } from './routes/media';  // ADD THIS IMPORT
import { WebSocketServer } from 'ws';
import { qrRouter } from './routes/qr';
import { processMissingDurations } from './scanner';

const app = express();
const port = Number(process.env.PORT || 5174);

// middleware
app.use(cors());
app.use(express.json());

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// routes
app.use('/api', apiRouter);
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
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

// Background task to process tracks with missing duration
// Runs every 30 seconds to gradually fill in missing durations
const DURATION_PROCESSING_INTERVAL = 1 * 30 * 1000; // 30 seconds
const DURATION_BATCH_SIZE = 10; // Process 10 tracks at a time
const STARTUP_DELAY = 10000; // 10 seconds

let durationProcessingInterval: NodeJS.Timeout | null = null;

async function runDurationProcessing() {
  try {
    // Import getSetting dynamically to avoid circular dependencies
    const { getSetting } = await import('./db.js');
    const backgroundTasksEnabled = await getSetting('admin.background_tasks_enabled');
    
    // Check if background tasks are enabled (default to true)
    if (backgroundTasksEnabled === false) {
      return;
    }
    
    const processed = await processMissingDurations(DURATION_BATCH_SIZE);
    if (processed > 0) {
      console.log(`Background task: Processed ${processed} tracks with missing duration`);
    }
  } catch (err) {
    console.error('Background duration processing error:', err);
  }
}

// Start the background task after a short delay to allow the server to fully start
setTimeout(() => {
  console.log('Starting background duration processing task...');
  runDurationProcessing(); // Run immediately on startup
  durationProcessingInterval = setInterval(runDurationProcessing, DURATION_PROCESSING_INTERVAL);
}, STARTUP_DELAY);

// keep process alive, log crashes
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));