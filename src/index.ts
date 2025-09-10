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

  if (request.params.name === 'fetch') {
    const args = request.params.arguments as { id: string } | undefined;
    const { id } = args || { id: '' };
    
    if (!id?.trim()) {
      throw new Error('ID is required for fetch');
    }

    // Content library matching the search results
    const contentLibrary: Record<string, string> = {
      'basic-notation': `# Basic Dice Notation

The foundation of dice rolling is the **XdY** format:
- **X** = number of dice to roll
- **Y** = number of sides on each die

## Examples:
- \`1d20\` - Roll one 20-sided die
- \`3d6\` - Roll three 6-sided dice  
- \`2d8\` - Roll two 8-sided dice

## With Modifiers:
- \`1d20+5\` - Roll 1d20 and add 5
- \`3d6-2\` - Roll 3d6 and subtract 2

This is the standard notation used across all tabletop gaming systems.`,

      'advantage-disadvantage': `# D&D 5e Advantage and Disadvantage

**CRITICAL**: Use the correct notation for D&D 5e mechanics!

## Advantage (roll twice, take higher):
- ✅ **CORRECT**: \`2d20kh1\` (keep highest 1)
- ❌ **WRONG**: \`2d20\` (this adds both dice!)

## Disadvantage (roll twice, take lower):
- ✅ **CORRECT**: \`2d20kl1\` (keep lowest 1)

## With Modifiers:
- \`2d20kh1+7\` - Advantage attack with +7 bonus
- \`2d20kl1+3\` - Disadvantage save with +3 bonus

## Why This Matters:
Using \`2d20\` gives results from 2-40, not 1-20. Always use keep/drop mechanics for advantage!`,

      'modifiers': `# Dice Modifiers and Bonuses

Add or subtract fixed numbers from your dice results:

## Basic Modifiers:
- \`1d20+5\` - Add 5 to the roll
- \`3d6-2\` - Subtract 2 from the total
- \`2d8+3\` - Add 3 to the damage

## Multiple Dice Types:
- \`1d20+2d6+5\` - Attack roll plus damage plus modifier
- \`4d6+1d4+2\` - Complex damage calculation

## Gaming Applications:
- **Ability modifiers**: \`1d20+4\` (Strength modifier)
- **Proficiency bonus**: \`1d20+3\` (proficiency)
- **Magic bonuses**: \`1d8+1\` (magic weapon)`,

      'ability-scores': `# Character Ability Score Generation

The standard method for generating D&D character abilities:

## Method: 4d6 Drop Lowest
- **Notation**: \`4d6kh3\` or \`4d6dl1\`
- **Process**: Roll 4d6, keep the highest 3 dice
- **Range**: 3-18 (weighted toward higher scores)
- **Repeat**: 6 times for all abilities (STR, DEX, CON, INT, WIS, CHA)

## Alternative Methods:
- \`3d6\` - Classic method (3-18, evenly distributed)
- \`2d6+6\` - Heroic method (8-18, minimum 8)

## Example Results:
- \`4d6kh3\`: [6,4,3,1] → 13 (6+4+3, drop the 1)
- \`4d6kh3\`: [5,5,4,2] → 14 (5+5+4, drop the 2)`,

      'exploding-dice': `# Exploding Dice Mechanics

When you roll the maximum value, roll again and add it!

## Basic Exploding:
- **Notation**: \`3d6!\`
- **Effect**: When you roll a 6, roll another d6 and add it
- **Chain**: If the new die is also a 6, roll again!

## Examples:
- Roll \`2d6!\`: Get [6, 4] → Roll another d6 → Get [6] → Roll again → Get [3] = 19 total
- Roll \`1d10!\`: Get [10] → Roll again → Get [7] = 17 total

## Gaming Applications:
- **Damage**: Explosive weapon effects
- **Success systems**: Building massive successes
- **Savage Worlds**: Aces (exploding) on maximum rolls

## Variants:
- Some systems explode on 5-6, others only on maximum
- "Penetrating" dice subtract 1 from exploded rolls`,

      'rerolling': `# Reroll Mechanics

Sometimes you want to reroll bad results:

## Basic Rerolls:
- **Notation**: \`4d6r1\`
- **Effect**: Reroll any 1s once, take the new result
- **Limit**: Usually only reroll once to prevent infinite loops

## Common Patterns:
- \`4d6r1\` - Reroll 1s (great weapon fighting)
- \`2d20r1\` - Reroll 1s on advantage
- \`1d8r<3\` - Reroll results less than 3

## D&D 5e Examples:
- **Great Weapon Fighting**: Reroll 1s and 2s on damage dice
- **Halfling Lucky**: Reroll natural 1s
- **Elven Accuracy**: Reroll one die when you have advantage

## Strategy:
Rerolls improve average results but add complexity. Best used sparingly.`,

      'percentile-dice': `# Percentile Dice (d100)

For rolling 1-100 results:

## Notation Options:
- \`1d%\` - Standard percentile notation
- \`d100\` - Alternative notation
- Both produce results from 1-100

## Common Uses:
- **Random tables**: "Roll d100 for random encounter"
- **Percentage chances**: "30% chance of rain"
- **Critical tables**: "Roll d100 for critical hit effect"
- **Loot tables**: "Roll d100 for treasure type"

## Physical Implementation:
- Two d10s: one for tens digit, one for ones
- 00 + 0 = 100 (not 0)
- 30 + 7 = 37

## Gaming Systems:
- **Call of Cthulhu**: Skill checks vs. percentile
- **Warhammer**: Most mechanics use d100
- **D&D**: Random tables and some spells`,

      'fudge-dice': `# Fudge Dice (4dF)

Special dice for Fate/Fudge systems:

## Die Faces:
- **+1** (plus): Success/positive
- **0** (blank): Neutral 
- **-1** (minus): Failure/negative

## Standard Roll:
- **Notation**: \`4dF\`
- **Range**: -4 to +4
- **Average**: 0 (bell curve distribution)

## Example Results:
- [+1, 0, 0, -1] = 0 (neutral result)
- [+1, +1, 0, +1] = +3 (great success)
- [-1, -1, 0, -1] = -3 (terrible failure)

## Fate Ladder:
- +3: Great, +2: Good, +1: Fair
- 0: Mediocre, -1: Poor, -2: Terrible

## Usage:
Roll 4dF + skill rating vs. difficulty number`,

      'success-counting': `# Success Counting Systems

Count how many dice meet or exceed a target:

## Basic Format:
- **Notation**: \`5d10>7\`
- **Effect**: Roll 5d10, count how many are 7 or higher
- **Result**: Number of successes (0-5)

## Example:
- Roll [8, 6, 9, 4, 10] with target 7
- Results: 8✓, 6✗, 9✓, 4✗, 10✓ = 3 successes

## Gaming Systems:
- **World of Darkness**: Roll dice pool, count 8+ as successes
- **Shadowrun**: Variable target numbers
- **Star Wars d6**: Count dice that beat difficulty

## Variants:
- \`6d6>4\` - Count 4+ as successes
- \`3d8>6\` - Count 6+ as successes
- Some systems have exploding successes!`,

      'combat-examples': `# Combat Roll Examples

Common patterns for tabletop RPG combat:

## D&D 5e Attack Sequence:
1. **Attack Roll**: \`1d20+7\` (vs. AC)
2. **Damage Roll**: \`1d8+4\` (longsword + STR)
3. **Critical Hit**: \`2d8+4\` (double weapon dice)

## Advantage/Disadvantage:
- **Advantage**: \`2d20kh1+7\`
- **Disadvantage**: \`2d20kl1+7\`

## Spell Attack Examples:
- **Fire Bolt**: \`1d20+5\` to hit, \`1d10\` damage
- **Fireball**: \`8d6\` damage (DEX save for half)
- **Magic Missile**: \`1d4+1\` per missile (auto-hit)

## Multi-Attack:
- Fighter with 2 attacks: Roll \`1d20+7\` twice
- Each hit does \`1d8+4\` damage

## Sneak Attack:
- Rogue: \`1d20+5\` to hit, \`1d6+3+2d6\` damage`,

      'spell-damage': `# Spell Damage Examples

Common spell damage patterns:

## Cantrips (0-level):
- **Fire Bolt**: \`1d10\` fire damage
- **Eldritch Blast**: \`1d10\` force damage
- **Sacred Flame**: \`1d8\` radiant damage

## 1st Level Spells:
- **Magic Missile**: \`1d4+1\` per missile (3 missiles)
- **Burning Hands**: \`3d6\` fire damage
- **Cure Wounds**: \`1d8+[modifier]\` healing

## Higher Level Spells:
- **Fireball** (3rd): \`8d6\` fire damage
- **Lightning Bolt** (3rd): \`8d6\` lightning damage
- **Meteor Swarm** (9th): \`20d6\` bludgeoning + \`20d6\` fire

## Scaling Patterns:
- Most spells add damage dice per level
- Fireball: +1d6 per level above 3rd
- Magic Missile: +1 missile per level above 1st`,

      'skill-checks': `# Skill Check Examples

Rolling for abilities and skills:

## Basic Format:
- **Formula**: \`1d20 + ability modifier + proficiency\`
- **Example**: \`1d20+3+2\` (DEX modifier + proficiency)

## Common Modifiers:
- **Ability Score**: +0 to +5 (10-20 ability)
- **Proficiency**: +2 to +6 (level-based)
- **Expertise**: Double proficiency bonus
- **Guidance**: +\`1d4\` from spell

## Advantage Sources:
- **Help action**: \`2d20kh1+5\`
- **Circumstance**: \`2d20kh1+5\`
- **Class features**: \`2d20kh1+5\`

## Example Checks:
- **Athletics** (STR): \`1d20+3+2\`
- **Stealth** (DEX): \`1d20+4+4\` (expertise)
- **Persuasion** (CHA): \`1d20+2+2\`

## Passive Scores:
- **Passive Perception**: 10 + WIS + proficiency (no roll)`
    };

    const content = contentLibrary[id];
    if (!content) {
      throw new Error(`Content not found for ID: ${id}. Available IDs: ${Object.keys(contentLibrary).join(', ')}`);
    }

    // Get the corresponding search result for title and URL
    const searchableContent = [
      { id: 'basic-notation', title: 'Basic Dice Notation', url: 'dice://guide/notation#basic' },
      { id: 'advantage-disadvantage', title: 'D&D Advantage and Disadvantage', url: 'dice://guide/notation#advantage' },
      { id: 'modifiers', title: 'Dice Modifiers and Bonuses', url: 'dice://guide/notation#modifiers' },
      { id: 'ability-scores', title: 'Character Ability Scores', url: 'dice://guide/notation#ability' },
      { id: 'exploding-dice', title: 'Exploding Dice', url: 'dice://guide/notation#exploding' },
      { id: 'rerolling', title: 'Rerolling Dice', url: 'dice://guide/notation#reroll' },
      { id: 'percentile-dice', title: 'Percentile Dice', url: 'dice://guide/notation#percentile' },
      { id: 'fudge-dice', title: 'Fudge Dice', url: 'dice://guide/notation#fudge' },
      { id: 'success-counting', title: 'Success Counting', url: 'dice://guide/notation#success' },
      { id: 'combat-examples', title: 'Combat Roll Examples', url: 'dice://examples/combat' },
      { id: 'spell-damage', title: 'Spell Damage Examples', url: 'dice://examples/spells' },
      { id: 'skill-checks', title: 'Skill Check Examples', url: 'dice://examples/skills' }
    ];

    const item = searchableContent.find(item => item.id === id);
    if (!item) {
      throw new Error(`Metadata not found for ID: ${id}`);
    }

    // Return JSON-encoded document object as required by MCP spec
    const document = {
      id: item.id,
      title: item.title,
      text: content,
      url: item.url,
      metadata: {
        source: 'dice-rolling-mcp',
        type: 'dice-notation-guide',
        category: id.includes('example') ? 'examples' : 'mechanics'
      }
    };

    const jsonDocument = JSON.stringify(document);

    return {
      content: [{ type: 'text', text: jsonDocument }],
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