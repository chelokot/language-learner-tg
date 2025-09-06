export type WordStats = {
  score?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
};

export function computePriority(stats: WordStats): number {
  const score = Math.max(0, stats.score ?? 0);
  const correct = Math.max(0, stats.correct_count ?? 0);
  const wrong = Math.max(0, stats.wrong_count ?? 0);
  const attempts = correct + wrong;
  const errorRate = wrong / (attempts + 1); // +1 to stabilize early items
  const scorePenalty = 1 / (score + 1);
  return 3 * errorRate + scorePenalty;
}

export function compareByPriority(a: WordStats, b: WordStats): number {
  return computePriority(b) - computePriority(a);
}

