import express from 'express';
import cors from 'cors';
import { apiRouter, setPostQueueUpdate } from './routes/api';
import { mediaRouter } from './routes/media';  // ADD THIS IMPORT
import { WebSocketServer } from 'ws';
import { qrRouter } from './routes/qr';

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

// keep process alive, log crashes
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));