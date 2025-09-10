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
        content: 'basic dice notation XdY format standard rolling examples 1d20 3d6 2d8',
        description: 'Learn basic dice notation like 1d20, 3d6, and standard rolling formats'
      },
      {
        id: 'advantage-disadvantage',
        title: 'D&D Advantage and Disadvantage',
        url: 'dice://guide/notation#advantage',
        content: 'advantage disadvantage dnd 2d20kh1 2d20kl1 keep highest lowest',
        description: 'D&D 5e advantage (2d20kh1) and disadvantage (2d20kl1) mechanics'
      },
      {
        id: 'modifiers',
        title: 'Dice Modifiers and Bonuses',
        url: 'dice://guide/notation#modifiers',
        content: 'modifiers bonus penalty +5 -2 1d20+7 3d6+2 adding numbers',
        description: 'How to add modifiers and bonuses to dice rolls like 1d20+5'
      },
      {
        id: 'ability-scores',
        title: 'Character Ability Scores',
        url: 'dice://guide/notation#ability',
        content: 'ability scores character creation 4d6kh3 4d6dl1 stats generation',
        description: 'Rolling ability scores with 4d6kh3 (keep highest 3 of 4 dice)'
      },
      {
        id: 'exploding-dice',
        title: 'Exploding Dice',
        url: 'dice://guide/notation#exploding',
        content: 'exploding dice 3d6! reroll maximum ace penetrating open ended',
        description: 'Exploding dice notation (3d6!) where max rolls trigger additional dice'
      },
      {
        id: 'rerolling',
        title: 'Rerolling Dice',
        url: 'dice://guide/notation#reroll',
        content: 'reroll rerolling 4d6r1 reroll ones bad results once',
        description: 'Rerolling specific values like 4d6r1 (reroll any 1s once)'
      },
      {
        id: 'percentile-dice',
        title: 'Percentile Dice',
        url: 'dice://guide/notation#percentile',
        content: 'percentile dice 1d% d100 1-100 percentage rolls',
        description: 'Percentile dice (1d% or d100) for rolling 1-100'
      },
      {
        id: 'fudge-dice',
        title: 'Fudge Dice',
        url: 'dice://guide/notation#fudge',
        content: 'fudge dice 4dF fate dice -1 0 +1 ladder',
        description: 'Fudge/Fate dice (4dF) with results of -1, 0, or +1'
      },
      {
        id: 'success-counting',
        title: 'Success Counting',
        url: 'dice://guide/notation#success',
        content: 'success counting 5d10>7 threshold target number successes',
        description: 'Count successes above a threshold like 5d10>7'
      },
      {
        id: 'combat-examples',
        title: 'Combat Roll Examples',
        url: 'dice://examples/combat',
        content: 'combat attack damage critical hit weapon spell fireball 8d6 2d8+4',
        description: 'Common combat rolls: attacks, damage, critical hits, spells'
      },
      {
        id: 'spell-damage',
        title: 'Spell Damage Examples',
        url: 'dice://examples/spells',
        content: 'spell damage fireball 8d6 magic missile 1d4+1 healing 2d4+2',
        description: 'Spell damage patterns like Fireball (8d6) and Magic Missile (1d4+1)'
      },
      {
        id: 'skill-checks',
        title: 'Skill Check Examples',
        url: 'dice://examples/skills',
        content: 'skill check ability check 1d20+modifier proficiency bonus guidance',
        description: 'Skill and ability checks with modifiers and bonuses'
      }
    ];

    // Filter content based on search query
    const matchingContent = searchableContent.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm)
    );

    // Format results according to MCP specification
    const results = matchingContent.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url
    }));

    // Return JSON-encoded string as required by MCP spec
    const jsonResults = JSON.stringify({ results });

    return {
      content: [{ type: 'text', text: jsonResults }],
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
    const effectiveRolls = result.rolls.filter(roll => !roll.dropped && roll.size === 20);
    if (effectiveRolls.length === 1) {
      const d20Roll = effectiveRolls[0];
      const finalResult = d20Roll.modified !== undefined ? d20Roll.modified : d20Roll.result;
      if (d20Roll.result === 20) {
        text += `\n✨ Natural 20 - Critical Success!`;
      } else if (d20Roll.result === 1) {
        text += `\n💥 Natural 1 - Critical Fail!`;
      }
    }
    
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