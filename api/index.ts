import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { DiceNotationParser } from '../dist/parser/dice-notation-parser.js';
import { DiceRoller } from '../dist/roller/dice-roller.js';
import { z } from 'zod';

const diceRollInputSchema = z.object({
  notation: z.string().describe('e.g., "3d6+2"'),
  label: z.string().optional().describe('e.g., "Damage roll"'),
  verbose: z.boolean().optional().describe('Show detailed breakdown'),
});

const server = new Server({
  name: 'dice-roller',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

const parser = new DiceNotationParser();
const roller = new DiceRoller();

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
}));

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'dice_roll') {
    const { notation, label, verbose } = request.params.arguments as z.infer<typeof diceRollInputSchema>;
    const expression = parser.parse(notation);
    const result = roller.roll(expression);
    result.notation = notation;
    result.label = label;

    let text = `You rolled ${notation}`;
    if (label) text += ` for ${label}`;
    text += `:\n🎲 Total: ${result.total}`;
    if (verbose) {
      text += `\n📊 Breakdown: ${result.breakdown}`;
    }

    return {
      content: [{ type: 'text', text }],
    };
  }

  if (request.params.name === 'dice_validate') {
    const { notation } = request.params.arguments as { notation: string };
    
    try {
      const expression = parser.parse(notation);
      let text = `✅ Valid dice notation: ${notation}`;
      
      // Provide breakdown of what the notation means
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

      return {
        content: [{ type: 'text', text }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}` }],
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Add handlers for optional MCP methods to avoid "Method not found" errors
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [],
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [],
}));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET' && req.url === '/') {
    // Health check endpoint
    res.status(200).json({ 
      name: 'dice-roller', 
      version: '1.0.0',
      status: 'healthy',
      tools: ['dice_roll', 'dice_validate']
    });
    return;
  }

  // Handle MCP requests via SSE
  const transport = new SSEServerTransport('/message', res);
  server.connect(transport);
}