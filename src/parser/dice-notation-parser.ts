import { DiceExpression, DiceTerm } from '../types.js';

export class DiceNotationParser {
  parse(notation: string): DiceExpression {
    const terms: DiceTerm[] = [];
    let modifier = 0;

    // Sanitize and split the notation by operators, keeping them.
    const parts = notation.replace(/\s/g, '').split(/([+-])/).filter(p => p);

    let currentOperator = '+';

    for (const part of parts) {
      if (part === '+' || part === '-') {
        currentOperator = part;
        continue;
      }

      const diceMatch = part.match(/^(\d+)?d(\d+|%|F)(?:(kh|kl|dh|dl)(\d+))?(?:r(\d+))?(!)?(?:>(\d+))?$/i);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
        const sizeStr = diceMatch[2].toLowerCase();
        let size: number;
        if (sizeStr === '%') {
          size = 100;
        } else if (sizeStr === 'f') {
          size = 3; // Fudge dice are handled as d3 for now
        } else {
          size = parseInt(sizeStr, 10);
        }

        const term: DiceTerm = { count: currentOperator === '-' ? -count : count, size };

        const keepDrop = diceMatch[3];
        const keepDropCount = diceMatch[4] ? parseInt(diceMatch[4], 10) : 1;
        if (keepDrop) {
          const type = keepDrop.substring(0, 1).toLowerCase() as 'k' | 'd';
          const dir = keepDrop.substring(1, 2).toLowerCase() as 'h' | 'l';
          if (type === 'k') {
            term.keep = { type: dir, count: keepDropCount };
          } else {
            term.drop = { type: dir, count: keepDropCount };
          }
        }

        if (diceMatch[5]) {
          term.reroll = [parseInt(diceMatch[5], 10)];
        }

        if (diceMatch[6]) {
          term.explode = true;
        }

        if (diceMatch[7]) {
          term.success = parseInt(diceMatch[7], 10);
        }

        terms.push(term);
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          modifier += currentOperator === '-' ? -num : num;
        }
      }
    }

    return { dice: terms, modifier };
  }
}