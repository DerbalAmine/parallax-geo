import { describe, expect, it } from 'vitest';

import {
  evaluateSourcedData,
  textWithLinkMarkers,
  LINK_MARKER,
} from '../../src/citability/sourced-data.js';

const page = (body: string) => `<html><body>${body}</body></html>`;
const BASE = 'https://exemple.fr/';

describe('textWithLinkMarkers', () => {
  it('marque les liens externes mais pas les liens internes', () => {
    const text = textWithLinkMarkers(
      page(
        '<a href="https://insee.fr/stats">INSEE</a> et <a href="/blog">notre blog</a>',
      ),
      BASE,
    );
    expect(text.split(LINK_MARKER)).toHaveLength(2);
    expect(text).toContain('notre blog');
  });
});

describe('evaluateSourcedData (sous-critère 3.2)', () => {
  it('compte un chiffre sourcé par « selon »', () => {
    const res = evaluateSourcedData(
      page('<p>Selon l\'INSEE, 42 % des PME françaises ont un site web.</p>'),
      BASE,
    );
    expect(res.sourcedDataPoints).toBeGreaterThanOrEqual(1);
    expect(res.points).toBeGreaterThan(0);
  });

  it('compte un chiffre proche d\'un lien externe', () => {
    const res = evaluateSourcedData(
      page('<p>Le marché pèse 3 milliards d\'euros <a href="https://etude.fr/x">(étude)</a>.</p>'),
      BASE,
    );
    expect(res.sourcedDataPoints).toBeGreaterThanOrEqual(1);
  });

  it('un chiffre sans source proche ne compte pas comme sourcé', () => {
    const res = evaluateSourcedData(
      page('<p>Nous avons 250 clients satisfaits dans toute la France.</p>'),
      BASE,
    );
    expect(res.dataPoints).toBeGreaterThanOrEqual(1);
    expect(res.sourcedDataPoints).toBe(0);
    expect(res.points).toBe(0);
  });

  it('la source doit être à moins de 100 caractères du chiffre', () => {
    const filler = 'mot '.repeat(60); // ≈ 240 caractères entre la source et le chiffre
    const res = evaluateSourcedData(
      page(`<p>Selon une étude récente. ${filler} Le taux atteint 42 %.</p>`),
      BASE,
    );
    expect(res.sourcedDataPoints).toBe(0);
  });

  it('plafonne à 7 points même à densité très élevée', () => {
    const res = evaluateSourcedData(
      page('<p>' + 'Selon l\'INSEE, 42 % en 2024. '.repeat(30) + '</p>'),
      BASE,
    );
    expect(res.points).toBe(7);
  });

  it('page vide : 0 point sans erreur', () => {
    expect(evaluateSourcedData(page(''), BASE).points).toBe(0);
  });
});
