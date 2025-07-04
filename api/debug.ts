import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Simulate the full MCP flow
    const flow = {
      step1_handshake: {
        url: '/api/mcp',
        method: 'GET',
        expected_response: {
          protocol: 'mcp',
          version: '2024-11-05',
          name: 'dice-roller',
          capabilities: { tools: true }
        }
      },
      step2_initialize: {
        url: '/api/mcp',
        method: 'POST',
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'claude', version: '1.0' }
          }
        }
      },
      step3_tools_list: {
        url: '/api/mcp',
        method: 'POST',
        payload: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      },
      step4_tool_call: {
        url: '/api/mcp',
        method: 'POST',
        payload: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'dice_roll',
            arguments: { notation: '3d6+2' }
          }
        }
      }
    };

    res.status(200).json({
      message: 'MCP Integration Debug Info',
      expected_flow: flow,
      test_endpoints: [
        'GET /api/mcp - Handshake/Info',
        'POST /api/mcp - MCP JSON-RPC Protocol',
        'GET /api/tools - Tool Definitions (Alternative)',
        'POST /api/tools - Direct Tool Execution (Alternative)'
      ],
      current_timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'POST') {
    // Test a specific MCP call
    const { test_call } = req.body;
    
    if (test_call === 'tools_list') {
      // Simulate what tools/list should return
      res.status(200).json({
        jsonrpc: '2.0',
        id: 'test',
        result: {
          tools: [
            {
              name: 'dice_roll',
              description: 'Roll dice using standard notation. Supports standard dice (3d6+2), advantage/disadvantage (2d20kh1), keep/drop (4d6kh3), exploding dice (3d6!), rerolls (4d6r1), and success counting (5d10>7).',
              inputSchema: {
                type: 'object',
                properties: {
                  notation: { 
                    type: 'string', 
                    description: 'Dice notation string' 
                  },
                  label: { 
                    type: 'string', 
                    description: 'Optional label' 
                  },
                  verbose: { 
                    type: 'boolean', 
                    description: 'Show detailed breakdown' 
                  },
                },
                required: ['notation'],
              },
            },
            {
              name: 'dice_validate',
              description: 'Validate dice notation syntax without performing the roll.',
              inputSchema: {
                type: 'object',
                properties: {
                  notation: { 
                    type: 'string', 
                    description: 'Dice notation to validate' 
                  },
                },
                required: ['notation'],
              },
            },
          ],
        },
      });
      return;
    }

    res.status(200).json({
      message: 'Debug endpoint',
      received_body: req.body,
      available_tests: ['tools_list']
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}