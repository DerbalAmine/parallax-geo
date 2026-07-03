import { describe, expect, it } from 'vitest';

import {
  evaluateFreshness,
  parseFrenchDate,
} from '../../src/citability/freshness.js';

const page = (head: string, body = '') =>
  `<html><head>${head}</head><body>${body}</body></html>`;

const NOW = new Date('2026-07-03T12:00:00Z');

describe('parseFrenchDate', () => {
  it('parse « 12 mars 2024 » et « 1er août 2025 »', () => {
    expect(parseFrenchDate('12 mars 2024')?.toISOString().slice(0, 10)).toBe('2024-03-12');
    expect(parseFrenchDate('1er août 2025')?.toISOString().slice(0, 10)).toBe('2025-08-01');
  });

  it('parse le format numérique 03/02/2026 (jour/mois/année)', () => {
    expect(parseFrenchDate('03/02/2026')?.toISOString().slice(0, 10)).toBe('2026-02-03');
  });

  it('retourne null sans date', () => {
    expect(parseFrenchDate('pas de date ici')).toBeNull();
  });
});

describe('evaluateFreshness (sous-critère 3.4)', () => {
  it('moins de 6 mois via article:modified_time : 5 points', () => {
    const res = evaluateFreshness(
      page('<meta property="article:modified_time" content="2026-05-01T00:00:00Z">'),
      NOW,
    );
    expect(res.points).toBe(5);
  });

  it('entre 6 et 12 mois : 3 points', () => {
    const res = evaluateFreshness(
      page('<meta property="article:modified_time" content="2025-10-01T00:00:00Z">'),
      NOW,
    );
    expect(res.points).toBe(3);
  });

  it('plus de 12 mois : 0 point', () => {
    const res = evaluateFreshness(
      page('<meta property="article:modified_time" content="2024-01-01T00:00:00Z">'),
      NOW,
    );
    expect(res.points).toBe(0);
  });

  it('date absente : 0 point', () => {
    expect(evaluateFreshness(page(''), NOW).points).toBe(0);
  });

  it('détecte la balise <time datetime>', () => {
    const res = evaluateFreshness(
      page('', '<time datetime="2026-06-15">15 juin 2026</time>'),
      NOW,
    );
    expect(res.points).toBe(5);
    expect(res.source).toBe('balise <time>');
  });

  it('détecte le pattern texte « mis à jour le »', () => {
    const res = evaluateFreshness(
      page('', '<p>Article mis à jour le 20 juin 2026 par la rédaction.</p>'),
      NOW,
    );
    expect(res.points).toBe(5);
  });

  it('retient la date la plus récente quand il y en a plusieurs', () => {
    const res = evaluateFreshness(
      page(
        '<meta property="article:published_time" content="2023-01-01T00:00:00Z">',
        '<time datetime="2026-06-01">juin 2026</time>',
      ),
      NOW,
    );
    expect(res.points).toBe(5);
    expect(res.date?.toISOString().slice(0, 10)).toBe('2026-06-01');
  });
});
