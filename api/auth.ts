import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Bearer');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Log auth request for debugging
  console.log('Auth Request:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Return successful auth for any request
  res.status(200).json({
    authenticated: true,
    message: 'Authentication successful',
    server: 'dice-roller',
    timestamp: new Date().toISOString()
  });
}