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

  it('téléphone, SIRET et code postal ne comptent pas comme data points', () => {
    const res = evaluateSourcedData(
      page(
        '<p>Contact : 01 42 33 44 55 — SIRET 978 400 893 00019 — 75011 Paris, ' +
          'selon nos mentions légales.</p>',
      ),
      BASE,
    );
    expect(res.dataPoints).toBe(0);
    expect(res.sourcedDataPoints).toBe(0);
  });

  it('un montant à 5 chiffres reste un data point (75000 €)', () => {
    const res = evaluateSourcedData(
      page('<p>Selon notre bilan, le budget atteint 75000 € cette année.</p>'),
      BASE,
    );
    expect(res.dataPoints).toBeGreaterThanOrEqual(1);
    expect(res.sourcedDataPoints).toBeGreaterThanOrEqual(1);
  });

  it('un lien social externe ne vaut pas source', () => {
    const res = evaluateSourcedData(
      page(
        '<p>Déjà 850 utilisateurs conquis <a href="https://www.linkedin.com/company/x">LinkedIn</a>.</p>',
      ),
      BASE,
    );
    expect(res.dataPoints).toBeGreaterThanOrEqual(1);
    expect(res.sourcedDataPoints).toBe(0);
  });

  it('plancher de densité : une page courte ne sature pas le critère', () => {
    // 1 chiffre sourcé sur ~10 mots : sans plancher la densité serait 100/1000
    // ⇒ 7/7 ; avec le plancher de 300 mots elle vaut ≈ 3.3.
    const res = evaluateSourcedData(
      page('<p>Selon l\'INSEE, 42 % des PME ont un site.</p>'),
      BASE,
    );
    expect(res.points).toBeGreaterThan(0);
    expect(res.points).toBeLessThan(7);
  });
});
