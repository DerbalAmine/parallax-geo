import { describe, expect, it } from 'vitest';

import { buildRecommandations } from '../../src/core/recommendations.js';
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
    result[id] = { score: 0, max: PILIER_MAX[id], details: overrides[id] ?? [] };
  }
  return result;
}

describe('buildRecommandations', () => {
  it('trie par points manquants décroissants et mappe la priorité', () => {
    const recos = buildRecommandations(
      piliers({
        accessibilite_ia: [
          detail({ critere: '1.2 Présence d\'un fichier llms.txt', points_obtenus: 0, points_max: 5 }),
        ],
        citabilite_contenu: [
          detail({ critere: '3.4 Fraîcheur du contenu', points_obtenus: 3, points_max: 5 }),
        ],
        structure_semantique: [
          detail({ critere: '2.3 Meta et Open Graph', points_obtenus: 2, points_max: 3 }),
        ],
      }),
    );
    expect(recos.map((r) => r.critere)).toEqual([
      '1.2 Présence d\'un fichier llms.txt',
      '3.4 Fraîcheur du contenu',
      '2.3 Meta et Open Graph',
    ]);
    expect(recos.map((r) => r.priorite)).toEqual(['haute', 'moyenne', 'basse']);
    // L'action vient de la table par numéro de critère et affiche le manque.
    expect(recos[0]?.action).toContain('llms.txt');
    expect(recos[0]?.action).toContain('(+5 pts possibles)');
  });

  it('ignore les critères non testés et ceux au score plein', () => {
    const recos = buildRecommandations(
      piliers({
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
      }),
    );
    expect(recos).toEqual([]);
  });

  it('fournit une action générique si le critère est inconnu de la table', () => {
    const recos = buildRecommandations(
      piliers({
        accessibilite_ia: [
          detail({ critere: '9.9 Critère expérimental', points_obtenus: 1, points_max: 4 }),
        ],
      }),
    );
    expect(recos[0]?.action).toContain('Améliorez « 9.9 Critère expérimental »');
    expect(recos[0]?.priorite).toBe('moyenne');
  });
});
