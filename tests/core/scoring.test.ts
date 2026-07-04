import { describe, expect, it } from 'vitest';

import { applyPlafond, computeScore, niveau } from '../../src/core/scoring.js';
import type { CritereDetail, PilierId, PilierResult } from '../../src/core/types.js';
import { PILIER_MAX } from '../../src/core/types.js';

function detail(partial: Partial<CritereDetail> & { critere: string }): CritereDetail {
  return {
    points_obtenus: 0,
    points_max: 5,
    methode: 'méthode de test',
    preuve: 'preuve de test',
    ...partial,
  };
}

function piliers(
  overrides: Partial<Record<PilierId, CritereDetail[]>>,
): Record<PilierId, PilierResult> {
  const result = {} as Record<PilierId, PilierResult>;
  for (const id of Object.keys(PILIER_MAX) as PilierId[]) {
    const details = overrides[id] ?? [];
    const score = details
      .filter((d) => d.statut !== 'non_teste')
      .reduce((s, d) => s + d.points_obtenus, 0);
    result[id] = { score, max: PILIER_MAX[id], details };
  }
  return result;
}

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

describe('computeScore', () => {
  it('normalise le score sur les points testés uniquement', () => {
    const p = piliers({
      accessibilite_ia: [
        detail({ critere: '1.1 Robots.txt', points_obtenus: 8, points_max: 8 }),
        detail({ critere: '1.2 llms.txt', points_obtenus: 5, points_max: 5 }),
        detail({ critere: '1.3 Sans JS', points_obtenus: 7, points_max: 7 }),
      ],
      citabilite_contenu: [
        detail({
          critere: '3.1 Réponses directes',
          points_max: 7,
          preuve: 'Non testé : flag --with-claude non passé',
          statut: 'non_teste',
        }),
        detail({ critere: '3.2 Chiffres sourcés', points_obtenus: 3.5, points_max: 7 }),
      ],
    });
    const score = computeScore(p);
    // Testé : 20 + 3.5 = 23.5 sur 20 + 7 = 27 ⇒ 87 %.
    expect(score.score_brut).toBe(23.5);
    expect(score.score_max_teste).toBe(27);
    expect(score.score_global).toBe(87);
    expect(score.niveau).toBe('vert');
    expect(score.plafond_applique).toBe(false);
  });

  it('liste les critères non testés à part, avec la raison sans préfixe', () => {
    const p = piliers({
      accessibilite_ia: [
        detail({ critere: '1.1 Robots.txt', points_obtenus: 8, points_max: 8 }),
      ],
      citabilite_contenu: [
        detail({
          critere: '3.1 Réponses directes',
          points_max: 7,
          preuve: 'Non testé : flag --with-claude non passé',
          statut: 'non_teste',
        }),
      ],
    });
    const score = computeScore(p);
    expect(score.criteres_non_testes).toEqual([
      {
        pilier: 'citabilite_contenu',
        critere: '3.1 Réponses directes',
        raison: 'flag --with-claude non passé',
      },
    ]);
    expect(score.score_max_teste).toBe(8);
  });

  it('exclut entièrement le Pilier 5 : ni score de préparation, ni non testés', () => {
    const p = piliers({
      accessibilite_ia: [
        detail({ critere: '1.1 Robots.txt', points_obtenus: 4, points_max: 8 }),
      ],
      visibilite_mesuree: [
        detail({ critere: '5.1 Taux de citation', points_obtenus: 15, points_max: 15 }),
      ],
    });
    const score = computeScore(p);
    // 4/8 seulement : les 15 points du Pilier 5 n'entrent pas dans le calcul.
    expect(score.score_brut).toBe(4);
    expect(score.score_max_teste).toBe(8);
    expect(score.criteres_non_testes).toEqual([]);
  });

  it('applique le plafond à 40 quand le Pilier 1 est sous 10/20', () => {
    const p = piliers({
      accessibilite_ia: [
        detail({ critere: '1.1 Robots.txt', points_obtenus: 4, points_max: 8 }),
        detail({ critere: '1.2 llms.txt', points_obtenus: 0, points_max: 5 }),
        detail({ critere: '1.3 Sans JS', points_obtenus: 4, points_max: 7 }),
      ],
      structure_semantique: [
        detail({ critere: '2.1 Hn', points_obtenus: 20, points_max: 20 }),
      ],
      citabilite_contenu: [
        detail({ critere: '3.2 Chiffres', points_obtenus: 25, points_max: 25 }),
      ],
    });
    const score = computeScore(p);
    // Brut 53/65 ⇒ 81.5, mais Pilier 1 à 8/20 ⇒ plafonné à 40 (jaune).
    expect(score.plafond_applique).toBe(true);
    expect(score.score_global).toBe(40);
    expect(score.niveau).toBe('jaune');
  });

  it('évalue le plafond au prorata quand un critère du Pilier 1 est non testé', () => {
    const p = piliers({
      accessibilite_ia: [
        detail({ critere: '1.1 Robots.txt', points_obtenus: 8, points_max: 8 }),
        detail({ critere: '1.2 llms.txt', points_obtenus: 0, points_max: 5 }),
        detail({
          critere: '1.3 Sans JS',
          points_max: 7,
          preuve: 'Non testé : navigateur Playwright non installé',
          statut: 'non_teste',
        }),
      ],
      structure_semantique: [
        detail({ critere: '2.1 Hn', points_obtenus: 20, points_max: 20 }),
      ],
    });
    // Pilier 1 testé : 8/13 ⇒ 12.3/20, au-dessus du seuil ⇒ pas de plafond.
    const score = computeScore(p);
    expect(score.plafond_applique).toBe(false);
  });

  it('rend 0 rouge sans plafond quand aucun critère n\'est testé', () => {
    const score = computeScore(piliers({}));
    expect(score.score_global).toBe(0);
    expect(score.score_max_teste).toBe(0);
    expect(score.niveau).toBe('rouge');
    expect(score.plafond_applique).toBe(false);
  });
});
