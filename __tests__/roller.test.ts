import { DiceRoller } from '../src/roller/dice-roller';
import { DiceExpression } from '../src/types';
import { randomInt } from 'crypto';

// Mock the crypto module
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

const mockedRandomInt = randomInt as jest.Mock;

describe('DiceRoller', () => {
  const roller = new DiceRoller();

  beforeEach(() => {
    mockedRandomInt.mockClear();
  });

  test('handles success counting', () => {
    const expression: DiceExpression = {
      dice: [{ count: 5, size: 10, success: 8 }],
      modifier: 0,
    };

    mockedRandomInt
      .mockReturnValueOnce(8)
      .mockReturnValueOnce(9)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(7);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(3);
  });

  test('keep highest works correctly', () => {
    const expression: DiceExpression = {
      dice: [{ count: 4, size: 6, keep: { type: 'h', count: 2 } }],
      modifier: 0,
    };

    // Roll 1, 3, 5, 6 - should keep 5 and 6
    mockedRandomInt
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(11); // 5 + 6
    
    // Check that the lowest dice are marked as dropped
    const droppedCount = result.rolls.filter(roll => roll.dropped).length;
    expect(droppedCount).toBe(2);
    
    const keptCount = result.rolls.filter(roll => !roll.dropped).length;
    expect(keptCount).toBe(2);
  });

  test('keep lowest works correctly', () => {
    const expression: DiceExpression = {
      dice: [{ count: 4, size: 6, keep: { type: 'l', count: 2 } }],
      modifier: 0,
    };

    // Roll 1, 3, 5, 6 - should keep 1 and 3
    mockedRandomInt
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(4); // 1 + 3
    
    // Check that the highest dice are marked as dropped
    const droppedCount = result.rolls.filter(roll => roll.dropped).length;
    expect(droppedCount).toBe(2);
    
    const keptCount = result.rolls.filter(roll => !roll.dropped).length;
    expect(keptCount).toBe(2);
  });

  test('drop highest works correctly', () => {
    const expression: DiceExpression = {
      dice: [{ count: 4, size: 6, drop: { type: 'h', count: 1 } }],
      modifier: 0,
    };

    // Roll 1, 3, 5, 6 - should drop 6, keep 1, 3, 5
    mockedRandomInt
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(9); // 1 + 3 + 5
    
    // Check that only the highest die is dropped
    const droppedCount = result.rolls.filter(roll => roll.dropped).length;
    expect(droppedCount).toBe(1);
    
    const keptCount = result.rolls.filter(roll => !roll.dropped).length;
    expect(keptCount).toBe(3);
  });

  test('drop lowest works correctly', () => {
    const expression: DiceExpression = {
      dice: [{ count: 4, size: 6, drop: { type: 'l', count: 1 } }],
      modifier: 0,
    };

    // Roll 1, 3, 5, 6 - should drop 1, keep 3, 5, 6
    mockedRandomInt
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(14); // 3 + 5 + 6
    
    // Check that only the lowest die is dropped
    const droppedCount = result.rolls.filter(roll => roll.dropped).length;
    expect(droppedCount).toBe(1);
    
    const keptCount = result.rolls.filter(roll => !roll.dropped).length;
    expect(keptCount).toBe(3);
  });

  test('basic rolling without modifiers', () => {
    const expression: DiceExpression = {
      dice: [{ count: 2, size: 6 }],
      modifier: 0,
    };

    mockedRandomInt
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5);

    const result = roller.roll("test", expression);
    expect(result.total).toBe(8);
    expect(result.rolls).toHaveLength(2);
    expect(result.rolls[0].result).toBe(3);
    expect(result.rolls[1].result).toBe(5);
  });
});