/**
 * Sous-critère 2.2 — Données structurées Schema.org (8 points).
 *
 * Extraction des blocs <script type="application/ld+json">, parsing JSON,
 * vérification des types : Organization ou LocalBusiness (3 pts),
 * FAQPage (3 pts), Article ou BlogPosting (2 pts).
 *
 * Les types sont collectés récursivement (y compris @graph et entités
 * imbriquées) ; un bloc au JSON invalide est ignoré sans faire échouer
 * l'analyse. Les sous-types officiels courants de LocalBusiness et
 * d'Article sont reconnus (liste statique : core/schema-types.ts).
 */

import { extractJsonLdObjects, typesOf, walkJsonLd } from '../core/jsonld.js';
import { isArticleType, isOrganizationType } from '../core/schema-types.js';

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
  const pointsOrganization = isOrganizationType(types) ? 3 : 0;
  const pointsFaq = types.has('FAQPage') ? 3 : 0;
  const pointsArticle = isArticleType(types) ? 2 : 0;
  return {
    types: [...types].sort(),
    pointsOrganization,
    pointsFaq,
    pointsArticle,
    points: pointsOrganization + pointsFaq + pointsArticle,
  };
}
