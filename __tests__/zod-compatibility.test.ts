/**
 * This test ensures zod version compatibility with the MCP SDK.
 * If zod versions are incompatible, parsing will fail with errors like "b._parse is not a function"
 */

import { DiceNotationParser } from '../src/parser/dice-notation-parser';
import { DiceRoller } from '../src/roller/dice-roller';

describe('Zod Compatibility', () => {
  test('parser and roller work without zod version conflicts', () => {
    const parser = new DiceNotationParser();
    const roller = new DiceRoller();

    // These operations internally use zod for validation
    // If there's a version mismatch, this will fail
    const expression = parser.parse('2d20kh1+5');
    expect(expression).toBeDefined();
    expect(expression.dice).toHaveLength(1);
    expect(expression.dice[0].count).toBe(2);
    expect(expression.dice[0].size).toBe(20);
    expect(expression.modifier).toBe(5);

    const result = roller.roll('2d20kh1+5', expression);
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(6); // minimum: 1 + 5
    expect(result.total).toBeLessThanOrEqual(25); // maximum: 20 + 5
  });

  test('complex dice notation parsing works', () => {
    const parser = new DiceNotationParser();

    // Test various complex notations that rely on zod parsing
    const testCases = [
      '1d20+5',
      '2d20kh1+7', // advantage
      '2d20kl1+3', // disadvantage
      '4d6kh3', // character stats
      '3d6!', // exploding
      '4d6r1', // reroll
      '5d10>7', // success counting
      '1d%', // percentile
      '4dF', // fudge
    ];

    testCases.forEach(notation => {
      expect(() => {
        const expression = parser.parse(notation);
        expect(expression).toBeDefined();
      }).not.toThrow(`Failed to parse: ${notation}`);
    });
  });

  test('error handling works correctly', () => {
    const parser = new DiceNotationParser();

    // These should throw errors (not zod version conflicts)
    expect(() => parser.parse('')).toThrow('Dice notation cannot be empty');
    expect(() => parser.parse('invalid')).toThrow('Invalid dice notation');
    expect(() => parser.parse('0d6')).toThrow('Invalid dice count');
    expect(() => parser.parse('1d0')).toThrow('Invalid die size');
  });

  test('version info is accessible', async () => {
    // This test documents the expected zod version for future reference
    const pkg = await import('zod/package.json');
    expect(pkg.version).toMatch(/^4\./); // Updated to v4.x

    // Ensure it's the specific version we expect
    expect(pkg.version).toBe('4.0.17');
  });
});
