# Dice Rolling MCP Server

A TypeScript-based Model Context Protocol (MCP) server that provides comprehensive dice rolling capabilities to AI assistants. Supports standard dice notation with advanced mechanics commonly used in tabletop gaming.

## The Problem: LLMs Can't Actually Roll Dice

When you ask an AI assistant to "roll dice," they don't actually roll anything. Large Language Models are deterministic systems that generate responses based on patterns in their training data. When asked to roll a d20, they might respond with something like "I rolled a 14" - but that number was generated through text prediction, not random number generation.

This creates several problems:

- **No True Randomness**: Results aren't genuinely random and may follow predictable patterns
- **Gaming Integrity**: Critical for tabletop RPGs where fair dice rolls affect gameplay
- **Simulation Accuracy**: Statistical simulations require proper random number generation
- **Reproducibility Issues**: Same prompts might yield suspiciously similar "random" results

## The Solution: Real Dice for AI

This MCP server acts as a bridge between AI assistants and actual random number generation. Think of it as giving your AI assistant a real set of dice instead of asking them to imagine rolling.

**How it works:**
- AI assistant receives dice notation (e.g., "3d6+2")
- MCP server parses the request and generates cryptographically secure random numbers
- Real dice mechanics are applied (advantage, exploding dice, rerolls, etc.)
- Genuine random results are returned to the AI

The result: AI assistants can now provide truly random dice rolls with mathematical integrity, making them suitable for actual gaming, simulations, and any application requiring authentic randomness.

## Features

### Standard Dice Notation
- **Basic rolls**: `1d20`, `3d6`, `2d10`
- **Modifiers**: `1d20+5`, `2d6-3`, `1d8*2`
- **Multiple dice types**: `1d20+2d6+3`
- **Percentile dice**: `1d%` (d100)
- **Fudge dice**: `4dF` (Fate/Fudge system)

### Advanced Mechanics
- **Advantage/Disadvantage**: `2d20kh1` (keep highest), `2d20kl1` (keep lowest)
- **Drop mechanics**: `4d6dl1` (drop lowest), `4d6dh1` (drop highest)
- **Exploding dice**: `3d6!` (reroll and add on maximum)
- **Reroll mechanics**: `4d6r1` (reroll 1s)
- **Success counting**: `5d10>7` (count successes ≥7)

### MCP Tools

#### `dice_roll`
Executes dice rolls using standard notation with optional labeling and verbose output.

**Parameters:**
- `notation` (required): Dice notation string (e.g., "3d6+2")
- `label` (optional): Descriptive label for the roll
- `verbose` (optional): Show detailed breakdown of individual dice

#### `dice_validate`
Validates dice notation without executing the roll, providing detailed breakdown of what the notation means.

**Parameters:**
- `notation` (required): Dice notation string to validate

## Installation

```bash
git clone <repository-url>
cd dice-rolling-mcp
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dice-roller": {
      "command": "node",
      "args": ["path/to/dice-rolling-mcp/dist/index.js"]
    }
  }
}
```

**Platform-specific examples:**

**Windows (WSL):**
```json
{
  "mcpServers": {
    "dice-roller": {
      "command": "wsl",
      "args": ["node", "/path/to/dice-rolling-mcp/dist/index.js"]
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "dice-roller": {
      "command": "node",
      "args": ["/path/to/dice-rolling-mcp/dist/index.js"]
    }
  }
}
```

### Standalone Server

```bash
npm run start
```

## Examples

### Basic Rolling
```
Human: Roll 3d6+2 for damage
Assistant: You rolled 3d6+2 for damage:
🎲 Total: 13
📊 Breakdown: 3d6:[4,2,5] + 2
```

### Advantage System
```
Human: Roll 2d20kh1+5 for attack with advantage
Assistant: You rolled 2d20kh1+5 for attack with advantage:
🎲 Total: 23
📊 Breakdown: 2d20:[12,18] keep highest + 5
```

### Validation
```
Human: Is "4d6kh3+2d8+5" valid dice notation?
Assistant: ✅ Valid dice notation: 4d6kh3+2d8+5

Breakdown:
• 4d6 (keep highest 3)
• 2d8
• Modifier: +5
```

## Architecture

### Core Components

- **Parser** (`src/parser/`): Tokenizes and parses dice notation using regex-based parsing
- **Roller** (`src/roller/`): Executes dice expressions with cryptographically secure random number generation
- **MCP Server** (`src/index.ts`): Implements the Model Context Protocol for AI assistant integration
- **Type System** (`src/types.ts`): Comprehensive TypeScript definitions for all dice mechanics

### Key Design Decisions

- **Security**: Uses Node.js `crypto.randomInt()` for cryptographically secure randomness
- **Extensibility**: Modular architecture supports easy addition of new dice mechanics
- **Compatibility**: ES2022 target with fallbacks for broader Node.js version support
- **Type Safety**: Full TypeScript implementation with strict type checking

## Testing

```bash
npm test
```

The test suite covers:
- Dice notation parsing for all supported mechanics
- Roll execution with mocked random number generation
- Edge cases and error handling
- MCP protocol compliance

## Development

### Project Structure
```
dice-rolling-mcp/
├── src/
│   ├── index.ts              # MCP server implementation
│   ├── parser/               # Dice notation parser
│   ├── roller/               # Dice rolling engine
│   ├── statistics/           # Statistical analysis tools
│   └── types.ts              # TypeScript definitions
├── __tests__/                # Test suite
├── dist/                     # Compiled JavaScript
└── examples/                 # Usage examples
```

### Adding New Mechanics

1. Extend the `DiceTerm` interface in `types.ts`
2. Update the parser regex in `dice-notation-parser.ts`
3. Implement the mechanic in `dice-roller.ts`
4. Add comprehensive tests

### Configuration

The server supports various configuration options through the `DiceRollerConfig` interface:
- Maximum dice count per roll
- Maximum die size
- Random number source selection
- History size limits

## Technical Specifications

- **Language**: TypeScript 5.8+
- **Runtime**: Node.js 18+ (tested with v24.0.2)
- **Protocol**: MCP (Model Context Protocol) 2024-11-05
- **Dependencies**: Minimal (zod, @modelcontextprotocol/sdk)
- **Module System**: ES Modules
- **Test Framework**: Jest with ts-jest

## Security Considerations

- Input validation prevents malicious dice expressions
- Resource limits prevent DoS through extremely large rolls
- Cryptographically secure random number generation
- No external network dependencies

## Author

**Jim McQuillan**
- GitHub: [@jimmcq](https://github.com/jimmcq)
- LinkedIn: [jimmcquillan](https://linkedin.com/in/jimmcquillan/)

## License

ISC

## Contributing

Contributions welcome! Please ensure:
- All tests pass (`npm test`)
- Code follows existing patterns and conventions
- New features include appropriate test coverage
- TypeScript strict mode compliance
