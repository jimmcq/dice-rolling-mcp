import { DiceExpression, RollResult, DieRoll } from '../types.js';
import { randomInt } from 'crypto';

export class DiceRoller {
  roll(notation: string, expression: DiceExpression): RollResult {
    let total = expression.modifier;
    const allRolls: DieRoll[] = [];
    let breakdown = '';

    for (const term of expression.dice) {
      const termRolls: DieRoll[] = [];
      const isNegative = term.count < 0;
      const count = Math.abs(term.count);

      for (let i = 0; i < count; i++) {
        let roll = randomInt(1, term.size + 1);
        if (term.size === 1 && term.count === 1) {
          // Fudge dice
          roll = roll === 1 ? -1 : roll === 2 ? 0 : 1;
        }
        const die: DieRoll = { size: term.size, result: roll };

        // Reroll mechanic: if the die shows a value in the reroll list, reroll it once
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
            termRolls.push({
              size: term.size,
              result: explodedRoll,
              exploded: true,
            });
          } while (explodedRoll === term.size);
        }
      }

      if (term.keep) {
        // Sort highest to lowest first
        termRolls.sort(
          (a, b) =>
            (b.modified !== undefined ? b.modified : b.result) -
            (a.modified !== undefined ? a.modified : a.result)
        );

        let toKeep: DieRoll[];
        if (term.keep.type === 'h') {
          // Keep highest: take from the beginning (already sorted high to low)
          toKeep = termRolls.slice(0, term.keep.count);
        } else {
          // Keep lowest: take from the end (lowest values)
          toKeep = termRolls.slice(-term.keep.count);
        }

        for (const die of termRolls) {
          if (!toKeep.includes(die)) {
            die.dropped = true;
          }
        }
      } else if (term.drop) {
        // Sort highest to lowest first
        termRolls.sort(
          (a, b) =>
            (b.modified !== undefined ? b.modified : b.result) -
            (a.modified !== undefined ? a.modified : a.result)
        );

        let toDrop: DieRoll[];
        if (term.drop.type === 'h') {
          // Drop highest: take from the beginning (highest values)
          toDrop = termRolls.slice(0, term.drop.count);
        } else {
          // Drop lowest: take from the end (lowest values)
          toDrop = termRolls.slice(-term.drop.count);
        }

        for (const die of toDrop) {
          die.dropped = true;
        }
      }

      let termTotal = 0;
      const termBreakdown: string[] = [];
      let successes = 0;

      for (const die of termRolls) {
        const finalResult =
          die.modified !== undefined ? die.modified : die.result;
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
      breakdown +=
        expression.modifier > 0
          ? ` + ${expression.modifier}`
          : ` - ${Math.abs(expression.modifier)}`;
    }

    return {
      notation,
      total,
      rolls: allRolls,
      timestamp: new Date().toISOString(),
      breakdown,
    };
  }
}
