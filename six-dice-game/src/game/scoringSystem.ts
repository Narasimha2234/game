/**
 * Scoring system for the six-dice game.
 * Designed to be extensible — add new rule sets by implementing RuleSet.
 */

export interface ScoreBreakdown {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown[];
  /** Human-readable result label e.g. "Three of a Kind!" */
  resultLabel: string;
  /** CSS color key for result label */
  resultColor: 'default' | 'success' | 'warning' | 'accent';
}

// ──────────────────────────────────────────────────────────────────────────────
// Pattern detection helpers
// ──────────────────────────────────────────────────────────────────────────────

function frequencyMap(dice: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of dice) map.set(d, (map.get(d) ?? 0) + 1);
  return map;
}

function maxFrequency(freq: Map<number, number>): number {
  return Math.max(...freq.values());
}

function isStraight(sorted: number[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main scoring function
// ──────────────────────────────────────────────────────────────────────────────

export function calculateScore(dice: number[]): ScoreResult {
  const total = dice.reduce((s, d) => s + d, 0);
  const freq = frequencyMap(dice);
  const maxFreq = maxFrequency(freq);
  const sorted = [...dice].sort((a, b) => a - b);
  const breakdown: ScoreBreakdown[] = dice.map((v, i) => ({
    label: `Die ${i + 1}`,
    value: v,
  }));

  let resultLabel = '';
  let resultColor: ScoreResult['resultColor'] = 'default';

  // Pattern recognition (best pattern wins label)
  if (maxFreq === 6) {
    resultLabel = '🎰 HEXTUPLES!';
    resultColor = 'success';
  } else if (maxFreq === 5) {
    resultLabel = '⭐ Five of a Kind!';
    resultColor = 'success';
  } else if (maxFreq === 4) {
    resultLabel = 'Four of a Kind!';
    resultColor = 'accent';
  } else if (maxFreq === 3 && freq.size === 2) {
    resultLabel = 'Full House!';
    resultColor = 'accent';
  } else if (isStraight(sorted)) {
    resultLabel = '🔥 Straight!';
    resultColor = 'success';
  } else if (maxFreq === 3) {
    resultLabel = 'Three of a Kind';
    resultColor = 'warning';
  } else if ([...freq.values()].filter(v => v === 2).length === 2) {
    resultLabel = 'Two Pairs';
    resultColor = 'default';
  } else if (maxFreq === 2) {
    resultLabel = 'One Pair';
    resultColor = 'default';
  } else {
    resultLabel = total >= 28 ? 'High Roll!' : 'No Pattern';
    resultColor = total >= 28 ? 'warning' : 'default';
  }

  return { total, breakdown, resultLabel, resultColor };
}
