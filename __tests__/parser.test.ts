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
      dice: [
        { count: 1, size: 20 },
        { count: 2, size: 6 },
      ],
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

  // Validation tests
  test('rejects empty notation', () => {
    expect(() => parser.parse('')).toThrow('Dice notation cannot be empty');
    expect(() => parser.parse('   ')).toThrow('Dice notation cannot be empty');
  });

  test('rejects invalid notation without dice', () => {
    expect(() => parser.parse('badnotation')).toThrow(
      'Invalid dice notation. Use formats like:'
    );
    expect(() => parser.parse('123')).toThrow(
      'Invalid dice notation. Use formats like:'
    );
    expect(() => parser.parse('hello world')).toThrow(
      'Invalid dice notation. Use formats like:'
    );
  });

  test('rejects zero dice count', () => {
    expect(() => parser.parse('0d6')).toThrow(
      'Invalid dice count: 0. Must be positive.'
    );
  });

  test('rejects zero die size', () => {
    expect(() => parser.parse('1d0')).toThrow(
      'Invalid die size: 0. Must be positive.'
    );
  });

  test('rejects excessive dice count', () => {
    expect(() => parser.parse('1001d6')).toThrow(
      'Too many dice: 1001. Maximum is 1000.'
    );
  });

  test('rejects excessive die size', () => {
    expect(() => parser.parse('1d10001')).toThrow(
      'Die size too large: 10001. Maximum is 10000.'
    );
  });

  test('rejects dangerous combinations', () => {
    expect(() => parser.parse('500d500')).toThrow(
      'Dice combination too large: 500d500. Risk of excessive computation.'
    );
  });

  test('rejects invalid keep/drop counts', () => {
    expect(() => parser.parse('4d6kh0')).toThrow(
      'Invalid keep count: 0. Must be positive.'
    );
    expect(() => parser.parse('4d6dl0')).toThrow(
      'Invalid drop count: 0. Must be positive.'
    );
    expect(() => parser.parse('4d6kh4')).toThrow(
      'Cannot keep 4 dice from only 4 dice.'
    );
    expect(() => parser.parse('2d20dl2')).toThrow(
      'Cannot drop 2 dice from only 2 dice.'
    );
  });

  test('rejects invalid reroll values', () => {
    expect(() => parser.parse('4d6r0')).toThrow(
      'Invalid reroll value: 0. Must be between 1 and 6.'
    );
    expect(() => parser.parse('4d6r7')).toThrow(
      'Invalid reroll value: 7. Must be between 1 and 6.'
    );
  });

  test('rejects invalid success thresholds', () => {
    expect(() => parser.parse('5d10>0')).toThrow(
      'Invalid success threshold: 0. Must be between 1 and 10.'
    );
    expect(() => parser.parse('5d10>11')).toThrow(
      'Invalid success threshold: 11. Must be between 1 and 10.'
    );
  });

  test('rejects completely invalid parts', () => {
    expect(() => parser.parse('2d6+abc')).toThrow(
      'Invalid notation part: "abc". Use dice notation'
    );
    expect(() => parser.parse('xyz+3')).toThrow(
      'Invalid dice notation. Use formats like:'
    );
  });

  test('accepts valid edge cases', () => {
    expect(() => parser.parse('1d1')).not.toThrow();
    expect(() => parser.parse('100d100')).not.toThrow();
    expect(() => parser.parse('4d6kh3')).not.toThrow();
    expect(() => parser.parse('4d6dl1')).not.toThrow();
  });
});
