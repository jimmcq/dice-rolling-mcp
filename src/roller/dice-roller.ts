import { DiceExpression, RollResult, DieRoll } from '../types.js';
import { randomInt } from 'crypto';

export class DiceRoller {
  roll(expression: DiceExpression): RollResult {
    let total = expression.modifier;
    const allRolls: DieRoll[] = [];
    let breakdown = '';

    for (const term of expression.dice) {
      let termRolls: DieRoll[] = [];
      const isNegative = term.count < 0;
      const count = Math.abs(term.count);

      for (let i = 0; i < count; i++) {
        let roll = randomInt(1, term.size + 1);
        const die: DieRoll = { size: term.size, result: roll };

        if (term.reroll && term.reroll.includes(roll)) {
          die.rerolled = true;
          roll = randomInt(1, term.size + 1);
          die.modified = roll;
        }

        termRolls.push(die);

        if (term.explode && roll === term.size) {
          let explodedRoll;
          do {
            explodedRoll = randomInt(1, term.size + 1);
            termRolls.push({ size: term.size, result: explodedRoll, exploded: true });
          } while (explodedRoll === term.size);
        }
      }

      if (term.keep) {
        termRolls.sort((a, b) => (b.modified !== undefined ? b.modified : b.result) - (a.modified !== undefined ? a.modified : a.result));
        if (term.keep.type === 'l') {
          termRolls.reverse();
        }
        const toKeep = termRolls.slice(0, term.keep.count);
        for (const die of termRolls) {
          if (!toKeep.includes(die)) {
            die.dropped = true;
          }
        }
      } else if (term.drop) {
        termRolls.sort((a, b) => (b.modified !== undefined ? b.modified : b.result) - (a.modified !== undefined ? a.modified : a.result));
        if (term.drop.type === 'h') {
          termRolls.reverse();
        }
        for (let i = 0; i < term.drop.count; i++) {
          termRolls[i].dropped = true;
        }
      }

      let termTotal = 0;
      const termBreakdown: string[] = [];
      let successes = 0;

      for (const die of termRolls) {
        const finalResult = die.modified !== undefined ? die.modified : die.result;
        if (!die.dropped) {
          if (term.success) {
            if (finalResult >= term.success) {
              successes++;
            }
          } else {
            termTotal += finalResult;
          }
        }
        termBreakdown.push(
          `${die.result}` +
          `${die.rerolled ? `(r${die.modified})` : ''}` +
          `${die.exploded ? '!' : ''}` +
          `${die.dropped ? 'd' : ''}`
        );
      }

      if (term.success) {
        termTotal = successes;
      }

      if (breakdown) breakdown += isNegative ? ' - ' : ' + ';
      breakdown += `${count}d${term.size}:[${termBreakdown.join(',')}]`;
      if (term.success) {
        breakdown += ` successes: ${termTotal}`;
      }

      total += isNegative ? -termTotal : termTotal;
      allRolls.push(...termRolls);
    }

    if (expression.modifier) {
      breakdown += expression.modifier > 0 ? ` + ${expression.modifier}` : ` - ${Math.abs(expression.modifier)}`;
    }

    return {
      notation: 'temp_notation', // will be replaced in the server
      total,
      rolls: allRolls,
      timestamp: new Date().toISOString(),
      breakdown,
    };
  }
}