import { DiceNotationParser } from '../src/parser/dice-notation-parser';
import { DiceRoller } from '../src/roller/dice-roller';

describe('Edge Cases and Error Handling', () => {
  const parser = new DiceNotationParser();
  const roller = new DiceRoller();

  describe('Parser Edge Cases', () => {
    test('should handle empty string', () => {
      expect(() => parser.parse('')).toThrow();
    });

    test('should handle whitespace only', () => {
      expect(() => parser.parse('   ')).toThrow();
    });

    test('should handle malformed expressions', () => {
      expect(() => parser.parse('d')).toThrow();
      expect(() => parser.parse('1d')).toThrow();
      expect(() => parser.parse('bad-notation')).toThrow();
    });

    test('should handle very large numbers by rejecting them', () => {
      expect(() => parser.parse('999999d6')).toThrow('Too many dice');
      expect(() => parser.parse('1d999999')).toThrow('Die size too large');
    });

    test('should handle zero dice', () => {
      expect(() => parser.parse('0d6')).toThrow();
    });

    test('should handle zero-sided dice', () => {
      expect(() => parser.parse('1d0')).toThrow();
    });

    test('should handle negative dice count', () => {
      const result = parser.parse('-1d6');
      expect(result.dice[0].count).toBe(-1);
      expect(result.dice[0].size).toBe(6);
    });

    test('should handle mixed positive and negative dice', () => {
      const result = parser.parse('2d6-1d4+3');
      expect(result.dice).toHaveLength(2);
      expect(result.dice[0].count).toBe(2);
      expect(result.dice[1].count).toBe(-1);
      expect(result.modifier).toBe(3);
    });
  });

  describe('Roller Edge Cases', () => {
    test('should handle fudge dice (dF)', () => {
      const expression = parser.parse('4dF');
      const result = roller.roll('4dF', expression);

      expect(result.rolls).toHaveLength(4);
      result.rolls.forEach(roll => {
        expect(roll.result).toBeGreaterThanOrEqual(-1);
        expect(roll.result).toBeLessThanOrEqual(1);
      });
    });

    test('should handle single fudge die', () => {
      const expression = parser.parse('1dF');
      const result = roller.roll('1dF', expression);

      expect(result.rolls).toHaveLength(1);
      expect([-1, 0, 1]).toContain(result.rolls[0].result);
    });

    test('should handle percentage dice (d%)', () => {
      const expression = parser.parse('1d%');
      const result = roller.roll('1d%', expression);

      expect(result.rolls).toHaveLength(1);
      expect(result.rolls[0].result).toBeGreaterThanOrEqual(1);
      expect(result.rolls[0].result).toBeLessThanOrEqual(100);
    });

    test('should handle drop lowest with sufficient dice', () => {
      const expression = parser.parse('4d6dl1');
      const result = roller.roll('4d6dl1', expression);

      expect(result.rolls).toHaveLength(4);
      expect(result.rolls.filter(r => r.dropped)).toHaveLength(1);
      expect(result.rolls.filter(r => !r.dropped)).toHaveLength(3);
    });

    test('should handle keep highest with sufficient dice', () => {
      const expression = parser.parse('4d6kh3');
      const result = roller.roll('4d6kh3', expression);

      expect(result.rolls).toHaveLength(4);
      expect(result.rolls.filter(r => !r.dropped)).toHaveLength(3);
      expect(result.rolls.filter(r => r.dropped)).toHaveLength(1);
    });

    test('should handle exploding dice with reasonable limits', () => {
      const expression = parser.parse('1d2!');
      const result = roller.roll('1d2!', expression);

      // Should eventually stop exploding (with safety limit)
      expect(result.rolls.length).toBeGreaterThan(0);
      expect(result.rolls.length).toBeLessThan(50); // Safety check
    });

    test('should handle reroll with some dice needing reroll', () => {
      const expression = parser.parse('3d6r1');
      const result = roller.roll('3d6r1', expression);

      expect(result.rolls).toHaveLength(3);
      // Check that reroll functionality exists
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    test('should handle success counting', () => {
      const expression = parser.parse('5d10>7');
      const result = roller.roll('5d10>7', expression);

      expect(result.rolls).toHaveLength(5);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(5);
    });

    test('should handle negative dice counts in rolling', () => {
      const expression = parser.parse('-2d6+10');
      const result = roller.roll('-2d6+10', expression);

      expect(result.rolls).toHaveLength(2);
      expect(result.total).toBeLessThan(10); // Should subtract the dice
    });
  });

  describe('Statistics Edge Cases', () => {
    test('should handle empty dice arrays', () => {
      const expression = { dice: [], modifier: 5 };
      const result = roller.roll('0+5', expression);

      expect(result.rolls).toHaveLength(0);
      expect(result.total).toBe(5);
    });

    test('should handle negative modifier', () => {
      const expression = parser.parse('1d6-10');
      const result = roller.roll('1d6-10', expression);

      expect(result.rolls).toHaveLength(1);
      expect(result.total).toBeLessThanOrEqual(-4); // Minimum possible
    });
  });

  describe('Parser Validation', () => {
    test('should require at least one die in notation', () => {
      expect(() => parser.parse('5')).toThrow(
        'Invalid dice notation. Use formats like:'
      );
    });

    test('should handle drop/keep validation properly', () => {
      expect(() => parser.parse('1d6dl1')).toThrow(
        'Cannot drop 1 dice from only 1 dice'
      );
      expect(() => parser.parse('2d6kh3')).toThrow(
        'Cannot keep 3 dice from only 2 dice'
      );
    });
  });
});
