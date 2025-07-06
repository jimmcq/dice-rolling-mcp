import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';

// Simple dice rolling function based on the original local MCP logic
function rollDice(notation: string) {
  const match = notation.match(
    /^(\d+)d(\d+|%|F)(?:(kh|kl|dh|dl)(\d+))?(?:(r)(\d+))?([!])?([>](\d+))?([+-]\d+)?$/i
  );

  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const [
    ,
    countStr,
    sizeStr,
    keepDropType,
    keepDropNum,
    rerollType,
    rerollValue,
    explode,
    successType,
    successValue,
    modifier,
  ] = match;
  const count = parseInt(countStr);
  let size: number;

  if (sizeStr === '%') size = 100;
  else if (sizeStr === 'F') size = 3;
  else size = parseInt(sizeStr);

  if (count > 100 || size > 1000) {
    throw new Error('Dice limits exceeded (max 100 dice, max 1000 sides)');
  }

  const rolls: number[] = [];

  // Roll initial dice
  for (let i = 0; i < count; i++) {
    let roll: number;
    if (sizeStr === 'F') {
      // Fudge dice: -1, 0, +1
      roll = Math.floor(Math.random() * 3) - 1;
    } else {
      roll = Math.floor(Math.random() * size) + 1;
    }

    // Handle rerolls
    if (rerollType && rerollValue && roll === parseInt(rerollValue)) {
      roll = Math.floor(Math.random() * size) + 1;
    }

    rolls.push(roll);

    // Handle exploding dice
    if (explode && roll === size) {
      let explodedRoll: number;
      do {
        explodedRoll = Math.floor(Math.random() * size) + 1;
        rolls.push(explodedRoll);
      } while (explodedRoll === size);
    }
  }

  let finalRolls = [...rolls];
  let breakdown = `${count}d${sizeStr}:[${rolls.join(',')}]`;

  // Handle keep/drop mechanics
  if (keepDropType && keepDropNum) {
    const num = parseInt(keepDropNum);
    const sorted = [...rolls].sort((a, b) => b - a);

    if (keepDropType.toLowerCase() === 'kh') {
      finalRolls = sorted.slice(0, num);
      breakdown += ` keep highest ${num}`;
    } else if (keepDropType.toLowerCase() === 'kl') {
      finalRolls = sorted.slice(-num);
      breakdown += ` keep lowest ${num}`;
    } else if (keepDropType.toLowerCase() === 'dh') {
      finalRolls = sorted.slice(num);
      breakdown += ` drop highest ${num}`;
    } else if (keepDropType.toLowerCase() === 'dl') {
      finalRolls = sorted.slice(0, -num);
      breakdown += ` drop lowest ${num}`;
    }
  }

  let total: number;

  // Handle success counting
  if (successType && successValue) {
    const threshold = parseInt(successValue);
    total = finalRolls.filter(roll => roll >= threshold).length;
    breakdown += ` (successes >= ${threshold})`;
  } else {
    total = finalRolls.reduce((sum, roll) => sum + roll, 0);
  }

  // Apply modifier
  if (modifier) {
    const modAmount = parseInt(modifier);
    total += modAmount;
    breakdown += ` ${modifier}`;
  }

  return { total, breakdown, rolls: finalRolls };
}

const handler = createMcpHandler(
  async server => {
    // Advanced dice roll tool
    server.tool(
      'dice_roll',
      "Roll dice using standard notation. IMPORTANT: For D&D advantage use '2d20kh1' (NOT '2d20')",
      {
        notation: z
          .string()
          .describe(
            'Dice notation. Examples: "1d20+5" (basic), "2d20kh1" (advantage), "2d20kl1" (disadvantage), "4d6kh3" (stats), "3d6!" (exploding), "4d6r1" (reroll 1s), "5d10>7" (successes)'
          ),
        label: z
          .string()
          .optional()
          .describe('Optional label e.g., "Attack roll", "Fireball damage"'),
        verbose: z
          .boolean()
          .optional()
          .describe('Show detailed breakdown of individual dice results'),
      },
      async ({ notation, label, verbose }) => {
        try {
          const result = rollDice(notation);

          let text = `You rolled ${notation}`;
          if (label) text += ` for ${label}`;
          text += `:\n🎲 Total: ${result.total}`;
          if (verbose) {
            text += `\n📊 Breakdown: ${result.breakdown}`;
          }

          return {
            content: [{ type: 'text', text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      }
    );

    // Dice validation tool
    server.tool(
      'dice_validate',
      'Validate and explain dice notation without rolling',
      {
        notation: z
          .string()
          .describe(
            'Dice notation to validate and explain. Examples: "2d20kh1+5", "4d6kh3", "8d6", "1d%"'
          ),
      },
      async ({ notation }) => {
        try {
          // Just try to parse it to validate
          rollDice(notation);

          let text = `✅ Valid dice notation: ${notation}`;

          // Provide basic explanation
          const match = notation.match(
            /^(\d+)d(\d+|%|F)(?:(kh|kl|dh|dl)(\d+))?(?:(r)(\d+))?([!])?([>](\d+))?([+-]\d+)?$/i
          );
          if (match) {
            const [
              ,
              countStr,
              sizeStr,
              keepDropType,
              keepDropNum,
              rerollType,
              rerollValue,
              explode,
              successType,
              successValue,
              modifier,
            ] = match;

            text += '\n\nBreakdown:';
            text += `\n• ${countStr}d${sizeStr} - Roll ${countStr} ${sizeStr}-sided dice`;

            if (keepDropType && keepDropNum) {
              const action = keepDropType.toLowerCase().startsWith('k')
                ? 'keep'
                : 'drop';
              const highLow = keepDropType.toLowerCase().endsWith('h')
                ? 'highest'
                : 'lowest';
              text += `\n• ${keepDropType.toLowerCase()} - ${action} ${highLow} ${keepDropNum}`;
            }

            if (rerollType && rerollValue) {
              text += `\n• r${rerollValue} - reroll ${rerollValue}s`;
            }

            if (explode) {
              text += `\n• ! - exploding dice (reroll max values)`;
            }

            if (successType && successValue) {
              text += `\n• >${successValue} - count successes (${successValue}+)`;
            }

            if (modifier) {
              text += `\n• ${modifier} - modifier`;
            }
          }

          return {
            content: [{ type: 'text', text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Invalid dice notation: ${notation}\n\nError: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
              },
            ],
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        dice_roll: {
          description:
            "Roll dice using standard notation. IMPORTANT: For D&D advantage use '2d20kh1' (NOT '2d20')",
        },
        dice_validate: {
          description: 'Validate and explain dice notation without rolling',
        },
      },
    },
  },
  {
    basePath: '',
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
