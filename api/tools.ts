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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return tool definitions for Claude.ai web interface
    res.status(200).json({
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
      version: '1.0.0',
      server_info: {
        name: 'dice-roller',
        description: 'Comprehensive dice rolling server with advanced gaming mechanics',
        version: '1.0.0'
      }
    });
    return;
  }

  if (req.method === 'POST') {
    try {
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
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}