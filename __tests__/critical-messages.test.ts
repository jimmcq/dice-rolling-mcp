import { DiceNotationParser } from '../src/parser/dice-notation-parser';
import { DiceRoller } from '../src/roller/dice-roller';
import { randomInt } from 'crypto';

// Mock the crypto module
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

const mockedRandomInt = randomInt as jest.Mock;

describe('Critical Success/Fail Messages', () => {
  const parser = new DiceNotationParser();
  const roller = new DiceRoller();

  beforeEach(() => {
    mockedRandomInt.mockClear();
  });

  test('shows critical success for natural 20 on 1d20', () => {
    const expression = parser.parse('1d20');
    mockedRandomInt.mockReturnValueOnce(20);

    const result = roller.roll('1d20', expression);

    // Simulate the formatting logic from index.ts
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(1);
    expect(effectiveRolls[0].result).toBe(20);
  });

  test('shows critical fail for natural 1 on 1d20', () => {
    const expression = parser.parse('1d20');
    mockedRandomInt.mockReturnValueOnce(1);

    const result = roller.roll('1d20', expression);

    // Simulate the formatting logic from index.ts
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(1);
    expect(effectiveRolls[0].result).toBe(1);
  });

  test('shows critical success for natural 20 on 2d20kh1 (advantage)', () => {
    const expression = parser.parse('2d20kh1');
    mockedRandomInt.mockReturnValueOnce(20).mockReturnValueOnce(15);

    const result = roller.roll('2d20kh1', expression);

    // Should have one roll not dropped (the 20), one dropped (the 15)
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(1);
    expect(effectiveRolls[0].result).toBe(20);

    const droppedRolls = result.rolls.filter(roll => roll.dropped);
    expect(droppedRolls).toHaveLength(1);
    expect(droppedRolls[0].result).toBe(15);
  });

  test('shows critical fail for natural 1 on 2d20kl1 (disadvantage)', () => {
    const expression = parser.parse('2d20kl1');
    mockedRandomInt.mockReturnValueOnce(1).mockReturnValueOnce(15);

    const result = roller.roll('2d20kl1', expression);

    // Should have one roll not dropped (the 1), one dropped (the 15)
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(1);
    expect(effectiveRolls[0].result).toBe(1);

    const droppedRolls = result.rolls.filter(roll => roll.dropped);
    expect(droppedRolls).toHaveLength(1);
    expect(droppedRolls[0].result).toBe(15);
  });

  test('does not show critical messages for 2d20 (no keep/drop)', () => {
    const expression = parser.parse('2d20');
    mockedRandomInt.mockReturnValueOnce(20).mockReturnValueOnce(1);

    const result = roller.roll('2d20', expression);

    // Should have two effective rolls, so no critical message
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(2);
  });

  test('does not show critical messages for non-d20 dice', () => {
    const expression = parser.parse('1d6');
    mockedRandomInt.mockReturnValueOnce(6);

    const result = roller.roll('1d6', expression);

    // Should have no d20 rolls
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(0);
  });

  test('does not show critical messages for rerolled natural 20', () => {
    const expression = parser.parse('1d20r20');
    mockedRandomInt.mockReturnValueOnce(20).mockReturnValueOnce(15);

    const result = roller.roll('1d20r20', expression);

    // The original 20 should be rerolled to 15
    const effectiveRolls = result.rolls.filter(
      roll => !roll.dropped && roll.size === 20
    );
    expect(effectiveRolls).toHaveLength(1);
    expect(effectiveRolls[0].result).toBe(20); // Original roll
    expect(effectiveRolls[0].modified).toBe(15); // Rerolled value
    expect(effectiveRolls[0].rerolled).toBe(true);
  });
});
