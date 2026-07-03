/**
 * Fichier de requêtes ICP du Pilier 5 — parsing et validation.
 *
 * Schéma (docs/scoring-methodology.md, section Pilier 5) :
 *   brand: "ComplyPME"
 *   domain: "getcomplypme.com"
 *   queries:
 *     - text: "meilleur outil de conformité AI Act pour PME"
 *       category: "conformite"
 *
 * YAML par défaut ; JSON accepté si l'extension du fichier est .json.
 */

import fs from 'node:fs';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

export interface IcpQuery {
  text: string;
  category?: string;
}

export interface IcpConfig {
  brand: string;
  domain: string;
  queries: IcpQuery[];
}

/** Erreur de fichier de requêtes — message directement affichable. */
export class QueriesFileError extends Error {
  override name = 'QueriesFileError';
}

function requireString(value: unknown, champ: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new QueriesFileError(
      `Champ « ${champ} » manquant ou vide dans le fichier de requêtes`,
    );
  }
  return value.trim();
}

export function validateIcpConfig(data: unknown): IcpConfig {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new QueriesFileError(
      'Le fichier de requêtes doit contenir un objet (brand, domain, queries)',
    );
  }
  const obj = data as Record<string, unknown>;
  const brand = requireString(obj['brand'], 'brand');
  const domain = requireString(obj['domain'], 'domain')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  const rawQueries = obj['queries'];
  if (!Array.isArray(rawQueries) || rawQueries.length === 0) {
    throw new QueriesFileError(
      'Le champ « queries » doit être une liste non vide de requêtes',
    );
  }
  const queries: IcpQuery[] = rawQueries.map((q, i) => {
    if (typeof q !== 'object' || q === null) {
      throw new QueriesFileError(`Requête n°${i + 1} invalide (objet attendu)`);
    }
    const query = q as Record<string, unknown>;
    const text = requireString(query['text'], `queries[${i}].text`);
    const category = query['category'];
    if (category !== undefined && typeof category !== 'string') {
      throw new QueriesFileError(
        `queries[${i}].category doit être une chaîne si présent`,
      );
    }
    return category ? { text, category } : { text };
  });

  return { brand, domain, queries };
}

export function parseIcpConfig(raw: string, format: 'yaml' | 'json'): IcpConfig {
  let data: unknown;
  try {
    data = format === 'json' ? JSON.parse(raw) : parseYaml(raw);
  } catch (err) {
    throw new QueriesFileError(
      `Fichier de requêtes illisible (${format.toUpperCase()}) : ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return validateIcpConfig(data);
}

export function loadIcpConfig(file: string): IcpConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    throw new QueriesFileError(`Fichier de requêtes introuvable : ${file}`);
  }
  const format = path.extname(file).toLowerCase() === '.json' ? 'json' : 'yaml';
  return parseIcpConfig(raw, format);
}
