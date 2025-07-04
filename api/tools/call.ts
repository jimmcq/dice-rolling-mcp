import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DiceNotationParser } from '../../../src/parser/dice-notation-parser.js';
import { DiceRoller } from '../../../src/roller/dice-roller.js';
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { name, arguments: args } = req.body;

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
          content: [{ type: 'text', text }],
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
            content: [{ type: 'text', text }],
          });
          return;
        } catch (error) {
          res.status(200).json({
            content: [{ 
              type: 'text', 
              text: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}` 
            }],
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