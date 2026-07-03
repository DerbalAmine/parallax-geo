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

export interface Rapport {
  url: string;
  audited_at: string;
  langue_detectee: string;
  score_global: number;
  niveau: Niveau;
  plafond_applique: boolean;
  piliers: Record<PilierId, PilierResult>;
  recommandations: Recommandation[];
}

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
