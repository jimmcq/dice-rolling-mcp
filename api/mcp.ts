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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return MCP server info without SSE (Vercel doesn't support long-running connections)
    res.status(200).json({
      protocol: 'mcp',
      version: '2024-11-05',
      name: 'dice-roller',
      description: 'Dice Rolling MCP Server',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      transport: 'http',
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const { method, params, id } = req.body;
      
      // Log the request for debugging
      console.log('MCP Request:', { method, params, id, timestamp: new Date().toISOString() });

      // Handle MCP initialize
      if (method === 'initialize') {
        console.log('Initialize request - responding with capabilities');
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: true,
                list: [
                  {
                    name: 'dice_roll',
                    description: 'Roll dice using standard notation',
                    input_schema: {
                      type: 'object',
                      properties: {
                        notation: { type: 'string', description: 'Dice notation like "3d6+2"' },
                        label: { type: 'string', description: 'Optional label' },
                        verbose: { type: 'boolean', description: 'Show detailed breakdown' }
                      },
                      required: ['notation']
                    }
                  },
                  {
                    name: 'dice_validate',
                    description: 'Validate dice notation without rolling',
                    input_schema: {
                      type: 'object',
                      properties: {
                        notation: { type: 'string', description: 'Dice notation to validate' }
                      },
                      required: ['notation']
                    }
                  }
                ]
              },
              resources: {},
              prompts: {}
            },
            serverInfo: {
              name: 'dice-roller',
              version: '1.0.0'
            }
          }
        };
        console.log('MCP Initialize Response:', JSON.stringify(response, null, 2));
        res.status(200).json(response);
        return;
      }

      // Handle notifications/initialized
      if (method === 'notifications/initialized') {
        console.log('Notification: initialized received - client ready');
        res.status(200).json({
          jsonrpc: '2.0',
          result: null
        });
        return;
      }

      // Handle tools/list
      if (method === 'tools/list') {
        console.log('Tools/list called - returning tools definitions');
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'dice_roll',
                description: 'Roll dice using standard notation. Supports standard dice (3d6+2), advantage/disadvantage (2d20kh1), keep/drop (4d6kh3), exploding dice (3d6!), rerolls (4d6r1), and success counting (5d10>7).',
                input_schema: {
                  type: 'object',
                  properties: {
                    notation: { 
                      type: 'string', 
                      description: 'Dice notation string. Examples: "3d6+2" (standard roll), "2d20kh1" (advantage), "4d6dl1" (drop lowest), "3d6!" (exploding), "4d6r1" (reroll 1s), "5d10>7" (count successes)' 
                    },
                    label: { 
                      type: 'string', 
                      description: 'Optional descriptive label for the roll (e.g., "Attack roll", "Damage roll", "Saving throw")' 
                    },
                    verbose: { 
                      type: 'boolean', 
                      description: 'When true, shows detailed breakdown of individual dice results and calculations' 
                    },
                  },
                  required: ['notation'],
                  additionalProperties: false,
                },
              },
              {
                name: 'dice_validate',
                description: 'Validate dice notation syntax without performing the roll. Useful for checking if notation is correct before rolling.',
                input_schema: {
                  type: 'object',
                  properties: {
                    notation: { 
                      type: 'string', 
                      description: 'Dice notation string to validate. Examples: "3d6+2", "2d20kh1", "4d6dl1"' 
                    },
                  },
                  required: ['notation'],
                  additionalProperties: false,
                },
              },
            ],
          },
        });
        return;
      }

      // Handle tools/call
      if (method === 'tools/call') {
        console.log('Tools/call requested:', { name: params.name, args: params.arguments });
        const { name, arguments: args } = params;
        
        // Handle both 'dice_roll' and 'dice-roller:dice_roll' formats
        const toolName = name.includes(':') ? name.split(':')[1] : name;

        if (toolName === 'dice_roll') {
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

        if (toolName === 'dice_validate') {
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
            message: `Unknown tool: ${name} (parsed as: ${toolName})`,
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