/**
 * Sous-critère 2.2 — Données structurées Schema.org (8 points).
 *
 * Extraction des blocs <script type="application/ld+json">, parsing JSON,
 * vérification des types : Organization ou LocalBusiness (3 pts),
 * FAQPage (3 pts), Article ou BlogPosting (2 pts).
 *
 * Les types sont collectés récursivement (y compris @graph et entités
 * imbriquées) ; un bloc au JSON invalide est ignoré sans faire échouer
 * l'analyse. Correspondance stricte avec les types listés par la grille.
 */

import { extractJsonLdObjects, typesOf, walkJsonLd } from '../core/jsonld.js';

export function collectJsonLdTypes(html: string): Set<string> {
  const types = new Set<string>();
  walkJsonLd(extractJsonLdObjects(html), (obj) => {
    for (const t of typesOf(obj)) types.add(t);
  });
  return types;
}

export interface SchemaEvaluation {
  types: string[];
  pointsOrganization: number;
  pointsFaq: number;
  pointsArticle: number;
  points: number;
}

export function evaluateSchema(html: string): SchemaEvaluation {
  const types = collectJsonLdTypes(html);
  const pointsOrganization =
    types.has('Organization') || types.has('LocalBusiness') ? 3 : 0;
  const pointsFaq = types.has('FAQPage') ? 3 : 0;
  const pointsArticle =
    types.has('Article') || types.has('BlogPosting') ? 2 : 0;
  return {
    types: [...types].sort(),
    pointsOrganization,
    pointsFaq,
    pointsArticle,
    points: pointsOrganization + pointsFaq + pointsArticle,
  };
}
