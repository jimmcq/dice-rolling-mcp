

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

// Structured content types for OpenAI Apps SDK integration
export interface DiceRollStructuredContent {
  notation: string;
  label?: string;
  total: number;
  rolls: DieRoll[];
  timestamp: string;
  breakdown: string;
  critical?: {
    type: 'success' | 'fail';
    naturalRoll: number;
  };
  modifier?: number;
}

export interface DiceValidationStructuredContent {
  notation: string;
  valid: boolean;
  expression?: DiceExpression;
  error?: string;
  breakdown?: {
    dice: Array<{
      count: number;
      size: number;
      modifiers: string[];
    }>;
    modifier: number;
  };
}

export interface SearchResultStructuredContent {
  query: string;
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    relevance: number;
  }>;
  totalResults: number;
}

export interface FetchContentStructuredContent {
  id: string;
  title: string;
  content: string;
  metadata?: {
    category?: string;
    tags?: string[];
    lastUpdated?: string;
  };
}
