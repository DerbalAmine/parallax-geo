import { describe, expect, it } from 'vitest';

import { detectLanguage } from '../../src/core/language.js';

describe('detectLanguage', () => {
  it('détecte le français en code court', () => {
    expect(
      detectLanguage(
        'La conformité réglementaire des petites et moyennes entreprises françaises ' +
          'exige une veille constante sur les évolutions du droit européen et national.',
      ),
    ).toBe('fr');
  });

  it('détecte l\'anglais en code court', () => {
    expect(
      detectLanguage(
        'Regulatory compliance for small businesses requires constant monitoring ' +
          'of changes in European and national law, including data protection rules.',
      ),
    ).toBe('en');
  });

  it('rend indeterminee sur un texte trop court ou vide', () => {
    expect(detectLanguage('')).toBe('indeterminee');
    expect(detectLanguage('Bonjour et bienvenue.')).toBe('indeterminee');
  });
});
