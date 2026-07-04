import { describe, expect, it } from 'vitest';

import { buildRapport } from '../../src/core/rapport.js';
import type { CritereDetail, PilierId, PilierResult } from '../../src/core/types.js';
import { PILIER_MAX } from '../../src/core/types.js';
import { renderMarkdown } from '../../src/cli/markdown.js';

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

const BASE = {
  url: 'https://exemple.fr/',
  auditedAt: new Date('2026-07-04T12:00:00Z'),
};

describe('buildRapport', () => {
  it('produit un rapport conforme au schéma de la grille', () => {
    const rapport = buildRapport({
      ...BASE,
      piliers: piliers({
        accessibilite_ia: [
          detail({ critere: '1.1 Robots.txt', points_obtenus: 8, points_max: 8 }),
          detail({ critere: '1.2 llms.txt', points_obtenus: 5, points_max: 5 }),
        ],
        visibilite_mesuree: [
          detail({
            critere: '5.1 Taux de citation sur panel de requêtes',
            points_max: 15,
            preuve: 'Non testé : flag --visibility non passé',
            statut: 'non_teste',
          }),
        ],
      }),
    });
    expect(rapport.url).toBe('https://exemple.fr/');
    expect(rapport.audited_at).toBe('2026-07-04T12:00:00.000Z');
    expect(rapport.langue_detectee).toBe('indeterminee');
    expect(rapport.score_global).toBe(100);
    expect(rapport.niveau).toBe('vert');
    expect(rapport.plafond_applique).toBe(false);
    expect(Object.keys(rapport.piliers)).toEqual([
      'accessibilite_ia',
      'structure_semantique',
      'citabilite_contenu',
      'autorite_entite',
      'visibilite_mesuree',
    ]);
    // Le Pilier 5 non testé est porté par citation_mesuree, pas par la liste
    // des critères non testés (réservée aux Piliers 1-4).
    expect(rapport.criteres_non_testes).toEqual([]);
    expect(rapport.citation_mesuree).toEqual({
      statut: 'non_mesuree',
      raison: 'flag --visibility non passé',
    });
    expect(rapport.recommandations).toEqual([]);
  });

  it('reporte les stats de citation quand le Pilier 5 a tourné', () => {
    const rapport = buildRapport({
      ...BASE,
      citationStats: {
        totalReponses: 5,
        citations: 2,
        tauxCitation: 0.4,
        positionMoyenne: 1.5,
      },
      piliers: piliers({
        visibilite_mesuree: [
          detail({ critere: '5.1 Taux de citation', points_obtenus: 6, points_max: 15 }),
        ],
      }),
    });
    expect(rapport.citation_mesuree).toEqual({
      statut: 'mesuree',
      reponses: 5,
      citations: 2,
      taux: 0.4,
      position_moyenne: 1.5,
      score: 6,
    });
    // Et le score de préparation ne compte pas ces 15 points.
    expect(rapport.score_max_teste).toBe(0);
  });
});

describe('renderMarkdown', () => {
  it('contient score, niveau, piliers, non testés et recommandations', () => {
    const md = renderMarkdown(
      buildRapport({
        ...BASE,
        piliers: piliers({
          accessibilite_ia: [
            detail({ critere: '1.2 Présence d\'un fichier llms.txt', points_obtenus: 0, points_max: 5 }),
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
          visibilite_mesuree: [
            detail({
              critere: '5.1 Taux de citation sur panel de requêtes',
              points_max: 15,
              preuve: 'Non testé : flag --visibility non passé',
              statut: 'non_teste',
            }),
          ],
        }),
      }),
    );
    expect(md).toContain('# Rapport d\'audit GEO — https://exemple.fr/');
    expect(md).toContain('Audité le 2026-07-04');
    expect(md).toContain('**Score de préparation GEO : 61.5/100 — niveau JAUNE**');
    expect(md).toContain('**Citation mesurée aujourd\'hui**');
    expect(md).toContain('non mesurée — flag --visibility non passé');
    expect(md).toContain('## Pilier 1 · Accessibilité IA — 8/20');
    expect(md).toContain('| 1.1 Robots.txt | 8/8 | preuve de test |');
    expect(md).toContain('| 3.1 Réponses directes | non testé |');
    expect(md).toContain('## Critères non testés (exclus du calcul)');
    expect(md).toContain('**3.1 Réponses directes** — flag --with-claude non passé');
    expect(md).toContain('## Recommandations (par points manquants)');
    expect(md).toContain('| haute | 1.2 Présence d\'un fichier llms.txt |');
    // Pilier 5 non testé ⇒ pas de note de transparence.
    expect(md).not.toContain('Note de transparence');
  });

  it('affiche le message exact du plafond et la note de transparence', () => {
    const md = renderMarkdown(
      buildRapport({
        ...BASE,
        piliers: piliers({
          accessibilite_ia: [
            detail({ critere: '1.1 Robots.txt', points_obtenus: 0, points_max: 8 }),
          ],
          visibilite_mesuree: [
            detail({ critere: '5.1 Taux de citation', points_obtenus: 15, points_max: 15 }),
          ],
        }),
      }),
    );
    expect(md).toContain('Site non accessible aux crawlers IA, le reste du score est indicatif.');
    expect(md).toContain('Note de transparence méthodologique');
  });

  it('échappe les pipes et retours à la ligne dans les cellules', () => {
    const md = renderMarkdown(
      buildRapport({
        ...BASE,
        piliers: piliers({
          accessibilite_ia: [
            detail({
              critere: '1.1 Robots.txt',
              points_obtenus: 4,
              points_max: 8,
              preuve: 'bloqués : GPTBot | CCBot\nsur deux lignes',
            }),
          ],
        }),
      }),
    );
    expect(md).toContain('bloqués : GPTBot \\| CCBot sur deux lignes');
  });
});
