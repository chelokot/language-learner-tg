import { describe, it, expect } from 'vitest';
import { computePriority, compareByPriority } from '../src/services/scheduler.js';

describe('scheduler priority', () => {
  it('prioritizes higher error rate strongly', () => {
    const lowErr = { score: 5, correct_count: 10, wrong_count: 1 };
    const highErr = { score: 1, correct_count: 1, wrong_count: 5 };
    expect(computePriority(highErr)).toBeGreaterThan(computePriority(lowErr));
  });

  it('prefers lower score when errors equal', () => {
    const a = { score: 5, correct_count: 3, wrong_count: 2 };
    const b = { score: 1, correct_count: 3, wrong_count: 2 };
    const arr = [a, b].sort(compareByPriority);
    expect(arr[0]).toBe(b);
  });

  it('handles new items without attempts gracefully', () => {
    const fresh = { score: 0, correct_count: 0, wrong_count: 0 };
    const seen = { score: 0, correct_count: 1, wrong_count: 0 };
    expect(computePriority(fresh)).toBeCloseTo(1); // 0 + 1/(0+1)
    expect(computePriority(seen)).toBeLessThanOrEqual(computePriority(fresh));
  });
});
