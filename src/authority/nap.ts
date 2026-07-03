/**
 * Sous-critère 4.1 — Cohérence NAP et identité d'entité (6 points).
 *
 * Méthode (docs/scoring-methodology.md) : extraire nom, adresse et téléphone
 * depuis le Schema.org Organization et depuis le footer ou la page contact en
 * texte brut, comparer la cohérence. 2 points par élément cohérent.
 *
 * Choix d'implémentation (documentés au CHANGELOG) :
 * - un élément est « cohérent » s'il est présent dans le Schema.org ET
 *   retrouvé dans le texte visible (footer, puis page contact en repli) ;
 * - téléphones comparés après normalisation (+33 ↔ 0, séparateurs ignorés) ;
 * - adresse cohérente si le code postal du Schema.org apparaît dans le texte
 *   (et la ville aussi quand elle est déclarée), ou à défaut si la rue
 *   normalisée y apparaît ;
 * - sans bloc Organization/LocalBusiness exploitable, aucune comparaison
 *   n'est possible : 0 point, la preuve l'explique.
 */

import * as cheerio from 'cheerio';

import type { Fetcher } from '../core/fetch.js';
import { extractJsonLdObjects, typesOf, walkJsonLd } from '../core/jsonld.js';
import { extractText } from '../core/text.js';

export interface SchemaAddress {
  street?: string;
  postalCode?: string;
  locality?: string;
  /** Adresse déclarée en chaîne simple plutôt qu'en PostalAddress. */
  raw?: string;
}

export interface SchemaNap {
  name?: string;
  telephone?: string;
  address?: SchemaAddress;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

export function extractSchemaNap(html: string): SchemaNap | null {
  let nap: SchemaNap | null = null;
  walkJsonLd(extractJsonLdObjects(html), (obj) => {
    if (nap) return;
    const types = typesOf(obj);
    if (!types.includes('Organization') && !types.includes('LocalBusiness')) return;

    const result: SchemaNap = {};
    const name = str(obj['name']);
    if (name) result.name = name;
    const telephone = str(obj['telephone']);
    if (telephone) result.telephone = telephone;

    const addr = Array.isArray(obj['address']) ? obj['address'][0] : obj['address'];
    if (typeof addr === 'string' && addr.trim()) {
      result.address = { raw: addr.trim() };
    } else if (typeof addr === 'object' && addr !== null) {
      const a = addr as Record<string, unknown>;
      const address: SchemaAddress = {};
      const street = str(a['streetAddress']);
      if (street) address.street = street;
      const postalCode = str(a['postalCode']);
      if (postalCode) address.postalCode = postalCode;
      const locality = str(a['addressLocality']);
      if (locality) address.locality = locality;
      if (Object.keys(address).length) result.address = address;
    }
    nap = result;
  });
  return nap;
}

/** minuscules, sans accents, espaces normalisés — pour les comparaisons texte. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chiffres uniquement, préfixe international français ramené à 0. */
export function normalizePhone(s: string): string {
  let digits = s.replace(/\D/g, '');
  if (digits.startsWith('0033')) digits = digits.slice(4);
  if (digits.startsWith('33') && digits.length === 11) digits = digits.slice(2);
  if (digits.length === 9) digits = '0' + digits;
  return digits;
}

const PHONE_RE = /(?:\+\s*33|0)\s*[1-9](?:[\s.\-]?\d{2}){4}/g;

export function extractPhones(text: string): Set<string> {
  return new Set([...text.matchAll(PHONE_RE)].map((m) => normalizePhone(m[0])));
}

/** Texte du footer (balise <footer> ou classes/ids contenant "footer"). */
export function extractFooterText(html: string): string {
  const $ = cheerio.load(html);
  const parts: string[] = [];
  $('footer, [class*="footer" i], [id*="footer" i]').each((_, el) => {
    parts.push($(el).text());
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Lien vers la page contact du même domaine, en URL absolue. */
export function findContactLink(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  for (const el of $('a[href]').toArray()) {
    const href = $(el).attr('href') ?? '';
    const label = normalizeText($(el).text());
    if (!/contact/i.test(href) && !label.includes('contact')) continue;
    try {
      const url = new URL(href, base);
      if (url.origin === base.origin) return url.href;
    } catch {
      // href invalide : ignoré
    }
  }
  return null;
}

export interface NapElement {
  present: boolean;
  coherent: boolean;
}

export interface NapEvaluation {
  schema: SchemaNap | null;
  nom: NapElement;
  telephone: NapElement;
  adresse: NapElement;
  /** Source du texte comparé : 'footer', 'footer+contact' ou 'aucune'. */
  sourceTexte: string;
  points: number;
}

export async function evaluateNap(
  html: string,
  baseUrl: string,
  fetcher: Fetcher,
): Promise<NapEvaluation> {
  const schema = extractSchemaNap(html);
  const absent: NapElement = { present: false, coherent: false };

  if (!schema) {
    return {
      schema: null,
      nom: absent,
      telephone: absent,
      adresse: absent,
      sourceTexte: 'aucune',
      points: 0,
    };
  }

  let text = extractFooterText(html);
  let sourceTexte = text ? 'footer' : 'aucune';

  // Repli / complément : la page contact du même domaine.
  const contactUrl = findContactLink(html, baseUrl);
  if (contactUrl) {
    const res = await fetcher(contactUrl);
    if (res.ok) {
      text += ' ' + extractText(res.body);
      sourceTexte = sourceTexte === 'footer' ? 'footer+contact' : 'contact';
    }
  }

  const normText = normalizeText(text);
  const phones = extractPhones(text);

  const nom: NapElement = {
    present: Boolean(schema.name),
    coherent: Boolean(
      schema.name && normText.includes(normalizeText(schema.name)),
    ),
  };

  const telephone: NapElement = {
    present: Boolean(schema.telephone),
    coherent: Boolean(
      schema.telephone && phones.has(normalizePhone(schema.telephone)),
    ),
  };

  const addr = schema.address;
  let adresseCoherente = false;
  if (addr) {
    if (addr.postalCode) {
      adresseCoherente =
        normText.includes(normalizeText(addr.postalCode)) &&
        (!addr.locality || normText.includes(normalizeText(addr.locality)));
    } else if (addr.street) {
      adresseCoherente = normText.includes(normalizeText(addr.street));
    } else if (addr.raw) {
      adresseCoherente = normText.includes(normalizeText(addr.raw));
    }
  }
  const adresse: NapElement = { present: Boolean(addr), coherent: adresseCoherente };

  const points =
    (nom.coherent ? 2 : 0) + (telephone.coherent ? 2 : 0) + (adresse.coherent ? 2 : 0);

  return { schema, nom, telephone, adresse, sourceTexte, points };
}
