/**
 * Types du rapport d'audit — conformes au schéma JSON de sortie décrit dans
 * docs/scoring-methodology.md (source de vérité unique).
 */

/** `non_teste` : clé API absente ou outil indisponible — jamais une erreur. */
export type CritereStatut = 'teste' | 'non_teste';

export interface CritereDetail {
  critere: string;
  points_obtenus: number;
  points_max: number;
  methode: string;
  /** Extrait ou élément détecté justifiant la note. */
  preuve: string;
  statut?: CritereStatut;
}

export interface PilierResult {
  score: number;
  max: number;
  details: CritereDetail[];
}

export type Niveau = 'vert' | 'jaune' | 'orange' | 'rouge';

export interface Recommandation {
  priorite: 'haute' | 'moyenne' | 'basse';
  critere: string;
  action: string;
}

export type PilierId =
  | 'accessibilite_ia'
  | 'structure_semantique'
  | 'citabilite_contenu'
  | 'autorite_entite'
  | 'visibilite_mesuree';

/** Critère exclu du calcul (clé API absente, flag non passé, outil indisponible). */
export interface CritereNonTeste {
  pilier: PilierId;
  critere: string;
  raison: string;
}

/**
 * Pilier 5 rapporté à part : la citation réelle actuelle est un signal
 * complémentaire, jamais additionné au score de préparation GEO.
 */
export type CitationMesuree =
  | { statut: 'non_mesuree'; raison: string }
  | {
      statut: 'mesuree';
      reponses: number;
      citations: number;
      taux: number;
      position_moyenne: number | null;
      /** Barème propre du Pilier 5 : taux × 15. */
      score: number;
    };

export interface Rapport {
  url: string;
  audited_at: string;
  langue_detectee: string;
  /** Score de préparation GEO (Piliers 1-4) sur 100, normalisé sur les points testés, plafond appliqué. */
  score_global: number;
  /** Somme brute des points obtenus sur les critères testés des Piliers 1-4. */
  score_brut: number;
  /** Somme des points maximum des critères testés des Piliers 1-4 (dénominateur du score). */
  score_max_teste: number;
  niveau: Niveau;
  plafond_applique: boolean;
  citation_mesuree: CitationMesuree;
  piliers: Record<PilierId, PilierResult>;
  criteres_non_testes: CritereNonTeste[];
  recommandations: Recommandation[];
}

export const PILIER_TITRES: Record<PilierId, string> = {
  accessibilite_ia: 'Pilier 1 · Accessibilité IA',
  structure_semantique: 'Pilier 2 · Structure sémantique',
  citabilite_contenu: 'Pilier 3 · Citabilité du contenu',
  autorite_entite: 'Pilier 4 · Autorité et entité',
  visibilite_mesuree: 'Pilier 5 · Visibilité mesurée',
};

export const PILIER_MAX: Record<PilierId, number> = {
  accessibilite_ia: 20,
  structure_semantique: 20,
  citabilite_contenu: 25,
  autorite_entite: 20,
  visibilite_mesuree: 15,
};

export function emptyPilier(id: PilierId): PilierResult {
  return { score: 0, max: PILIER_MAX[id], details: [] };
}

/** Arrondi à une décimale pour l'affichage et l'export. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
