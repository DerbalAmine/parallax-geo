/**
 * Sous-critère 3.2 — Chiffres et données sourcées (7 points).
 *
 * Méthode (docs/scoring-methodology.md) : regex pour détecter nombres,
 * pourcentages et dates, pondérés par proximité (< 100 caractères) d'un lien
 * externe ou d'une expression comme « selon » ou « source ». Score
 * proportionnel à la densité de data points sourcés par 1000 mots,
 * plafonné à 7 points.
 *
 * Choix d'implémentation : 1 point par data point sourcé pour 1000 mots
 * (densité 7/1000 ⇒ plafond). Les liens externes sont matérialisés par un
 * marqueur inséré dans le texte avant analyse, pour mesurer la proximité
 * en caractères comme demandé.
 */

import * as cheerio from 'cheerio';

import { round1 } from '../core/types.js';

/** Marqueur injecté à l'emplacement de chaque lien externe. */
export const LINK_MARKER = '⟦lien-externe⟧';

const SOURCE_EXPR =
  /selon|source|d['’]après|étude (?:de|menée|publiée)|rapport (?:de|publié)|chiffres (?:de|publiés)|⟦lien-externe⟧/i;

const DATA_POINT_RE =
  /\d+(?:[.,]\d+)?\s*(?:%|€|k€|m€|millions?|milliards?)|\b(?:19|20)\d{2}\b|\b\d{1,3}(?:[  .]\d{3})+\b|\b\d{2,}\b/gi;

/** Texte utile avec marqueurs de liens externes au point d'ancrage. */
export function textWithLinkMarkers(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, template, svg, iframe').remove();
  const baseHost = new URL(baseUrl).host;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    try {
      const url = new URL(href, baseUrl);
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.host !== baseHost
      ) {
        $(el).append(` ${LINK_MARKER} `);
      }
    } catch {
      // href invalide : ignoré
    }
  });
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export interface SourcedDataEvaluation {
  dataPoints: number;
  sourcedDataPoints: number;
  wordCount: number;
  /** Data points sourcés pour 1000 mots. */
  density: number;
  points: number;
}

export function evaluateSourcedData(
  html: string,
  baseUrl: string,
): SourcedDataEvaluation {
  const text = textWithLinkMarkers(html, baseUrl);
  const wordCount = text
    .replace(new RegExp(LINK_MARKER, 'g'), '')
    .split(/\s+/)
    .filter(Boolean).length;

  let dataPoints = 0;
  let sourcedDataPoints = 0;
  for (const match of text.matchAll(DATA_POINT_RE)) {
    dataPoints++;
    const start = Math.max(0, match.index - 100);
    const end = match.index + match[0].length + 100;
    if (SOURCE_EXPR.test(text.slice(start, end))) sourcedDataPoints++;
  }

  const density = wordCount === 0 ? 0 : (sourcedDataPoints / wordCount) * 1000;
  return {
    dataPoints,
    sourcedDataPoints,
    wordCount,
    density: round1(density),
    points: round1(Math.min(7, density)),
  };
}
