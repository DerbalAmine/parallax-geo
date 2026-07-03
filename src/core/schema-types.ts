/**
 * Sous-types Schema.org reconnus par la grille (décision du 2026-07-03,
 * voir CHANGELOG) : liste statique et documentée des sous-types officiels
 * courants d'Organization/LocalBusiness et d'Article, plutôt qu'un parcours
 * complet du graphe Schema.org.
 *
 * Pour étendre la couverture : ajouter le type officiel (schema.org) à la
 * liste correspondante, en PR séparée.
 */

/** Sous-types officiels de LocalBusiness fréquents chez les PME françaises. */
export const LOCALBUSINESS_SUBTYPES: readonly string[] = [
  'ProfessionalService',
  'LegalService',
  'Attorney',
  'AccountingService',
  'Restaurant',
  'Store',
  'MedicalBusiness',
  'RealEstateAgent',
  'HomeAndConstructionBusiness',
  'Plumber',
  'Electrician',
] as const;

/** Types comptant comme « Organization ou LocalBusiness » (2.2 et 4.1). */
export const ORGANIZATION_TYPES: ReadonlySet<string> = new Set([
  'Organization',
  'LocalBusiness',
  ...LOCALBUSINESS_SUBTYPES,
]);

/** Types comptant comme « Article ou BlogPosting » (2.2). */
export const ARTICLE_TYPES: ReadonlySet<string> = new Set([
  'Article',
  'BlogPosting',
  'NewsArticle',
  'TechArticle',
  'Report',
]);

export function isOrganizationType(types: Iterable<string>): boolean {
  for (const t of types) if (ORGANIZATION_TYPES.has(t)) return true;
  return false;
}

export function isArticleType(types: Iterable<string>): boolean {
  for (const t of types) if (ARTICLE_TYPES.has(t)) return true;
  return false;
}
