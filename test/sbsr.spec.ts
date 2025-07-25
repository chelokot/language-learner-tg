import { describe, it, expect } from 'vitest';
import { calcNextSlot, updateScore } from '../src/services/sbsr.js';

// TDD: initial test for core SBSR functions

describe('updateScore', () => {
  it('increases score when correct', () => {
    expect(updateScore(1, true)).toBeCloseTo(1.5);
  });

  it('decreases score when incorrect', () => {
    expect(updateScore(2, false)).toBeCloseTo(2 / 1.5);
  });

  it('never goes below one', () => {
    expect(updateScore(1, false)).toBe(1);
  });
});

describe('calcNextSlot', () => {
  it('returns floor(position + score)', () => {
    expect(calcNextSlot(0, 1.5, new Set())).toBe(1);
  });

  it('resolves collisions by incrementing', () => {
    const occupied = new Set([2, 3]);
    expect(calcNextSlot(1, 2.1, occupied)).toBe(4);
  });
});
