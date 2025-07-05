# Dice Notation Guide

This MCP server supports comprehensive dice notation for tabletop gaming and RPGs.

## Basic Notation

- `1d20` - Roll one 20-sided die
- `3d6` - Roll three 6-sided dice  
- `2d10+5` - Roll two 10-sided dice and add 5
- `1d8-2` - Roll one 8-sided die and subtract 2

## Advantage and Disadvantage

**IMPORTANT**: For D&D 5e advantage/disadvantage, use these formats:

- `2d20kh1` - **Advantage** (roll 2d20, keep highest 1)
- `2d20kl1` - **Disadvantage** (roll 2d20, keep lowest 1)

❌ **Wrong**: `2d20` (this adds both dice together = 2-40 range)
✅ **Correct**: `2d20kh1` (this keeps only the higher die = 1-20 range)

## Keep and Drop Mechanics

- `4d6kh3` - Roll 4d6, keep highest 3 (common for D&D stats)
- `4d6kl3` - Roll 4d6, keep lowest 3
- `4d6dh1` - Roll 4d6, drop highest 1 (equivalent to kl3)
- `4d6dl1` - Roll 4d6, drop lowest 1 (equivalent to kh3)

## Special Dice

- `4dF` - Fudge dice (results: -1, 0, +1 each)
- `1d%` - Percentile die (1-100)
- `1d2` - Coin flip

## Advanced Mechanics

### Exploding Dice
- `3d6!` - Each 6 explodes (reroll and add)
- `1d10!` - Each 10 explodes

### Rerolls  
- `4d6r1` - Reroll any 1s (once each)
- `3d8r1,2` - Reroll any 1s or 2s

### Success Counting
- `5d10>7` - Count how many dice show 7 or higher
- `8d6>4` - Count successes on 4+

## Complex Examples

- `2d20kh1+5` - Advantage attack roll with +5 modifier
- `4d6kh3+2d8+3` - D&D damage: best 3 of 4d6, plus 2d8, plus 3
- `1d20+1d4-2` - Attack with guidance and -2 penalty

## Gaming Examples

### D&D 5e Combat
- Attack with advantage: `2d20kh1+7`
- Attack with disadvantage: `2d20kl1+7`  
- Fireball damage: `8d6`
- Sneak attack: `1d20+8` (attack) then `3d6+4d6` (damage + sneak)

### Character Creation
- Standard array: `4d6dl1` (repeat 6 times)
- Point buy alternative: `3d6` (repeat 6 times)

### Skill Checks
- Normal check: `1d20+3`
- With advantage: `2d20kh1+3`
- With guidance: `1d20+1d4+3`

## Quick Reference

| Situation | Notation | Example |
|-----------|----------|---------|
| Basic roll | `XdY` | `1d20`, `3d6` |
| With modifier | `XdY±Z` | `1d20+5`, `2d6-1` |
| Advantage | `2d20kh1` | `2d20kh1+7` |
| Disadvantage | `2d20kl1` | `2d20kl1+3` |
| Best of 4d6 | `4d6kh3` | `4d6kh3` |
| Exploding | `XdY!` | `3d6!`, `1d10!` |
| Reroll 1s | `XdYr1` | `4d6r1` |
| Count successes | `XdY>Z` | `5d10>7` |

## Validation

Use the `dice_validate` tool to check any notation:
- Input: `"2d20kh1+5"`  
- Output: Explains this means "2d20 (keep highest 1) + modifier: +5"

This helps ensure LLMs understand exactly what each notation does before rolling.