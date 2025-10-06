#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { DiceNotationParser } from './parser/dice-notation-parser.js';
import { DiceRoller } from './roller/dice-roller.js';
import { searchContent, fetchContent } from './shared/search-content.js';
import {
  DiceRollStructuredContent,
  DiceValidationStructuredContent,
  SearchResultStructuredContent,
  FetchContentStructuredContent
} from './types.js';
import { z } from 'zod';

const diceRollInputSchema = z.object({
  notation: z.string().describe('e.g., "3d6+2"'),
  label: z.string().optional().describe('e.g., "Damage roll"'),
  verbose: z.boolean().optional().describe('Show detailed breakdown'),
});

export const server = new Server({
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
      name: 'search',
      description: 'Search dice rolling documentation, guides, and examples',
      inputSchema: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'Search query to find relevant dice rolling information, examples, or notation help' 
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'fetch',
      description: 'Retrieve detailed content for a specific dice rolling topic by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'ID of the dice rolling topic to fetch (from search results)' 
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'dice_roll',
      description: 'Roll dice using standard notation. IMPORTANT: For D&D advantage use "2d20kh1" (NOT "2d20")',
      inputSchema: {
        type: 'object',
        properties: {
          notation: { 
            type: 'string', 
            description: 'Dice notation. Examples: "1d20+5" (basic), "2d20kh1" (advantage), "2d20kl1" (disadvantage), "4d6kh3" (stats), "3d6!" (exploding)' 
          },
          label: { type: 'string', description: 'Optional label e.g., "Attack roll", "Fireball damage"' },
          verbose: { type: 'boolean', description: 'Show detailed breakdown of individual dice results' },
        },
        required: ['notation'],
      },
    },
    {
      name: 'dice_validate',
      description: 'Validate and explain dice notation without rolling. Use this to understand what notation means before rolling',
      inputSchema: {
        type: 'object',
        properties: {
          notation: { 
            type: 'string', 
            description: 'Dice notation to validate and explain. Examples: "2d20kh1+5", "4d6kh3", "8d6", "1d%"' 
          },
        },
        required: ['notation'],
      },
    },
  ],
}));

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'search') {
    const args = request.params.arguments as { query: string } | undefined;
    const { query } = args || { query: '' };

    const results = searchContent(query);
    const jsonResults = JSON.stringify({ results });

    const structuredContent: SearchResultStructuredContent = {
      query,
      results: results.map((r, index) => ({
        id: r.id,
        title: r.title,
        snippet: r.url,
        relevance: 1.0 - index * 0.1, // Simple relevance scoring
      })),
      totalResults: results.length,
    };

    return {
      content: [{ type: 'text', text: jsonResults }],
      structuredContent,
    };
  }

  if (request.params.name === 'fetch') {
    const args = request.params.arguments as { id: string } | undefined;
    const { id } = args || { id: '' };

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

  if (request.params.name === 'dice_roll') {
    const { notation, label, verbose } = request.params.arguments as z.infer<typeof diceRollInputSchema>;
    const expression = parser.parse(notation);
    const result = roller.roll(notation, expression);
    result.label = label;

    let text = `You rolled ${notation}`;
    if (label) text += ` for ${label}`;
    text += `:\n🎲 Total: ${result.total}`;

    // Check for critical success/fail on single d20 results
    let critical: DiceRollStructuredContent['critical'] = undefined;
    const effectiveRolls = result.rolls.filter(roll => !roll.dropped && roll.size === 20);
    if (effectiveRolls.length === 1) {
      const d20Roll = effectiveRolls[0];
      const finalResult = d20Roll.modified !== undefined ? d20Roll.modified : d20Roll.result;
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
      modifier: expression.modifier !== 0 ? expression.modifier : undefined,
    };

    return {
      content: [{ type: 'text', text }],
      structuredContent,
    };
  }

  if (request.params.name === 'dice_validate') {
    const { notation } = request.params.arguments as { notation: string };

    try {
      const expression = parser.parse(notation);
      let text = `✅ Valid dice notation: ${notation}`;

      // Build structured breakdown
      const breakdown = {
        dice: expression.dice.map(die => {
          const modifiers: string[] = [];
          if (die.keep) {
            modifiers.push(`keep ${die.keep.type === 'h' ? 'highest' : 'lowest'} ${die.keep.count}`);
          }
          if (die.drop) {
            modifiers.push(`drop ${die.drop.type === 'h' ? 'highest' : 'lowest'} ${die.drop.count}`);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      const structuredContent: DiceValidationStructuredContent = {
        notation,
        valid: false,
        error: errorMessage,
      };

      return {
        content: [{ type: 'text', text: `❌ Invalid dice notation: ${notation}\n\nError: ${errorMessage}` }],
        structuredContent,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Add handlers for optional MCP methods to avoid "Method not found" errors
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'dice://guide/notation',
      name: 'Dice Notation Guide',
      description: 'Comprehensive guide to dice notation including advantage, exploding dice, and complex mechanics',
      mimeType: 'text/markdown',
    },
    {
      uri: 'dice://guide/quick-reference',
      name: 'Quick Reference',
      description: 'Quick reference for common dice patterns and D&D 5e notation',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'help',
      description: 'Show dice notation help and common examples',
    },
    {
      name: 'advantage',
      description: 'Show how to roll with advantage/disadvantage',
    },
    {
      name: 'examples',
      description: 'Show common gaming examples (D&D, skill checks, etc.)',
    },
  ],
}));

// Handle resource read requests
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === 'dice://guide/notation') {
    const fs = await import('fs/promises');
    const path = await import('path');
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const content = await fs.readFile(
      path.join(__dirname, 'documentation', 'dice-notation-guide.md'), 
      'utf-8'
    );
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content,
      }],
    };
  }
  
  if (uri === 'dice://guide/quick-reference') {
    const fs = await import('fs/promises');
    const path = await import('path');
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const content = await fs.readFile(
      path.join(__dirname, 'documentation', 'quick-reference.md'), 
      'utf-8'
    );
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content,
      }],
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;
  
  if (name === 'help') {
    return {
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

**Special Dice**:
- \`4dF\` - Fudge dice (-1, 0, +1)
- \`1d%\` - Percentile (1-100)

**Advanced**:
- \`4d6kh3\` - Roll 4d6, keep best 3
- \`3d6!\` - Exploding 6s
- \`4d6r1\` - Reroll 1s
- \`5d10>7\` - Count successes (7+)

💡 **Use \`dice_validate\` tool to check any notation before rolling!**
📚 **Access full guide**: @dice://guide/notation`,
          },
        },
      ],
    };
  }
  
  if (name === 'advantage') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Advantage and Disadvantage

**D&D 5e Advantage/Disadvantage**:

✅ **CORRECT**:
- \`2d20kh1\` - Advantage (keep highest)  
- \`2d20kl1\` - Disadvantage (keep lowest)

❌ **WRONG**:
- \`2d20\` - This adds both dice (2-40 range, not 1-20!)

**With Modifiers**:
- \`2d20kh1+7\` - Advantage attack with +7
- \`2d20kl1+3\` - Disadvantage save with +3

**Other Keep/Drop**:
- \`4d6kh3\` - Character stats (keep best 3 of 4)
- \`4d6dl1\` - Same as above (drop lowest 1)

Remember: Advantage means you get the BETTER result, not the SUM of both dice!`,
          },
        },
      ],
    };
  }
  
  if (name === 'examples') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Common Gaming Examples

**D&D 5e Combat**:
- Attack (normal): \`1d20+7\`
- Attack (advantage): \`2d20kh1+7\`
- Attack (disadvantage): \`2d20kl1+7\`
- Damage: \`1d8+4\` or \`2d6+3\`
- Critical hit: \`2d8+4\` (double weapon dice only)

**Spell Damage**:
- Fireball: \`8d6\`
- Magic Missile: \`1d4+1\` (per missile)
- Healing Word: \`1d4+3\`

**Character Creation**:
- Ability scores: \`4d6kh3\` (repeat 6 times)
- HP at level up: \`1d8\` (or take average)

**Skill Checks**:
- Normal: \`1d20+5\`
- With advantage: \`2d20kh1+5\`
- With Guidance: \`1d20+1d4+5\`

**Other Systems**:
- Fate/Fudge: \`4dF\`
- Percentile: \`1d%\`
- Exploding damage: \`3d6!\``,
          },
        },
      ],
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
});

// Start the server if this file is run directly (local development)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  // Use stderr for logging to avoid interfering with JSON-RPC communication on stdout
  console.error('Dice Rolling MCP Server starting locally...');
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.error('Server listening on stdio.');
}