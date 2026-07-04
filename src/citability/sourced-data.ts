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
 *
 * Garde-fous (validation partie a) : les téléphones, codes postaux et
 * SIRET/SIREN ne comptent pas comme data points ; les liens vers les
 * plateformes sociales et magasins d'applications ne valent pas « source » ;
 * la densité se calcule sur un plancher de 300 mots pour qu'une page quasi
 * vide (footer de SPA) ne puisse pas saturer le critère avec 2-3 chiffres.
 */

import * as cheerio from 'cheerio';

import { round1 } from '../core/types.js';

/** Marqueur injecté à l'emplacement de chaque lien externe. */
export const LINK_MARKER = '⟦lien-externe⟧';

/** Plancher de mots du dénominateur de densité. */
export const DENSITY_WORD_FLOOR = 300;

const SOURCE_EXPR =
  /selon|source|d['’]après|étude (?:de|menée|publiée)|rapport (?:de|publié)|chiffres (?:de|publiés)|⟦lien-externe⟧/i;

const DATA_POINT_RE =
  /\d+(?:[.,]\d+)?\s*(?:%|€|k€|m€|millions?|milliards?)|\b(?:19|20)\d{2}\b|\b\d{1,3}(?:[  .]\d{3})+\b|\b\d{2,}\b/gi;

/** Motifs administratifs exclus du comptage : téléphone FR, SIRET/SIREN,
 * code postal (5 chiffres nus, sauf si une unité suit — « 75000 € » reste
 * un montant). Retirés du texte avant la détection des data points. */
const EXCLUDED_PATTERNS: RegExp[] = [
  /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/g,
  /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{5}\b/g,
  /\b\d{14}\b|\b\d{9}\b/g,
  /\b\d{5}\b(?!\s*(?:%|€|k€|m€|millions?|milliards?))/g,
];

/** Hôtes externes qui ne constituent pas une source (réseaux sociaux,
 * magasins d'applications, cartes) — un lien de footer vers ces plateformes
 * ne « source » aucun chiffre. */
const NON_SOURCE_HOSTS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
  'apps.apple.com',
  'itunes.apple.com',
  'play.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'wa.me',
  't.me',
];

function isNonSourceHost(host: string): boolean {
  const h = host.replace(/^www\./, '');
  return NON_SOURCE_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

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
        url.host !== baseHost &&
        !isNonSourceHost(url.host)
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
  let text = textWithLinkMarkers(html, baseUrl);
  const wordCount = text
    .replace(new RegExp(LINK_MARKER, 'g'), '')
    .split(/\s+/)
    .filter(Boolean).length;

  // Motifs administratifs neutralisés avant la détection (un téléphone
  // découpé en paires de chiffres comptait jusqu'à 5 data points).
  for (const pattern of EXCLUDED_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  let dataPoints = 0;
  let sourcedDataPoints = 0;
  for (const match of text.matchAll(DATA_POINT_RE)) {
    dataPoints++;
    const start = Math.max(0, match.index - 100);
    const end = match.index + match[0].length + 100;
    if (SOURCE_EXPR.test(text.slice(start, end))) sourcedDataPoints++;
  }

  const density =
    wordCount === 0
      ? 0
      : (sourcedDataPoints / Math.max(wordCount, DENSITY_WORD_FLOOR)) * 1000;
  return {
    dataPoints,
    sourcedDataPoints,
    wordCount,
    density: round1(density),
    points: round1(Math.min(7, density)),
  };
}
