import { describe, expect, it } from 'vitest';

import { compact, detectBrand, levenshtein } from '../../src/visibility/brand.js';

const BRAND = 'ComplyPME';
const DOMAIN = 'complypme.fr';

describe('levenshtein / compact', () => {
  it('distance de base', () => {
    expect(levenshtein('complypme', 'complypme')).toBe(0);
    expect(levenshtein('complypme', 'complipme')).toBe(1);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('compact ignore accents, casse et séparateurs', () => {
    expect(compact('Comply-PME É')).toBe('complypmee');
  });
});

describe('detectBrand (regex + fuzzy + position)', () => {
  it('détecte la marque exacte', () => {
    const m = detectBrand('Je recommande ComplyPME pour cela.', BRAND, DOMAIN);
    expect(m).toEqual({ cited: true, via: 'marque', position: null });
  });

  it('détecte les variantes d\'écriture (espaces, tirets, casse)', () => {
    for (const variant of ['Comply PME', 'comply-pme', 'COMPLYPME']) {
      expect(detectBrand(`Essayez ${variant}.`, BRAND, DOMAIN).cited, variant).toBe(true);
    }
  });

  it('détecte le domaine complet et sa racine', () => {
    expect(detectBrand('Voir https://complypme.fr/tarifs', BRAND, DOMAIN).via).toBe('marque');
    expect(
      detectBrand('Voir le site respecte-rgpd.fr', 'AutreMarque', 'respecte-rgpd.fr').via,
    ).toBe('domaine');
  });

  it('fuzzy : tolère une faute de frappe proche', () => {
    const m = detectBrand('L\'outil Complypmé est pas mal.', BRAND, DOMAIN);
    expect(m.cited).toBe(true);
  });

  it('ne matche pas une marque absente ou trop éloignée', () => {
    expect(detectBrand('Utilisez LegalPlace ou Captain Contrat.', BRAND, DOMAIN).cited).toBe(false);
    expect(detectBrand('La compliance est importante.', BRAND, DOMAIN).cited).toBe(false);
  });

  it('extrait la position dans une liste numérotée', () => {
    const response = [
      'Voici les meilleurs outils :',
      '1. LegalPlace — généraliste',
      '2. ComplyPME — spécialisé PME',
      '3. Autre outil',
    ].join('\n');
    const m = detectBrand(response, BRAND, DOMAIN);
    expect(m.position).toBe(2);
  });

  it('extrait le rang dans une liste à puces', () => {
    const response = ['Options :', '- LegalPlace', '- Captain Contrat', '- ComplyPME'].join('\n');
    expect(detectBrand(response, BRAND, DOMAIN).position).toBe(3);
  });

  it('marque citée hors liste : position null', () => {
    const m = detectBrand('ComplyPME est une option.\n1. Autre\n2. Encore', BRAND, DOMAIN);
    expect(m.cited).toBe(true);
    expect(m.position).toBeNull();
  });
});
