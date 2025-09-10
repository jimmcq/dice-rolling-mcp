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
    // Search tool for discovering available operations
    server.tool(
      'search',
      'Search dice rolling documentation, guides, and examples',
      {
        query: z
          .string()
          .describe(
            'Search query to find relevant dice rolling information, examples, or notation help'
          ),
      },
      async ({ query }) => {
        if (!query?.trim()) {
          throw new Error('Search query is required');
        }

        const searchTerm = query.toLowerCase().trim();

        // Define searchable content for dice rolling
        const searchableContent = [
          {
            id: 'basic-notation',
            title: 'Basic Dice Notation',
            url: 'dice://guide/notation#basic',
            content:
              'basic dice notation XdY format standard rolling examples 1d20 3d6 2d8',
            description:
              'Learn basic dice notation like 1d20, 3d6, and standard rolling formats',
          },
          {
            id: 'advantage-disadvantage',
            title: 'D&D Advantage and Disadvantage',
            url: 'dice://guide/notation#advantage',
            content:
              'advantage disadvantage dnd 2d20kh1 2d20kl1 keep highest lowest',
            description:
              'D&D 5e advantage (2d20kh1) and disadvantage (2d20kl1) mechanics',
          },
          {
            id: 'modifiers',
            title: 'Dice Modifiers and Bonuses',
            url: 'dice://guide/notation#modifiers',
            content:
              'modifiers bonus penalty +5 -2 1d20+7 3d6+2 adding numbers',
            description:
              'How to add modifiers and bonuses to dice rolls like 1d20+5',
          },
          {
            id: 'ability-scores',
            title: 'Character Ability Scores',
            url: 'dice://guide/notation#ability',
            content:
              'ability scores character creation 4d6kh3 4d6dl1 stats generation',
            description:
              'Rolling ability scores with 4d6kh3 (keep highest 3 of 4 dice)',
          },
          {
            id: 'exploding-dice',
            title: 'Exploding Dice',
            url: 'dice://guide/notation#exploding',
            content:
              'exploding dice 3d6! reroll maximum ace penetrating open ended',
            description:
              'Exploding dice notation (3d6!) where max rolls trigger additional dice',
          },
          {
            id: 'rerolling',
            title: 'Rerolling Dice',
            url: 'dice://guide/notation#reroll',
            content: 'reroll rerolling 4d6r1 reroll ones bad results once',
            description:
              'Rerolling specific values like 4d6r1 (reroll any 1s once)',
          },
          {
            id: 'percentile-dice',
            title: 'Percentile Dice',
            url: 'dice://guide/notation#percentile',
            content: 'percentile dice 1d% d100 1-100 percentage rolls',
            description: 'Percentile dice (1d% or d100) for rolling 1-100',
          },
          {
            id: 'fudge-dice',
            title: 'Fudge Dice',
            url: 'dice://guide/notation#fudge',
            content: 'fudge dice 4dF fate dice -1 0 +1 ladder',
            description: 'Fudge/Fate dice (4dF) with results of -1, 0, or +1',
          },
          {
            id: 'success-counting',
            title: 'Success Counting',
            url: 'dice://guide/notation#success',
            content:
              'success counting 5d10>7 threshold target number successes',
            description: 'Count successes above a threshold like 5d10>7',
          },
          {
            id: 'combat-examples',
            title: 'Combat Roll Examples',
            url: 'dice://examples/combat',
            content:
              'combat attack damage critical hit weapon spell fireball 8d6 2d8+4',
            description:
              'Common combat rolls: attacks, damage, critical hits, spells',
          },
          {
            id: 'spell-damage',
            title: 'Spell Damage Examples',
            url: 'dice://examples/spells',
            content:
              'spell damage fireball 8d6 magic missile 1d4+1 healing 2d4+2',
            description:
              'Spell damage patterns like Fireball (8d6) and Magic Missile (1d4+1)',
          },
          {
            id: 'skill-checks',
            title: 'Skill Check Examples',
            url: 'dice://examples/skills',
            content:
              'skill check ability check 1d20+modifier proficiency bonus guidance',
            description: 'Skill and ability checks with modifiers and bonuses',
          },
        ];

        // Filter content based on search query
        const matchingContent = searchableContent.filter(
          item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.content.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );

        // Format results according to MCP specification
        const results = matchingContent.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
        }));

        // Return JSON-encoded string as required by MCP spec
        const jsonResults = JSON.stringify({ results });

        return {
          content: [{ type: 'text', text: jsonResults }],
        };
      }
    );

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
        search: {
          description:
            'Search dice rolling documentation, guides, and examples',
        },
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
