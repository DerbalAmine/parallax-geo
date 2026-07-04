/**
 * Pilier 4 — Autorité et entité (20 points).
 *
 * 4.1 (cohérence NAP) et 4.2 (E-E-A-T) : zéro clé API. 4.3 (sources tierces
 * françaises) : recherche SerpAPI injectée par le CLI quand --deep et une
 * clé sont présents, sinon non testé avec la raison. 4.4 (langue) est une
 * métadonnée non notée, portée par le rapport global.
 */

import type { Fetcher } from '../core/fetch.js';
import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import { evaluateEeat } from './eeat.js';
import { evaluateNap, extractSchemaNap } from './nap.js';
import type { SearchFn } from './third-party.js';
import { entityNameFromUrl, evaluateThirdParty } from './third-party.js';

export interface AuthorityInput {
  url: string;
  staticHtml: string;
  fetcher: Fetcher;
  /** Recherche SerpAPI pour 4.3 (--deep) ; absente ⇒ non testé avec la raison. */
  thirdPartySearch?: SearchFn;
  thirdPartyAbsentReason?: string;
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

  // 4.3 Sources tierces françaises (--deep + clé SerpAPI)
  const methode43 =
    'Recherche web (SerpAPI) sur le nom d\'entité : Wikipedia 2 pts, annuaires français (Societe.com, Infogreffe, Pages Jaunes, Kompass) 2 pts, presse via actualités 4 pts (≥ 3 articles, 2 pts pour 1-2)';
  if (input.thirdPartySearch) {
    const entityName = extractSchemaNap(input.staticHtml)?.name ?? entityNameFromUrl(input.url);
    try {
      const tiers = await evaluateThirdParty(entityName, input.thirdPartySearch);
      details.push({
        critere: '4.3 Présence sur sources tierces',
        points_obtenus: tiers.points,
        points_max: 8,
        methode: methode43,
        preuve: tiers.preuve,
      });
    } catch (err) {
      details.push({
        critere: '4.3 Présence sur sources tierces',
        points_obtenus: 0,
        points_max: 8,
        methode: methode43,
        preuve: `Non testé : erreur SerpAPI — ${err instanceof Error ? err.message : String(err)}`,
        statut: 'non_teste',
      });
    }
  } else {
    details.push({
      critere: '4.3 Présence sur sources tierces',
      points_obtenus: 0,
      points_max: 8,
      methode: methode43,
      preuve: `Non testé : ${input.thirdPartyAbsentReason ?? 'flag --deep non passé'}`,
      statut: 'non_teste',
    });
  }

  const score = round1(details.reduce((sum, d) => sum + d.points_obtenus, 0));
  return { score, max: 20, details };
}
