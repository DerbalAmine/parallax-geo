import { describe, expect, it } from 'vitest';

import { scoreNoJs } from '../../src/accessibility/nojs.js';

describe('scoreNoJs (barème du sous-critère 1.3)', () => {
  it('ratio > 0.8 : 7 points', () => {
    expect(scoreNoJs(900, 1000).points).toBe(7);
  });

  it('ratio exactement 0.8 : 4 points (le barème exige strictement > 0.8)', () => {
    expect(scoreNoJs(800, 1000).points).toBe(4);
  });

  it('ratio entre 0.4 et 0.8 : 4 points', () => {
    expect(scoreNoJs(500, 1000).points).toBe(4);
    expect(scoreNoJs(400, 1000).points).toBe(4);
  });

  it('ratio < 0.4 (SPA complète) : 0 point', () => {
    expect(scoreNoJs(100, 1000).points).toBe(0);
    expect(scoreNoJs(0, 1000).points).toBe(0);
  });

  it('texte identique avec et sans JS : ratio 1, 7 points', () => {
    const res = scoreNoJs(1000, 1000);
    expect(res.ratio).toBe(1);
    expect(res.points).toBe(7);
  });

  it('page sans texte rendu : ratio 1 (rien ne dépend de JS)', () => {
    expect(scoreNoJs(0, 0).points).toBe(7);
  });

  it('le ratio est plafonné à 1 même si le brut dépasse le rendu', () => {
    expect(scoreNoJs(1200, 1000).ratio).toBe(1);
  });
});
