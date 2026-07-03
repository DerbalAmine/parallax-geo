/**
 * Sous-critère 4.2 — Signaux E-E-A-T (6 points).
 *
 * Méthode (docs/scoring-methodology.md) :
 * - page à propos (lien contenant « à propos », « about » ou
 *   « qui sommes-nous ») : 2 points ;
 * - auteurs nommés via balise author ou Schema.org author : 2 points ;
 * - mentions légales avec SIRET visible : 2 points (contexte français).
 *
 * Choix d'implémentation (documentés au CHANGELOG) :
 * - le SIRET est cherché sur la page auditée puis sur la page « mentions
 *   légales » du même domaine si un lien existe ;
 * - détection : mot-clé SIRET/SIREN suivi d'au moins 9 chiffres, ou motif
 *   14 chiffres groupés 3-3-3-5.
 */

import * as cheerio from 'cheerio';

import type { Fetcher } from '../core/fetch.js';
import { extractJsonLdObjects, walkJsonLd } from '../core/jsonld.js';
import { extractText } from '../core/text.js';
import { normalizeText } from './nap.js';

export interface AboutResult {
  found: boolean;
  href: string | null;
}

const ABOUT_PATTERNS = ['a propos', 'a-propos', 'apropos', 'about', 'qui sommes-nous', 'qui-sommes-nous', 'qui sommes nous'];

export function findAboutLink(html: string): AboutResult {
  const $ = cheerio.load(html);
  for (const el of $('a[href]').toArray()) {
    const href = $(el).attr('href') ?? '';
    const normHref = normalizeText(href);
    const normLabel = normalizeText($(el).text());
    if (
      ABOUT_PATTERNS.some((p) => normHref.includes(p) || normLabel.includes(p))
    ) {
      return { found: true, href };
    }
  }
  return { found: false, href: null };
}

export interface AuthorResult {
  found: boolean;
  /** Nom d'auteur détecté et sa source (meta ou JSON-LD). */
  preuve: string | null;
}

export function findNamedAuthor(html: string): AuthorResult {
  const $ = cheerio.load(html);

  const meta = $('meta[name="author"]').first().attr('content')?.trim();
  if (meta) return { found: true, preuve: `meta author : ${meta}` };

  let fromJsonLd: string | null = null;
  walkJsonLd(extractJsonLdObjects(html), (obj) => {
    if (fromJsonLd) return;
    const author = obj['author'];
    const candidates = Array.isArray(author) ? author : [author];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        fromJsonLd = c.trim();
        return;
      }
      if (typeof c === 'object' && c !== null) {
        const name = (c as Record<string, unknown>)['name'];
        if (typeof name === 'string' && name.trim()) {
          fromJsonLd = name.trim();
          return;
        }
      }
    }
  });
  if (fromJsonLd) return { found: true, preuve: `Schema.org author : ${fromJsonLd}` };

  return { found: false, preuve: null };
}

/** Mot-clé SIRET/SIREN + chiffres, ou motif 14 chiffres groupés 3-3-3-5. */
const SIRET_KEYWORD_RE = /sire[tn]\D{0,40}(?:\d[\s.]?){8,13}\d/i;
const SIRET_PATTERN_RE = /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{5}\b/;

export function detectSiret(text: string): string | null {
  const match = SIRET_KEYWORD_RE.exec(text) ?? SIRET_PATTERN_RE.exec(text);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

/** Lien « mentions légales » du même domaine, en URL absolue. */
export function findLegalLink(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  for (const el of $('a[href]').toArray()) {
    const href = normalizeText($(el).attr('href') ?? '');
    const label = normalizeText($(el).text());
    const isLegal = [href, label].some(
      (s) => /mentions[\s-]?legales/.test(s) || /legal[\s-]?(notice|mentions)?$/.test(s),
    );
    if (!isLegal) continue;
    try {
      const url = new URL($(el).attr('href') ?? '', base);
      if (url.origin === base.origin) return url.href;
    } catch {
      // href invalide : ignoré
    }
  }
  return null;
}

export interface EeatEvaluation {
  about: AboutResult;
  author: AuthorResult;
  siret: { found: boolean; preuve: string | null; source: string | null };
  points: number;
}

export async function evaluateEeat(
  html: string,
  baseUrl: string,
  fetcher: Fetcher,
): Promise<EeatEvaluation> {
  const about = findAboutLink(html);
  const author = findNamedAuthor(html);

  let siretPreuve = detectSiret(extractText(html));
  let siretSource: string | null = siretPreuve ? 'page auditée' : null;
  if (!siretPreuve) {
    const legalUrl = findLegalLink(html, baseUrl);
    if (legalUrl) {
      const res = await fetcher(legalUrl);
      if (res.ok) {
        siretPreuve = detectSiret(extractText(res.body));
        if (siretPreuve) siretSource = legalUrl;
      }
    }
  }

  const points =
    (about.found ? 2 : 0) + (author.found ? 2 : 0) + (siretPreuve ? 2 : 0);

  return {
    about,
    author,
    siret: { found: Boolean(siretPreuve), preuve: siretPreuve, source: siretSource },
    points,
  };
}
