/**
 * Pilier 4 — Autorité et entité (20 points).
 *
 * Phase 3 : 4.1 (cohérence NAP) et 4.2 (E-E-A-T), zéro clé API.
 * 4.3 (sources tierces françaises, --deep + clé SerpAPI) : à venir,
 * marqué non testé en attendant. 4.4 (langue) est une métadonnée non
 * notée, portée par le rapport global.
 */

import type { Fetcher } from '../core/fetch.js';
import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import { evaluateEeat } from './eeat.js';
import { evaluateNap } from './nap.js';

export interface AuthorityInput {
  url: string;
  staticHtml: string;
  fetcher: Fetcher;
}

export async function auditAuthority(
  input: AuthorityInput,
): Promise<PilierResult> {
  const details: CritereDetail[] = [];

  // 4.1 Cohérence NAP
  const nap = await evaluateNap(input.staticHtml, input.url, input.fetcher);
  const etat = (e: { present: boolean; coherent: boolean }): string =>
    e.coherent ? 'cohérent' : e.present ? 'incohérent' : 'absent du Schema.org';
  details.push({
    critere: '4.1 Cohérence NAP et identité d\'entité',
    points_obtenus: nap.points,
    points_max: 6,
    methode:
      'Comparaison nom/adresse/téléphone entre Schema.org Organization et le texte visible (footer, page contact) — 2 pts par élément cohérent',
    preuve: nap.schema
      ? `nom : ${etat(nap.nom)} ; téléphone : ${etat(nap.telephone)} ; adresse : ${etat(nap.adresse)} (texte comparé : ${nap.sourceTexte})`
      : 'Aucun bloc Schema.org Organization/LocalBusiness : comparaison impossible',
  });

  // 4.2 Signaux E-E-A-T
  const eeat = await evaluateEeat(input.staticHtml, input.url, input.fetcher);
  const preuves: string[] = [
    eeat.about.found ? `page à propos : ${eeat.about.href}` : 'pas de page à propos',
    eeat.author.found ? eeat.author.preuve! : 'aucun auteur nommé',
    eeat.siret.found
      ? `SIRET visible (${eeat.siret.source}) : « ${eeat.siret.preuve} »`
      : 'aucun SIRET visible',
  ];
  details.push({
    critere: '4.2 Signaux E-E-A-T',
    points_obtenus: eeat.points,
    points_max: 6,
    methode:
      'Page à propos (2 pts), auteurs nommés via balise author ou Schema.org author (2 pts), mentions légales avec SIRET visible (2 pts)',
    preuve: preuves.join(' ; '),
  });

  // 4.3 Sources tierces françaises — implémentation à venir (--deep)
  details.push({
    critere: '4.3 Présence sur sources tierces',
    points_obtenus: 0,
    points_max: 8,
    methode:
      'Recherche web (SerpAPI) : Wikipedia, annuaires français, presse française — flag --deep',
    preuve: 'Non testé : nécessite le flag --deep et une clé SerpAPI (implémentation à venir)',
    statut: 'non_teste',
  });

  const score = round1(details.reduce((sum, d) => sum + d.points_obtenus, 0));
  return { score, max: 20, details };
}
