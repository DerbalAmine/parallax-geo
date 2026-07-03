import { describe, expect, it } from 'vitest';

import {
  evaluateDefinitions,
  isDefinition,
} from '../../src/citability/definitions.js';

const page = (body: string) => `<html><body>${body}</body></html>`;

const DEF_LONGUE =
  'Le GEO est une discipline d\'optimisation qui vise à rendre un site web visible et citable par les grands modèles de langage génératifs.';

describe('isDefinition (sous-critère 3.3)', () => {
  it('accepte « X est un » avec plus de 15 mots', () => {
    expect(isDefinition(DEF_LONGUE)).toBe(true);
  });

  it('accepte « X désigne » et « X se définit comme »', () => {
    expect(
      isDefinition(
        'La parallaxe désigne le décalage de position apparent d\'un objet observé depuis plusieurs points de vue différents dans l\'espace.',
      ),
    ).toBe(true);
    expect(
      isDefinition(
        'Le SIRET se définit comme un identifiant numérique de quatorze chiffres attribué à chaque établissement d\'une entreprise française par l\'INSEE.',
      ),
    ).toBe(true);
  });

  it('rejette une phrase définitoire de 15 mots ou moins', () => {
    expect(isDefinition('Le GEO est une discipline récente.')).toBe(false);
  });

  it('rejette un pattern au milieu du paragraphe', () => {
    expect(
      isDefinition(
        'Nous accompagnons les PME depuis 2019 dans leurs projets. Le GEO est une discipline qui monte et nous en parlons souvent avec nos clients.',
      ),
    ).toBe(false);
  });
});

describe('evaluateDefinitions', () => {
  it('compte 1 point par définition, plafonné à 6', () => {
    const html = page(`<p>${DEF_LONGUE}</p>`.repeat(8));
    const res = evaluateDefinitions(html);
    expect(res.definitions).toBe(8);
    expect(res.points).toBe(6);
  });

  it('page sans définition : 0 point', () => {
    const res = evaluateDefinitions(page('<p>Contactez-nous vite !</p>'));
    expect(res.points).toBe(0);
  });

  it('fournit des exemples en preuve', () => {
    const res = evaluateDefinitions(page(`<p>${DEF_LONGUE}</p>`));
    expect(res.exemples[0]).toContain('Le GEO est une discipline');
  });
});
