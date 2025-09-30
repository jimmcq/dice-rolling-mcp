import {
  searchContent,
  fetchContent,
  searchableContent,
  contentLibrary,
} from '../src/shared/search-content';

describe('Search Content Module', () => {
  describe('searchContent', () => {
    test('throws error for empty query', () => {
      expect(() => searchContent('')).toThrow('Search query is required');
      expect(() => searchContent('   ')).toThrow('Search query is required');
    });

    test('searches by title', () => {
      const results = searchContent('advantage');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('advantage-disadvantage');
      expect(results[0].title).toBe('D&D Advantage and Disadvantage');
    });

    test('searches by content keywords', () => {
      const results = searchContent('2d20kh1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'advantage-disadvantage')).toBe(true);
    });

    test('searches by description', () => {
      const results = searchContent('fireball');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(r => r.id === 'spell-damage' || r.id === 'combat-examples')
      ).toBe(true);
    });

    test('returns multiple matches for broad search', () => {
      const results = searchContent('dice');
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    test('is case insensitive', () => {
      const lowerResults = searchContent('advantage');
      const upperResults = searchContent('ADVANTAGE');
      const mixedResults = searchContent('AdVaNtAgE');

      expect(lowerResults).toEqual(upperResults);
      expect(lowerResults).toEqual(mixedResults);
    });

    test('trims whitespace from query', () => {
      const results1 = searchContent('  advantage  ');
      const results2 = searchContent('advantage');
      expect(results1).toEqual(results2);
    });

    test('returns empty array for no matches', () => {
      const results = searchContent('nonexistentquery12345');
      expect(results).toEqual([]);
    });

    test('returns results with correct structure', () => {
      const results = searchContent('basic');
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('url');
        expect(typeof result.id).toBe('string');
        expect(typeof result.title).toBe('string');
        expect(typeof result.url).toBe('string');
      });
    });

    test('finds all expected content types', () => {
      // Test that all major content types are searchable
      const basicResults = searchContent('basic');
      const advantageResults = searchContent('advantage');
      const explodingResults = searchContent('exploding');
      const fudgeResults = searchContent('fudge');
      const combatResults = searchContent('combat');

      expect(basicResults.length).toBeGreaterThan(0);
      expect(advantageResults.length).toBeGreaterThan(0);
      expect(explodingResults.length).toBeGreaterThan(0);
      expect(fudgeResults.length).toBeGreaterThan(0);
      expect(combatResults.length).toBeGreaterThan(0);
    });
  });

  describe('fetchContent', () => {
    test('throws error for empty id', () => {
      expect(() => fetchContent('')).toThrow('ID is required for fetch');
      expect(() => fetchContent('   ')).toThrow('ID is required for fetch');
    });

    test('throws error for invalid id', () => {
      expect(() => fetchContent('invalid-id')).toThrow(
        'Content not found for ID: invalid-id'
      );
    });

    test('fetches basic notation content', () => {
      const doc = fetchContent('basic-notation');
      expect(doc.id).toBe('basic-notation');
      expect(doc.title).toBe('Basic Dice Notation');
      expect(doc.url).toBe('dice://guide/notation#basic');
      expect(doc.text).toContain('**XdY** format');
      expect(doc.metadata.source).toBe('dice-rolling-mcp');
      expect(doc.metadata.type).toBe('dice-notation-guide');
      expect(doc.metadata.category).toBe('mechanics');
    });

    test('fetches advantage-disadvantage content', () => {
      const doc = fetchContent('advantage-disadvantage');
      expect(doc.id).toBe('advantage-disadvantage');
      expect(doc.title).toBe('D&D Advantage and Disadvantage');
      expect(doc.text).toContain('2d20kh1');
      expect(doc.text).toContain('CRITICAL');
    });

    test('fetches combat examples content', () => {
      const doc = fetchContent('combat-examples');
      expect(doc.id).toBe('combat-examples');
      expect(doc.metadata.category).toBe('examples');
      expect(doc.text).toContain('Attack Roll');
    });

    test('returns correct structure for all content', () => {
      const ids = [
        'basic-notation',
        'advantage-disadvantage',
        'modifiers',
        'ability-scores',
        'exploding-dice',
        'rerolling',
        'percentile-dice',
        'fudge-dice',
        'success-counting',
        'combat-examples',
        'spell-damage',
        'skill-checks',
      ];

      ids.forEach(id => {
        const doc = fetchContent(id);
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('text');
        expect(doc).toHaveProperty('url');
        expect(doc).toHaveProperty('metadata');
        expect(doc.metadata).toHaveProperty('source');
        expect(doc.metadata).toHaveProperty('type');
        expect(doc.metadata).toHaveProperty('category');
      });
    });

    test('categorizes examples correctly', () => {
      const combatDoc = fetchContent('combat-examples');
      const spellDoc = fetchContent('spell-damage');
      const skillDoc = fetchContent('skill-checks');

      // IDs with 'example' substring are categorized as 'examples'
      expect(combatDoc.metadata.category).toBe('examples');
      expect(spellDoc.metadata.category).toBe('mechanics'); // 'spell-damage' doesn't contain 'example'
      expect(skillDoc.metadata.category).toBe('mechanics'); // 'skill-checks' doesn't contain 'example'
    });

    test('categorizes mechanics correctly', () => {
      const basicDoc = fetchContent('basic-notation');
      const advantageDoc = fetchContent('advantage-disadvantage');
      const explodingDoc = fetchContent('exploding-dice');

      expect(basicDoc.metadata.category).toBe('mechanics');
      expect(advantageDoc.metadata.category).toBe('mechanics');
      expect(explodingDoc.metadata.category).toBe('mechanics');
    });
  });

  describe('searchableContent array', () => {
    test('has expected number of items', () => {
      expect(searchableContent.length).toBe(12);
    });

    test('all items have required fields', () => {
      searchableContent.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('description');
      });
    });

    test('all ids are unique', () => {
      const ids = searchableContent.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all urls use dice:// protocol', () => {
      searchableContent.forEach(item => {
        expect(item.url).toMatch(/^dice:\/\//);
      });
    });
  });

  describe('contentLibrary object', () => {
    test('has content for all searchable items', () => {
      searchableContent.forEach(item => {
        expect(contentLibrary).toHaveProperty(item.id);
        expect(typeof contentLibrary[item.id]).toBe('string');
        expect(contentLibrary[item.id].length).toBeGreaterThan(0);
      });
    });

    test('all content is markdown formatted', () => {
      Object.values(contentLibrary).forEach(content => {
        // Check for markdown indicators
        const hasMarkdown =
          content.includes('#') ||
          content.includes('**') ||
          content.includes('`') ||
          content.includes('-');
        expect(hasMarkdown).toBe(true);
      });
    });

    test('advantage-disadvantage content has critical warning', () => {
      const content = contentLibrary['advantage-disadvantage'];
      expect(content).toContain('CRITICAL');
      expect(content).toContain('2d20kh1');
      expect(content).toContain('CORRECT');
      expect(content).toContain('WRONG');
    });

    test('basic-notation explains XdY format', () => {
      const content = contentLibrary['basic-notation'];
      expect(content).toContain('XdY');
      expect(content).toContain('1d20');
      expect(content).toContain('3d6');
    });

    test('exploding-dice explains mechanic', () => {
      const content = contentLibrary['exploding-dice'];
      expect(content).toContain('exploding');
      expect(content).toContain('maximum');
      expect(content).toContain('3d6!');
    });
  });

  describe('integration between search and fetch', () => {
    test('search results can be fetched', () => {
      const searchResults = searchContent('advantage');
      expect(searchResults.length).toBeGreaterThan(0);

      searchResults.forEach(result => {
        const doc = fetchContent(result.id);
        expect(doc.id).toBe(result.id);
        expect(doc.title).toBe(result.title);
        expect(doc.url).toBe(result.url);
      });
    });

    test('all searchable items can be fetched', () => {
      searchableContent.forEach(item => {
        expect(() => fetchContent(item.id)).not.toThrow();
      });
    });

    test('fetch returns richer data than search', () => {
      const searchResults = searchContent('basic');
      const searchResult = searchResults[0];

      expect(searchResult).toHaveProperty('id');
      expect(searchResult).toHaveProperty('title');
      expect(searchResult).toHaveProperty('url');
      expect(searchResult).not.toHaveProperty('text');
      expect(searchResult).not.toHaveProperty('metadata');

      const fetchResult = fetchContent(searchResult.id);
      expect(fetchResult).toHaveProperty('id');
      expect(fetchResult).toHaveProperty('title');
      expect(fetchResult).toHaveProperty('url');
      expect(fetchResult).toHaveProperty('text');
      expect(fetchResult).toHaveProperty('metadata');
    });
  });
});
