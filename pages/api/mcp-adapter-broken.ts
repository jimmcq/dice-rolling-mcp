import { createMcpHandler } from '@vercel/mcp-adapter';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { DiceNotationParser } from '../../src/parser/dice-notation-parser';
import { DiceRoller } from '../../src/roller/dice-roller';
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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('Tools/list called via MCP adapter');
  return {
    tools: [
      {
        name: 'dice_roll',
        description: 'Roll dice using standard notation. Supports standard dice (3d6+2), advantage/disadvantage (2d20kh1), keep/drop (4d6kh3), exploding dice (3d6!), rerolls (4d6r1), and success counting (5d10>7).',
        input_schema: {
          type: 'object',
          properties: {
            notation: { type: 'string', description: 'Dice notation like "3d6+2", "2d20kh1", "4d6dl1", etc.' },
            label: { type: 'string', description: 'Optional label for the roll' },
            verbose: { type: 'boolean', description: 'Show detailed breakdown' },
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
            notation: { type: 'string', description: 'Dice notation to validate' },
          },
          required: ['notation'],
        },
      },
    ],
  };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log('Tool call via MCP adapter:', request.params.name);
  const toolName = request.params.name.includes(':') ? request.params.name.split(':')[1] : request.params.name;
  
  if (toolName === 'dice_roll') {
    const { notation, label, verbose } = request.params.arguments as z.infer<typeof diceRollInputSchema>;
    const expression = parser.parse(notation);
    const result = roller.roll(expression);

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

  if (toolName === 'dice_validate') {
    const { notation } = request.params.arguments as { notation: string };
    
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

// Add handlers for optional MCP methods
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [],
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [],
}));

export default createMcpHandler(server);