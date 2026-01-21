import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import { DiceNotationParser } from '../../src/parser/dice-notation-parser';
import { DiceRoller } from '../../src/roller/dice-roller';
import { searchContent, fetchContent } from '../../src/shared/search-content';
import {
  DiceRollStructuredContent,
  DiceValidationStructuredContent,
  SearchResultStructuredContent,
  FetchContentStructuredContent,
} from '../../src/types';

// Initialize parser and roller
const parser = new DiceNotationParser();
const roller = new DiceRoller();

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

        const results = searchContent(query);
        const jsonResults = JSON.stringify({ results });

        const structuredContent: SearchResultStructuredContent = {
          query,
          results: results.map((r, index) => ({
            id: r.id,
            title: r.title,
            snippet: r.url,
            relevance: 1.0 - index * 0.1,
          })),
          totalResults: results.length,
        };

        return {
          content: [{ type: 'text', text: jsonResults }],
          structuredContent,
        };
      }
    );

    // Fetch tool for retrieving detailed content
    server.tool(
      'fetch',
      'Retrieve detailed content for a specific dice rolling topic by ID',
      {
        id: z
          .string()
          .describe(
            'ID of the dice rolling topic to fetch (from search results)'
          ),
      },
      async ({ id }) => {
        if (!id?.trim()) {
          throw new Error('ID is required for fetch');
        }

        const document = fetchContent(id);
        const jsonDocument = JSON.stringify(document);

        const structuredContent: FetchContentStructuredContent = {
          id: document.id,
          title: document.title,
          content: document.text,
          metadata: {
            category: document.metadata.category,
            tags: [document.metadata.type, document.metadata.source],
            lastUpdated: new Date().toISOString(),
          },
        };

        return {
          content: [{ type: 'text', text: jsonDocument }],
          structuredContent,
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
          const expression = parser.parse(notation);
          const result = roller.roll(notation, expression);
          result.label = label;

          let text = `You rolled ${notation}`;
          if (label) text += ` for ${label}`;
          text += `:\n🎲 Total: ${result.total}`;

          // Check for critical success/fail on single d20 results
          let critical: DiceRollStructuredContent['critical'] = undefined;
          const effectiveRolls = result.rolls.filter(
            roll => !roll.dropped && roll.size === 20
          );
          if (effectiveRolls.length === 1) {
            const d20Roll = effectiveRolls[0];
            if (d20Roll.result === 20) {
              text += `\n✨ Natural 20 - Critical Success!`;
              critical = { type: 'success', naturalRoll: 20 };
            } else if (d20Roll.result === 1) {
              text += `\n💥 Natural 1 - Critical Fail!`;
              critical = { type: 'fail', naturalRoll: 1 };
            }
          }

          if (verbose) {
            text += `\n📊 Breakdown: ${result.breakdown}`;
          }

          // Build structured content
          const structuredContent: DiceRollStructuredContent = {
            notation: result.notation,
            label: result.label,
            total: result.total,
            rolls: result.rolls,
            timestamp: result.timestamp,
            breakdown: result.breakdown,
            critical,
            modifier:
              expression.modifier !== 0 ? expression.modifier : undefined,
          };

          return {
            content: [{ type: 'text', text }],
            structuredContent,
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
          const expression = parser.parse(notation);
          let text = `✅ Valid dice notation: ${notation}`;

          // Build structured breakdown
          const breakdown = {
            dice: expression.dice.map(die => {
              const modifiers: string[] = [];
              if (die.keep) {
                modifiers.push(
                  `keep ${die.keep.type === 'h' ? 'highest' : 'lowest'} ${die.keep.count}`
                );
              }
              if (die.drop) {
                modifiers.push(
                  `drop ${die.drop.type === 'h' ? 'highest' : 'lowest'} ${die.drop.count}`
                );
              }
              if (die.reroll) {
                modifiers.push(`reroll ${die.reroll.join(', ')}`);
              }
              if (die.explode) {
                modifiers.push('exploding');
              }
              if (die.success) {
                modifiers.push(`success on ${die.success}+`);
              }
              return {
                count: Math.abs(die.count),
                size: die.size,
                modifiers,
              };
            }),
            modifier: expression.modifier,
          };

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

          const structuredContent: DiceValidationStructuredContent = {
            notation,
            valid: true,
            expression,
            breakdown,
          };

          return {
            content: [{ type: 'text', text }],
            structuredContent,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown parsing error';
          const structuredContent: DiceValidationStructuredContent = {
            notation,
            valid: false,
            error: errorMessage,
          };

          return {
            content: [
              {
                type: 'text',
                text: `❌ Invalid dice notation: ${notation}\n\nError: ${errorMessage}`,
              },
            ],
            structuredContent,
          };
        }
      }
    );

    // Add resources for documentation
    server.resource(
      'dice-notation-guide',
      'dice://guide/notation',
      async uri => {
        return {
          contents: [
            {
              uri: uri.href,
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
      }
    );

    server.resource(
      'dice-quick-reference',
      'dice://guide/quick-reference',
      async uri => {
        return {
          contents: [
            {
              uri: uri.href,
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
      }
    );

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
      tools: {},
      resources: {},
      prompts: {},
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
