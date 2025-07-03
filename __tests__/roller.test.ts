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

    const result = roller.roll(expression);
    expect(result.total).toBe(3);
  });
});