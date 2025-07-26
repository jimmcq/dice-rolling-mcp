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

          // Check for critical success/fail on single d20 results
          const diceMatch = notation.match(/^(\d+)d(\d+|%|F)/i);
          if (result.rolls.length === 1 && diceMatch && diceMatch[2] === '20') {
            const roll = result.rolls[0];
            if (roll === 20) {
              text += `\n✨ Natural 20 - Critical Success!`;
            } else if (roll === 1) {
              text += `\n💥 Natural 1 - Critical Fail!`;
            }
          }

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

    // Add resources for documentation
    server.resource('dice://guide/notation', async () => {
      return {
        contents: [
          {
            uri: 'dice://guide/notation',
            mimeType: 'text/markdown',
            text: `# Dice Notation Guide

## Basic Format
**XdY** - Roll X dice with Y sides

## Essential Examples
- \`1d20+5\` - Single d20 with +5 modifier
- \`3d6\` - Three d6 dice
- \`2d20kh1\` - **Advantage** (roll 2d20, keep highest)
- \`2d20kl1\` - **Disadvantage** (roll 2d20, keep lowest)

## Advanced Mechanics
- \`4d6kh3\` - Roll 4d6, keep best 3 (character stats)
- \`3d6!\` - Exploding dice (reroll max values)
- \`4d6r1\` - Reroll 1s
- \`5d10>7\` - Count successes (7+)

## Special Dice
- \`4dF\` - Fudge dice (-1, 0, +1)
- \`1d%\` - Percentile (1-100)

**Important**: For D&D 5e advantage, use \`2d20kh1\` NOT \`2d20\`!`,
          },
        ],
      };
    });

    server.resource('dice://guide/quick-reference', async () => {
      return {
        contents: [
          {
            uri: 'dice://guide/quick-reference',
            mimeType: 'text/markdown',
            text: `# Quick Reference

## D&D 5e Essentials
- \`2d20kh1\` - Advantage
- \`2d20kl1\` - Disadvantage
- \`4d6kh3\` - Stat generation
- \`8d6\` - Fireball damage

## Common Rolls
- \`1d20+5\` - Attack/check with +5
- \`2d6+3\` - Damage with +3
- \`1d4+1\` - Magic Missile
- \`1d%\` - Percentile roll`,
          },
        ],
      };
    });

    // Add prompts for help
    server.prompt('help', async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Dice Notation Quick Help

**Basic Format**: XdY (X dice, Y sides) + optional modifier

**Essential Examples**:
- \`1d20+5\` - Single d20 with +5 modifier
- \`3d6\` - Three d6 dice
- \`2d20kh1\` - **Advantage** (roll 2d20, keep highest)
- \`2d20kl1\` - **Disadvantage** (roll 2d20, keep lowest)

**Advanced**:
- \`4d6kh3\` - Roll 4d6, keep best 3
- \`3d6!\` - Exploding 6s
- \`4d6r1\` - Reroll 1s
- \`5d10>7\` - Count successes (7+)

💡 **Use \`dice_validate\` tool to check any notation before rolling!**`,
          },
        },
      ],
    }));

    server.prompt('examples', async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Common Gaming Examples

**D&D 5e Combat**:
- Attack (normal): \`1d20+7\`
- Attack (advantage): \`2d20kh1+7\`
- Damage: \`1d8+4\` or \`2d6+3\`
- Fireball: \`8d6\`

**Character Creation**:
- Ability scores: \`4d6kh3\` (repeat 6 times)
- HP level up: \`1d8\`

**Other Systems**:
- Fate/Fudge: \`4dF\`
- Percentile: \`1d%\``,
          },
        },
      ],
    }));
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
      resources: {
        'dice://guide/notation': {
          name: 'Dice Notation Guide',
          description:
            'Comprehensive guide to dice notation including advantage, exploding dice, and complex mechanics',
          mimeType: 'text/markdown',
        },
        'dice://guide/quick-reference': {
          name: 'Quick Reference',
          description:
            'Quick reference for common dice patterns and D&D 5e notation',
          mimeType: 'text/markdown',
        },
      },
      prompts: {
        help: {
          description: 'Show dice notation help and common examples',
        },
        examples: {
          description: 'Show common gaming examples (D&D, skill checks, etc.)',
        },
      },
    },
  },
  {
    basePath: '',
    verboseLogs: true,
    maxDuration: 60,
    home: {
      title: 'Advanced Dice Rolling MCP Server',
      description:
        'True randomness for AI assistants with comprehensive gaming mechanics',
    },
  }
);

export { handler as GET, handler as POST, handler as DELETE };
