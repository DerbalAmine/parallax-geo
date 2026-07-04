/**
 * Détection de langue — critère 4.4 de la grille (métadonnée informative,
 * non notée) : champ `langue_detectee` du rapport. Librairie franc (ISO
 * 639-3), ramenée aux codes courts usuels ; « indeterminee » en dessous de
 * quelques mots ou si franc ne tranche pas.
 */

import { franc } from 'franc';

/** Codes ISO 639-3 → 639-1 pour les langues plausibles d'un site audité. */
const ISO_COURT: Record<string, string> = {
  fra: 'fr',
  eng: 'en',
  deu: 'de',
  spa: 'es',
  ita: 'it',
  por: 'pt',
  nld: 'nl',
};

export function detectLanguage(text: string): string {
  const sample = text.trim();
  if (sample.length < 50) return 'indeterminee';
  const iso3 = franc(sample);
  if (iso3 === 'und') return 'indeterminee';
  return ISO_COURT[iso3] ?? iso3;
}
