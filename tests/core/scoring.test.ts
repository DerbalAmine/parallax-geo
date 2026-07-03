import { describe, expect, it } from 'vitest';

import { applyPlafond, niveau } from '../../src/core/scoring.js';

describe('niveau', () => {
  it('applique les seuils ComplyPME', () => {
    expect(niveau(70)).toBe('vert');
    expect(niveau(100)).toBe('vert');
    expect(niveau(69)).toBe('jaune');
    expect(niveau(40)).toBe('jaune');
    expect(niveau(39)).toBe('orange');
    expect(niveau(20)).toBe('orange');
    expect(niveau(19)).toBe('rouge');
    expect(niveau(0)).toBe('rouge');
  });
});

describe('applyPlafond', () => {
  it('plafonne à 40 si le Pilier 1 est sous 10/20', () => {
    const res = applyPlafond(85, 9);
    expect(res.score).toBe(40);
    expect(res.plafond_applique).toBe(true);
  });

  it('ne plafonne pas si le Pilier 1 atteint 10/20', () => {
    const res = applyPlafond(85, 10);
    expect(res.score).toBe(85);
    expect(res.plafond_applique).toBe(false);
  });

  it('un score déjà sous 40 reste inchangé mais le plafond est signalé', () => {
    const res = applyPlafond(25, 5);
    expect(res.score).toBe(25);
    expect(res.plafond_applique).toBe(true);
  });
});
