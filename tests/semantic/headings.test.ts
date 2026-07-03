import { describe, expect, it } from 'vitest';

import {
  evaluateHeadings,
  significantWordCount,
} from '../../src/semantic/headings.js';

const page = (body: string) => `<html><body>${body}</body></html>`;

describe('significantWordCount', () => {
  it('ignore les mots vides français et anglais', () => {
    expect(significantWordCount('Le guide de la comptabilité pour les PME')).toBe(3); // guide, comptabilité, pme
    expect(significantWordCount('How to use the tool')).toBe(2); // use, tool
  });

  it('ignore les mots de moins de 3 lettres', () => {
    expect(significantWordCount('IA et TVA en PME')).toBe(2); // tva, pme (ia = 2 lettres)
  });
});

describe('evaluateHeadings (sous-critère 2.1)', () => {
  it('hiérarchie idéale : 5/5', () => {
    const res = evaluateHeadings(
      page(
        '<h1>Guide complet comptabilité PME françaises</h1>' +
          '<h2>Choisir son expert comptable indépendant</h2>' +
          '<h3>Comparer les honoraires moyens constatés</h3>' +
          '<h2>Obligations légales déclaration TVA trimestrielle</h2>',
      ),
    );
    expect(res.points).toBe(5);
  });

  it('deux H1 : perd les 2 points du H1 unique', () => {
    const res = evaluateHeadings(page('<h1>Titre un</h1><h1>Titre deux</h1>'));
    expect(res.pointsH1).toBe(0);
    expect(res.h1Count).toBe(2);
  });

  it('saut H1 → H3 : perd les 2 points d\'absence de saut', () => {
    const res = evaluateHeadings(page('<h1>Titre</h1><h3>Sous-sous-titre</h3>'));
    expect(res.hasLevelSkip).toBe(true);
    expect(res.pointsNoSkip).toBe(0);
  });

  it('remonter de niveau (H3 → H2) n\'est pas un saut', () => {
    const res = evaluateHeadings(
      page('<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>'),
    );
    expect(res.hasLevelSkip).toBe(false);
  });

  it('titres courts : pas le point « mots significatifs »', () => {
    const res = evaluateHeadings(page('<h1>Accueil</h1><h2>Contact</h2>'));
    expect(res.pointsWordy).toBe(0);
  });

  it('point « mots significatifs » noté au prorata des titres', () => {
    const res = evaluateHeadings(
      page(
        '<h1>Guide complet comptabilité PME françaises</h1>' + // > 3 mots significatifs
          '<h2>Contact</h2>', // court
      ),
    );
    expect(res.pointsWordy).toBe(0.5); // 1 × (1/2)
    expect(res.points).toBe(4.5);
  });

  it('le prorata est arrondi à une décimale', () => {
    const res = evaluateHeadings(
      page(
        '<h1>Guide complet comptabilité PME françaises</h1>' +
          '<h2>Contact</h2><h2>Accueil</h2>',
      ),
    );
    expect(res.pointsWordy).toBe(0.3); // 1 × (1/3) arrondi
  });

  it('page sans aucun titre : 0/5', () => {
    const res = evaluateHeadings(page('<p>du texte</p>'));
    expect(res.points).toBe(0);
  });
});
