import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: 'dice-roller',
      version: '1.0.0',
      description: 'Comprehensive dice rolling server with advanced gaming mechanics',
      tools_endpoint: '/api/tools',
      capabilities: {
        tools: true,
        streaming: false,
      },
      supported_formats: ['json'],
      contact: {
        url: 'https://github.com/jimmcq/dice-rolling-mcp'
      }
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}