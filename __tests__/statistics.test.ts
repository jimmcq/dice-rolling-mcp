import { StatisticsCalculator } from '../src/statistics/statistics-calculator';
import { DiceNotationParser } from '../src/parser/dice-notation-parser';

describe('Statistics Calculator', () => {
  const calculator = new StatisticsCalculator();
  const parser = new DiceNotationParser();

  describe('Basic Statistics Simulation', () => {
    test('should calculate statistics for simple dice', () => {
      const expression = parser.parse('1d6');
      const stats = calculator.calculate(expression, 1000);

      // Should be within reasonable range for 1d6
      expect(stats.min).toBeGreaterThanOrEqual(1);
      expect(stats.max).toBeLessThanOrEqual(6);
      expect(stats.mean).toBeGreaterThan(2);
      expect(stats.mean).toBeLessThan(5);
      expect(stats.median).toBeGreaterThanOrEqual(1);
      expect(stats.median).toBeLessThanOrEqual(6);
    });

    test('should calculate statistics for multiple dice', () => {
      const expression = parser.parse('2d6');
      const stats = calculator.calculate(expression, 1000);

      // Should be within reasonable range for 2d6
      expect(stats.min).toBeGreaterThanOrEqual(2);
      expect(stats.max).toBeLessThanOrEqual(12);
      expect(stats.mean).toBeGreaterThan(5);
      expect(stats.mean).toBeLessThan(9);
    });

    test('should include modifier in calculations', () => {
      const expression = parser.parse('1d6+3');
      const stats = calculator.calculate(expression, 1000);

      // Should be within reasonable range for 1d6+3
      expect(stats.min).toBeGreaterThanOrEqual(4);
      expect(stats.max).toBeLessThanOrEqual(9);
      expect(stats.mean).toBeGreaterThan(5);
      expect(stats.mean).toBeLessThan(8);
    });

    test('should handle negative modifiers', () => {
      const expression = parser.parse('1d6-2');
      const stats = calculator.calculate(expression, 1000);

      // Should be within reasonable range for 1d6-2
      expect(stats.min).toBeGreaterThanOrEqual(-1);
      expect(stats.max).toBeLessThanOrEqual(4);
    });

    test('should handle calculator instantiation', () => {
      expect(calculator).toBeDefined();
      expect(typeof calculator.calculate).toBe('function');
    });
  });
});
