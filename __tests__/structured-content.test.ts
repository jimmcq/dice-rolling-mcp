/**
 * Tests for structured content in tool responses
 * Note: We test the types and structure definitions here since
 * testing the actual server responses requires running the server
 */
import {
  DiceRollStructuredContent,
  DiceValidationStructuredContent,
  SearchResultStructuredContent,
  FetchContentStructuredContent,
} from '../src/types';
import { DiceRoller } from '../src/roller/dice-roller';
import { DiceNotationParser } from '../src/parser/dice-notation-parser';
import { searchContent, fetchContent } from '../src/shared/search-content';

describe('Structured Content Types', () => {
  describe('DiceRollStructuredContent', () => {
    it('should match the structure from a dice roll', () => {
      const roller = new DiceRoller();
      const parser = new DiceNotationParser();
      const expression = parser.parse('2d6+3');
      const result = roller.roll('2d6+3', expression);

      const structured: DiceRollStructuredContent = {
        notation: result.notation,
        label: 'Test Roll',
        total: result.total,
        rolls: result.rolls,
        timestamp: result.timestamp,
        breakdown: result.breakdown,
        modifier: expression.modifier !== 0 ? expression.modifier : undefined,
      };

      expect(structured.notation).toBe('2d6+3');
      expect(structured.label).toBe('Test Roll');
      expect(structured.total).toBeGreaterThanOrEqual(5);
      expect(structured.total).toBeLessThanOrEqual(15);
      expect(structured.rolls).toHaveLength(2);
      expect(structured.modifier).toBe(3);
    });

    it('should handle critical success/fail', () => {
      const structured: DiceRollStructuredContent = {
        notation: '1d20+5',
        total: 25,
        rolls: [{ size: 20, result: 20 }],
        timestamp: new Date().toISOString(),
        breakdown: '[20]+5',
        critical: {
          type: 'success',
          naturalRoll: 20,
        },
        modifier: 5,
      };

      expect(structured.critical).toBeDefined();
      expect(structured.critical?.type).toBe('success');
      expect(structured.critical?.naturalRoll).toBe(20);
    });
  });

  describe('DiceValidationStructuredContent', () => {
    it('should structure valid notation data', () => {
      const parser = new DiceNotationParser();
      const expression = parser.parse('2d20kh1+5');

      const structured: DiceValidationStructuredContent = {
        notation: '2d20kh1+5',
        valid: true,
        expression,
        breakdown: {
          dice: expression.dice.map(die => ({
            count: Math.abs(die.count),
            size: die.size,
            modifiers: die.keep
              ? [
                  `keep ${die.keep.type === 'h' ? 'highest' : 'lowest'} ${die.keep.count}`,
                ]
              : [],
          })),
          modifier: expression.modifier,
        },
      };

      expect(structured.valid).toBe(true);
      expect(structured.expression?.dice).toHaveLength(1);
      expect(structured.breakdown?.dice[0].count).toBe(2);
      expect(structured.breakdown?.dice[0].size).toBe(20);
      expect(structured.breakdown?.dice[0].modifiers).toContain(
        'keep highest 1'
      );
      expect(structured.breakdown?.modifier).toBe(5);
    });

    it('should structure invalid notation data', () => {
      const structured: DiceValidationStructuredContent = {
        notation: 'invalid',
        valid: false,
        error: 'Invalid dice notation',
      };

      expect(structured.valid).toBe(false);
      expect(structured.error).toBeTruthy();
      expect(structured.expression).toBeUndefined();
    });
  });

  describe('SearchResultStructuredContent', () => {
    it('should structure search results', () => {
      const results = searchContent('advantage');

      const structured: SearchResultStructuredContent = {
        query: 'advantage',
        results: results.map((r, index) => ({
          id: r.id,
          title: r.title,
          snippet: r.url,
          relevance: 1.0 - index * 0.1,
        })),
        totalResults: results.length,
      };

      expect(structured.query).toBe('advantage');
      expect(structured.results).toBeDefined();
      expect(structured.totalResults).toBeGreaterThan(0);

      if (structured.results.length > 0) {
        const firstResult = structured.results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('snippet');
        expect(firstResult.relevance).toBeGreaterThan(0);
        expect(firstResult.relevance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('FetchContentStructuredContent', () => {
    it('should structure fetched content', () => {
      const document = fetchContent('basic-notation');

      const structured: FetchContentStructuredContent = {
        id: document.id,
        title: document.title,
        content: document.text,
        metadata: {
          category: document.metadata.category,
          tags: [document.metadata.type, document.metadata.source],
          lastUpdated: new Date().toISOString(),
        },
      };

      expect(structured.id).toBe('basic-notation');
      expect(structured.title).toBeTruthy();
      expect(structured.content).toBeTruthy();
      expect(structured.metadata).toBeDefined();
      expect(structured.metadata?.category).toBeTruthy();
      expect(structured.metadata?.tags).toBeDefined();
      expect(structured.metadata?.tags?.length).toBeGreaterThan(0);
      expect(structured.metadata?.lastUpdated).toBeTruthy();
    });
  });
});
