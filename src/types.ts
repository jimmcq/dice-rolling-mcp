

export interface RollResult {
  notation: string;
  label?: string;
  total: number;
  rolls: DieRoll[];
  timestamp: string;
  breakdown: string;
}

export interface DieRoll {
  size: number;
  result: number;
  modified?: number;
  dropped?: boolean;
  exploded?: boolean;
  rerolled?: boolean;
}

export interface Statistics {
  notation: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  probabilities: { [value: number]: number };
  percentiles: { [percentile: number]: number };
}

export interface DiceRollerConfig {
  maxDice: number;
  maxSides: number;
  maxIterations: number;
  historySizeLimit: number;
  enableMacros: boolean;
  enableStatistics: boolean;
  randomSource: 'crypto' | 'math';
}

export interface DiceExpression {
  dice: DiceTerm[];
  modifier: number;
}

export interface DiceTerm {
  count: number;
  size: number;
  fudge?: boolean;
  explode?: boolean;
  reroll?: number[]; // reroll if in value
  keep?: { type: 'h' | 'l'; count: number };
  drop?: { type: 'h' | 'l'; count: number };
  success?: number; // success if >= value
}
