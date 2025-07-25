export function updateScore(score: number, correct: boolean, multiplier = 1.5): number {
  const updated = correct ? score * multiplier : score / multiplier;
  return updated < 1 ? 1 : updated;
}

export function calcNextSlot(position: number, score: number, occupied: Set<number>): number {
  let slot = Math.floor(position + score);
  while (occupied.has(slot)) {
    slot += 1;
  }
  return slot;
}
