import { DiceNotationParser } from '../src/parser/dice-notation-parser';

describe('DiceNotationParser', () => {
  const parser = new DiceNotationParser();

  test('parses simple notation', () => {
    const result = parser.parse('3d6+2');
    expect(result).toEqual({
      dice: [{ count: 3, size: 6 }],
      modifier: 2,
    });
  });

  test('handles multiple dice types', () => {
    const result = parser.parse('1d20+2d6-1');
    expect(result).toEqual({
      dice: [{ count: 1, size: 20 }, { count: 2, size: 6 }],
      modifier: -1,
    });
  });

  test('handles percentile dice', () => {
    const result = parser.parse('1d%');
    expect(result).toEqual({
      dice: [{ count: 1, size: 100 }],
      modifier: 0,
    });
  });

  test('parses keep highest', () => {
    const result = parser.parse('4d6kh3');
    expect(result).toEqual({
      dice: [{ count: 4, size: 6, keep: { type: 'h', count: 3 } }],
      modifier: 0,
    });
  });

  test('parses drop lowest', () => {
    const result = parser.parse('4d6dl1');
    expect(result).toEqual({
      dice: [{ count: 4, size: 6, drop: { type: 'l', count: 1 } }],
      modifier: 0,
    });
  });

  test('parses reroll', () => {
    const result = parser.parse('4d6r1');
    expect(result).toEqual({
      dice: [{ count: 4, size: 6, reroll: [1] }],
      modifier: 0,
    });
  });

  test('parses exploding dice', () => {
    const result = parser.parse('3d6!');
    expect(result).toEqual({
      dice: [{ count: 3, size: 6, explode: true }],
      modifier: 0,
    });
  });

  test('parses success counting', () => {
    const result = parser.parse('5d10>8');
    expect(result).toEqual({
      dice: [{ count: 5, size: 10, success: 8 }],
      modifier: 0,
    });
  });
});