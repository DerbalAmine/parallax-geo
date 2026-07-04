/**
 * Recommandations du rapport — une par critère testé des Piliers 1 à 4 où des
 * points manquent, triées par points manquants décroissants (la priorité suit
 * le manque : ≥ 4 points haute, ≥ 2 moyenne, sinon basse). Les critères non
 * testés ne génèrent pas de recommandation (listés à part dans le rapport),
 * le Pilier 5 non plus : la citation mesurée n'est pas un levier technique.
 */

import type { PilierId, PilierResult, Recommandation } from './types.js';
import { round1 } from './types.js';

/** Action concrète par sous-critère de la grille (clé = numéro du critère). */
const ACTIONS: Record<string, string> = {
  '1.1':
    'Autorisez les crawlers IA dans robots.txt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot)',
  '1.2':
    'Ajoutez un fichier /llms.txt décrivant votre site (titre H1, sections H2 avec vos liens essentiels)',
  '1.3':
    'Servez le contenu principal en HTML statique (SSR ou prérendu) plutôt qu\'en rendu JavaScript côté client',
  '2.1':
    'Corrigez la hiérarchie des titres : un seul H1, aucun saut de niveau, titres descriptifs de plus de 3 mots significatifs',
  '2.2':
    'Ajoutez des données structurées Schema.org en JSON-LD : Organization ou LocalBusiness, FAQPage, Article',
  '2.3':
    'Ajustez la balise title (50-60 caractères), la meta description (120-160) et les balises og:title, og:description, og:image',
  '2.4':
    'Structurez des questions-réponses détectables : question en titre suivie d\'une réponse, balises details/summary ou sections FAQ',
  '3.1':
    'Commencez chaque section par une phrase qui répond directement à la question posée par son titre',
  '3.2':
    'Sourcez vos chiffres : accompagnez données et pourcentages d\'un lien ou d\'une mention « selon… » à proximité immédiate',
  '3.3':
    'Ajoutez des définitions autonomes (« X est un… », « X désigne… ») en début de paragraphe, en phrases complètes de plus de 15 mots',
  '3.4':
    'Affichez une date de publication ou de mise à jour (meta article:modified_time, balise time ou mention « mis à jour le »)',
  '4.1':
    'Alignez nom, adresse et téléphone entre votre bloc Schema.org et le texte visible (footer, page contact)',
  '4.2':
    'Renforcez les signaux E-E-A-T : page à propos, auteurs nommés, SIRET visible dans les mentions légales',
  '4.3':
    'Développez votre présence sur les sources tierces françaises (Wikipedia, Societe.com, Pages Jaunes Pro, presse)',
};

function priorite(manque: number): Recommandation['priorite'] {
  if (manque >= 4) return 'haute';
  if (manque >= 2) return 'moyenne';
  return 'basse';
}

export function buildRecommandations(
  piliers: Record<PilierId, PilierResult>,
): Recommandation[] {
  const candidats: Array<Recommandation & { manque: number }> = [];

  for (const [id, pilier] of Object.entries(piliers)) {
    if (id === 'visibilite_mesuree') continue;
    for (const d of pilier.details) {
      if (d.statut === 'non_teste') continue;
      const manque = round1(d.points_max - d.points_obtenus);
      if (manque <= 0) continue;
      const numero = d.critere.match(/^(\d+\.\d+)/)?.[1];
      const action = (numero && ACTIONS[numero]) ?? `Améliorez « ${d.critere} »`;
      candidats.push({
        priorite: priorite(manque),
        critere: d.critere,
        action: `${action} (+${manque} pts possibles)`,
        manque,
      });
    }
  }

  return candidats
    .sort((a, b) => b.manque - a.manque)
    .map(({ priorite, critere, action }) => ({ priorite, critere, action }));
}
