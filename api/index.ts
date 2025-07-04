import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DiceNotationParser } from '../src/parser/dice-notation-parser.js';
import { DiceRoller } from '../src/roller/dice-roller.js';
import { z } from 'zod';

const diceRollInputSchema = z.object({
  notation: z.string(),
  label: z.string().optional(),
  verbose: z.boolean().optional(),
});

const parser = new DiceNotationParser();
const roller = new DiceRoller();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for MCP
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    
    // Handle /tools endpoint for Claude.ai web interface
    if (url.pathname === '/api/tools') {
      res.status(200).json([
        {
          name: 'dice_roll',
          description: 'Roll dice using standard notation (e.g., "3d6+2", "2d20kh1")',
          input_schema: {
            type: 'object',
            properties: {
              notation: { 
                type: 'string', 
                description: 'Dice notation like "3d6+2", "4d6kh3", "2d20kl1", etc.' 
              },
              label: { 
                type: 'string', 
                description: 'Optional label for the roll (e.g., "Damage roll")' 
              },
              verbose: { 
                type: 'boolean', 
                description: 'Show detailed breakdown of the roll' 
              },
            },
            required: ['notation'],
          },
        },
        {
          name: 'dice_validate',
          description: 'Validate dice notation without rolling',
          input_schema: {
            type: 'object',
            properties: {
              notation: { 
                type: 'string', 
                description: 'Dice notation to validate (e.g., "3d6+2")' 
              },
            },
            required: ['notation'],
          },
        },
      ]);
      return;
    }
    
    // Default health check and server info
    res.status(200).json({
      name: 'dice-roller',
      version: '1.0.0',
      status: 'healthy',
      protocol: 'mcp',
      tools: ['dice_roll', 'dice_validate'],
      description: 'Dice Rolling MCP Server - provides comprehensive dice rolling with advanced gaming mechanics'
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      
      // Handle direct tool execution for Claude.ai web interface
      if (url.pathname === '/api/tools') {
        const { name, input } = req.body;
        
        if (name === 'dice_roll') {
          const { notation, label, verbose } = diceRollInputSchema.parse(input);
          const expression = parser.parse(notation);
          const result = roller.roll(expression);

          let text = `You rolled ${notation}`;
          if (label) text += ` for ${label}`;
          text += `:\n🎲 Total: ${result.total}`;
          if (verbose) {
            text += `\n📊 Breakdown: ${result.breakdown}`;
          }

          res.status(200).json({ result: text });
          return;
        }

        if (name === 'dice_validate') {
          const { notation } = input;
          
          try {
            const expression = parser.parse(notation);
            let text = `✅ Valid dice notation: ${notation}`;
            
            if (expression.dice.length > 0) {
              text += '\n\nBreakdown:';
              for (const die of expression.dice) {
                const count = Math.abs(die.count);
                const sign = die.count < 0 ? '-' : '+';
                text += `\n• ${sign === '+' ? '' : sign}${count}d${die.size}`;
                
                if (die.keep) {
                  text += ` (keep ${die.keep.type === 'h' ? 'highest' : 'lowest'} ${die.keep.count})`;
                }
                if (die.drop) {
                  text += ` (drop ${die.drop.type === 'h' ? 'highest' : 'lowest'} ${die.drop.count})`;
                }
                if (die.reroll) {
                  text += ` (reroll ${die.reroll.join(', ')})`;
                }
                if (die.explode) {
                  text += ' (exploding dice)';
                }
                if (die.success) {
                  text += ` (success on ${die.success}+)`;
                }
              }
            }
            
            if (expression.modifier !== 0) {
              text += `\n• Modifier: ${expression.modifier > 0 ? '+' : ''}${expression.modifier}`;
            }

            res.status(200).json({ result: text });
            return;
          } catch (error) {
            res.status(200).json({ 
              result: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}` 
            });
            return;
          }
        }

        res.status(404).json({ error: `Unknown tool: ${name}` });
        return;
      }

      const { method, params, id } = req.body;

      // Handle tools/list (MCP protocol)
      if (method === 'tools/list') {
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'dice_roll',
                description: 'Roll dice using standard notation',
                inputSchema: {
                  type: 'object',
                  properties: {
                    notation: { type: 'string', description: 'e.g., "3d6+2"' },
                    label: { type: 'string', description: 'e.g., "Damage roll"' },
                    verbose: { type: 'boolean', description: 'Show detailed breakdown' },
                  },
                  required: ['notation'],
                },
              },
              {
                name: 'dice_validate',
                description: 'Validate dice notation without rolling',
                inputSchema: {
                  type: 'object',
                  properties: {
                    notation: { type: 'string', description: 'e.g., "3d6+2"' },
                  },
                  required: ['notation'],
                },
              },
            ],
          },
        });
        return;
      }

      // Handle tools/call
      if (method === 'tools/call') {
        const { name, arguments: args } = params;

        if (name === 'dice_roll') {
          const { notation, label, verbose } = diceRollInputSchema.parse(args);
          const expression = parser.parse(notation);
          const result = roller.roll(expression);

          let text = `You rolled ${notation}`;
          if (label) text += ` for ${label}`;
          text += `:\n🎲 Total: ${result.total}`;
          if (verbose) {
            text += `\n📊 Breakdown: ${result.breakdown}`;
          }

          res.status(200).json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text }],
            },
          });
          return;
        }

        if (name === 'dice_validate') {
          const { notation } = args;
          
          try {
            const expression = parser.parse(notation);
            let text = `✅ Valid dice notation: ${notation}`;
            
            if (expression.dice.length > 0) {
              text += '\n\nBreakdown:';
              for (const die of expression.dice) {
                const count = Math.abs(die.count);
                const sign = die.count < 0 ? '-' : '+';
                text += `\n• ${sign === '+' ? '' : sign}${count}d${die.size}`;
                
                if (die.keep) {
                  text += ` (keep ${die.keep.type === 'h' ? 'highest' : 'lowest'} ${die.keep.count})`;
                }
                if (die.drop) {
                  text += ` (drop ${die.drop.type === 'h' ? 'highest' : 'lowest'} ${die.drop.count})`;
                }
                if (die.reroll) {
                  text += ` (reroll ${die.reroll.join(', ')})`;
                }
                if (die.explode) {
                  text += ' (exploding dice)';
                }
                if (die.success) {
                  text += ` (success on ${die.success}+)`;
                }
              }
            }
            
            if (expression.modifier !== 0) {
              text += `\n• Modifier: ${expression.modifier > 0 ? '+' : ''}${expression.modifier}`;
            }

            res.status(200).json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text }],
              },
            });
            return;
          } catch (error) {
            res.status(200).json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ 
                  type: 'text', 
                  text: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}` 
                }],
              },
            });
            return;
          }
        }

        // Unknown tool
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${name}`,
          },
        });
        return;
      }

      // Handle other MCP methods
      if (method === 'resources/list') {
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { resources: [] },
        });
        return;
      }

      if (method === 'prompts/list') {
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { prompts: [] },
        });
        return;
      }

      if (method === 'initialize') {
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'dice-roller',
              version: '1.0.0',
            },
          },
        });
        return;
      }

      // Unknown method
      res.status(200).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      });
    } catch (error) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}