import { createMcpHandler } from '@vercel/mcp-adapter';
import { DiceNotationParser } from '../../src/parser/dice-notation-parser';
import { DiceRoller } from '../../src/roller/dice-roller';
import { z } from 'zod';

const diceRollInputSchema = z.object({
  notation: z.string().describe('e.g., "3d6+2"'),
  label: z.string().optional().describe('e.g., "Damage roll"'),
  verbose: z.boolean().optional().describe('Show detailed breakdown'),
});

const parser = new DiceNotationParser();
const roller = new DiceRoller();

export default createMcpHandler({
  name: 'dice-roller',
  version: '1.0.0',
  tools: {
    dice_roll: {
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
      async handler(params) {
        const { notation, label, verbose } = diceRollInputSchema.parse(params);
        const expression = parser.parse(notation);
        const result = roller.roll(expression);

        let text = `You rolled ${notation}`;
        if (label) text += ` for ${label}`;
        text += `:\n🎲 Total: ${result.total}`;
        if (verbose) {
          text += `\n📊 Breakdown: ${result.breakdown}`;
        }

        return { content: [{ type: 'text', text }] };
      },
    },
    dice_validate: {
      description: 'Validate dice notation without rolling',
      input_schema: {
        type: 'object',
        properties: {
          notation: { type: 'string', description: 'Dice notation to validate' },
        },
        required: ['notation'],
      },
      async handler(params) {
        const { notation } = params as { notation: string };
        
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

          return { content: [{ type: 'text', text }] };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}` }],
          };
        }
      },
    },
  },
  resources: {},
  prompts: {},
});