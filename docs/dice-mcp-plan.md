# Dice Rolling MCP - Development Plan

## Project Overview
A TypeScript-based Model Context Protocol (MCP) server that provides real dice rolling capabilities to AI assistants, supporting standard dice notation and common rolling mechanics.

## Core Features

### 1. Standard Dice Notation Support
- **Basic rolls**: `1d20`, `3d6`, `2d10`
- **Modifiers**: `1d20+5`, `2d6-3`, `1d8*2`
- **Multiple dice types**: `1d20+2d6+3`
- **Advantage/Disadvantage**: `2d20kh1` (keep highest), `2d20kl1` (keep lowest)
- **Exploding dice**: `3d6!` (reroll and add on max)
- **Reroll mechanics**: `4d6r1` (reroll 1s)
- **Drop mechanics**: `4d6d1` (drop lowest)

### 2. Named Dice Systems
```typescript
interface DiceSystem {
  fudge: 'dF';      // Fate/Fudge dice (-1, 0, +1)
  percentile: 'd%'; // d100
  coin: 'd2';       // Coin flip
  fate: '4dF';      // Standard Fate roll
}
```

## MCP Architecture

### Tool Definitions
```typescript
interface DiceRollingTools {
  'dice_roll': {
    description: 'Roll dice using standard notation';
    parameters: {
      notation: string;      // e.g., "3d6+2"
      label?: string;       // e.g., "Damage roll"
    };
  };
  
  'dice_validate': {
    description: 'Validate dice notation without rolling';
    parameters: {
      notation: string;
    };
  };
}
```

### Response Format
```typescript
interface RollResult {
  notation: string;
  label?: string;
  total: number;
  rolls: DieRoll[];
  breakdown: string;    // Human-readable breakdown
}

interface DieRoll {
  size: number;         // d6, d20, etc.
  result: number;
  modified?: number;    // After rerolls/explosions
  dropped?: boolean;
  exploded?: boolean;
  rerolled?: boolean;
}
```

## Implementation Plan

### Phase 1: Core Parser & Roller (Days 1-3)
```typescript
// src/parser/dice-notation-parser.ts
export class DiceNotationParser {
  parse(notation: string): DiceExpression {
    // Tokenize and parse dice notation
    // Support recursive expressions
    // Handle operator precedence
  }
}

// src/roller/dice-roller.ts
export class DiceRoller {
  roll(expression: DiceExpression): RollResult {
    // Execute the parsed expression
    // Handle special mechanics (exploding, reroll, etc.)
    // Track individual die results
  }
}
```

### Phase 2: MCP Server Implementation (Days 4-5)
```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'dice-roller',
  version: '1.0.0',
  capabilities: {
    tools: {},
  },
});

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'dice_roll',
      description: 'Roll dice using standard notation',
      inputSchema: {
        type: 'object',
        properties: {
          notation: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['notation'],
      },
    },
    {
      name: 'dice_validate',
      description: 'Validate dice notation without rolling',
      inputSchema: {
        type: 'object',
        properties: {
          notation: { type: 'string' },
        },
        required: ['notation'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  // Route to appropriate handler
});
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/parser.test.ts
describe('DiceNotationParser', () => {
  test('parses simple notation', () => {
    const result = parser.parse('3d6+2');
    expect(result).toEqual({
      dice: [{ count: 3, size: 6 }],
      modifier: 2,
    });
  });
  
  test('handles complex expressions', () => {
    const result = parser.parse('2d20kh1+1d6+3');
    // Test keep highest mechanic
  });
});
```

### Integration Tests
```typescript
// __tests__/mcp-server.test.ts
describe('Dice MCP Server', () => {
  test('responds to dice_roll tool', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'dice_roll',
        arguments: { notation: '1d20+5' },
      },
    });
    
    expect(response.content[0].text).toMatch(/rolled 1d20\+5/);
  });
});
```

## Usage Examples

### Basic Roll
```
Human: Roll 3d6+2 for damage
Assistant: I'll roll that for you.

[Using dice_roll tool with notation="3d6+2" label="damage"]

You rolled 3d6+2 for damage:
🎲 Rolls: [4, 2, 5] + 2
📊 Total: 13
```

### Combat Scenario
```
Human: I attack with my longsword with advantage
Assistant: Rolling your attack with advantage:

[Using dice_roll tool with notation="2d20kh1+5" label="longsword attack"]

Attack roll (advantage): 2d20kh1+5
🎲 Rolled: [12, 18] keeping highest + 5
⚔️ Total: 23

That's a solid hit! Roll damage when ready.
```

### Validation Example
```
Human: Is "4d6kh3+2d8+5" valid dice notation?
Assistant: Let me check that notation for you.

[Using dice_validate tool with notation="4d6kh3+2d8+5"]

Yes, that's valid! It means:
- Roll 4d6, keep the highest 3
- Add 2d8
- Add a +5 modifier
```

## Configuration Options

```typescript
interface DiceRollerConfig {
  maxDice: number;           // Maximum dice in single roll (default: 100)
  maxSides: number;          // Maximum die size (default: 10000)
  randomSource: 'math';      // RNG source (default: 'math')
}
```

## Security Considerations

- **Input validation**: Prevent DoS through extremely large dice expressions
- **Resource limits**: Cap number of dice and die size
- **Sanitization**: Ensure labels don't contain executable code

## NPM Package Structure

```
dice-roller-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── parser/               # Notation parser
│   ├── roller/               # Dice rolling engine  
│   └── types.ts              # TypeScript types
├── dist/                     # Compiled output
├── __tests__/                # Test suite
├── examples/                 # Usage examples
├── package.json
├── tsconfig.json
└── README.md
```

## Development Timeline

**Days 1-3**: Core implementation
- Parser for dice notation
- Dice rolling engine with special mechanics
- Basic test coverage

**Days 4-5**: MCP Integration
- MCP server setup
- Tool implementations (roll & validate)
- Integration tests

**Day 6**: Documentation & Release
- README with examples
- NPM package publication
- Usage documentation

This focused MCP provides AI assistants with real dice rolling capabilities using standard notation, letting the AI handle complex game logic and statistics calculations.