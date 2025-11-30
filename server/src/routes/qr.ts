// server/src/routes/qr.ts
import express from 'express';
import QRCode from 'qrcode';

export const qrRouter = express.Router();

qrRouter.get('/api/qr', async (req, res) => {
  try {
    // Get the web app URL from environment variable
    // Format should be like: http://192.168.1.100:5173 or http://hostname:5173
    // Falls back to using the API server's host with port 5173
    let webAppUrl = process.env.WEB_APP_URL;
    
    if (!webAppUrl) {
      // Try to construct from request host, but replace API port (5174) with web port (5173)
      const host = req.get('host') || 'localhost:5174';
      const hostWithoutPort = host.split(':')[0];
      webAppUrl = `${req.protocol}://${hostWithoutPort}:5173`;
    }
    
    // Generate QR for the requests page
    const requestsUrl = `${webAppUrl}/requests`;
    
    console.log(`Generating QR code for: ${requestsUrl}`);
    
    const qrDataUrl = await QRCode.toDataURL(requestsUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Convert data URL to buffer and send as image
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const img = Buffer.from(base64Data, 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length,
      'Cache-Control': 'public, max-age=60'  // Cache for 1 minute to allow for IP changes
    });
    
    res.end(img);
  } catch (error) {
    console.error('QR generation failed:', error);
    res.status(500).send('QR generation failed');
  }
});