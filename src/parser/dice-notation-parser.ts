import { DiceExpression, DiceTerm } from '../types.js';

export class DiceNotationParser {
  parse(notation: string): DiceExpression {
    // Basic validation
    if (!notation || typeof notation !== 'string') {
      throw new Error('Dice notation cannot be empty');
    }

    const cleanNotation = notation.trim();
    if (!cleanNotation) {
      throw new Error('Dice notation cannot be empty');
    }

    // Check for basic dice pattern - must contain at least one die
    if (!/\d*d(\d+|%|F)/i.test(cleanNotation)) {
      throw new Error('Invalid dice notation - must contain at least one die (e.g., "d6", "2d20")');
    }

    const terms: DiceTerm[] = [];
    let modifier = 0;

    // Sanitize and split the notation by operators, keeping them.
    const parts = cleanNotation.replace(/\s/g, '').split(/([+-])/).filter(p => p);

    let currentOperator = '+';
    let hasValidDice = false;

    for (const part of parts) {
      if (part === '+' || part === '-') {
        currentOperator = part;
        continue;
      }

      const diceMatch = part.match(/^(\d+)?d(\d+|%|F)(?:(kh|kl|dh|dl)(\d+))?(?:r(\d+))?(!)?(?:>(\d+))?$/i);
      if (diceMatch) {
        hasValidDice = true;
        const countStr = diceMatch[1];
        const count = countStr ? parseInt(countStr, 10) : 1;
        const sizeStr = diceMatch[2].toLowerCase();
        let size: number;
        
        if (sizeStr === '%') {
          size = 100;
        } else if (sizeStr === 'f') {
          size = 1; // Fudge dice are handled as d1, with results -1, 0, 1
        } else {
          size = parseInt(sizeStr, 10);
        }

        // Validate dice parameters
        if (count <= 0) {
          throw new Error(`Invalid dice count: ${count}. Must be positive.`);
        }
        if (count > 1000) {
          throw new Error(`Too many dice: ${count}. Maximum is 1000.`);
        }
        if (size <= 0) {
          throw new Error(`Invalid die size: ${size}. Must be positive.`);
        }
        if (size > 10000) {
          throw new Error(`Die size too large: ${size}. Maximum is 10000.`);
        }

        // Additional safety check for extreme combinations
        if (count * size > 100000) {
          throw new Error(`Dice combination too large: ${count}d${size}. Risk of excessive computation.`);
        }

        const term: DiceTerm = { count: currentOperator === '-' ? -count : count, size };

        const keepDrop = diceMatch[3];
        const keepDropCount = diceMatch[4] ? parseInt(diceMatch[4], 10) : 1;
        if (keepDrop) {
          const type = keepDrop.substring(0, 1).toLowerCase() as 'k' | 'd';
          const dir = keepDrop.substring(1, 2).toLowerCase() as 'h' | 'l';
          
          // Validate keep/drop count
          if (keepDropCount <= 0) {
            throw new Error(`Invalid ${type === 'k' ? 'keep' : 'drop'} count: ${keepDropCount}. Must be positive.`);
          }
          if (keepDropCount >= Math.abs(count)) {
            throw new Error(`Cannot ${type === 'k' ? 'keep' : 'drop'} ${keepDropCount} dice from ${Math.abs(count)} dice.`);
          }
          
          if (type === 'k') {
            term.keep = { type: dir, count: keepDropCount };
          } else {
            term.drop = { type: dir, count: keepDropCount };
          }
        }

        if (diceMatch[5]) {
          const rerollValue = parseInt(diceMatch[5], 10);
          if (rerollValue <= 0 || rerollValue > size) {
            throw new Error(`Invalid reroll value: ${rerollValue}. Must be between 1 and ${size}.`);
          }
          term.reroll = [rerollValue];
        }

        if (diceMatch[6]) {
          term.explode = true;
        }

        if (diceMatch[7]) {
          const successValue = parseInt(diceMatch[7], 10);
          if (successValue <= 0 || successValue > size) {
            throw new Error(`Invalid success threshold: ${successValue}. Must be between 1 and ${size}.`);
          }
          term.success = successValue;
        }

        terms.push(term);
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          modifier += currentOperator === '-' ? -num : num;
        } else {
          throw new Error(`Invalid notation part: "${part}". Expected dice notation or number.`);
        }
      }
    }

    if (!hasValidDice) {
      throw new Error('No valid dice found in notation');
    }

    return { dice: terms, modifier };
  }
}