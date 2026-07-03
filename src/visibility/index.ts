/**
 * Pilier 5 — Visibilité mesurée (15 points, flag --visibility).
 *
 * Orchestration séquentielle multi-API avec cache SQLite (une journée) et
 * rate limiting explicite par fournisseur. Score = taux de citation × 15.
 * Les fournisseurs sans clé sont marqués « non testé, clé API absente » ;
 * un appel en échec est exclu du dénominateur et compté en erreur.
 */

import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import { detectBrand } from './brand.js';
import { dayKey, type ResponseCache } from './cache.js';
import type { Sleep } from './rate-limit.js';
import { RateLimiter, realSleep } from './rate-limit.js';
import type { VisibilityProvider } from './providers.js';
import type { IcpConfig } from './queries.js';

/** Note de transparence méthodologique — affichée dans chaque rapport (grille, Pilier 5). */
export const NOTE_TRANSPARENCE =
  'Note de transparence méthodologique : cette mesure passe par les APIs officielles des modèles, ' +
  'pas par les interfaces utilisateur réelles (ChatGPT.com, Perplexity.ai). Les réponses via API ' +
  'peuvent différer de ce que voit un utilisateur final, notamment sur les citations de sources. ' +
  'C\'est un choix assumé pour rester gratuit, indépendant de tout vendor de scraping payant, et ' +
  'conforme aux conditions d\'utilisation des plateformes. Ne pas prétendre à une équivalence ' +
  'parfaite avec l\'expérience utilisateur réelle.';

export interface ProviderRun {
  id: string;
  label: string;
  model: string;
  ok: number;
  failed: number;
  cited: number;
  positions: number[];
  fromCache: number;
  /** Premier message d'erreur rencontré, le cas échéant. */
  erreur?: string;
}

export interface VisibilityStats {
  runs: ProviderRun[];
  missing: Array<{ id: string; label: string }>;
  totalReponses: number;
  citations: number;
  tauxCitation: number | null;
  positionMoyenne: number | null;
}

export interface VisibilityInput {
  config: IcpConfig;
  providers: VisibilityProvider[];
  missing: Array<{ id: string; label: string }>;
  cache: ResponseCache;
  sleep?: Sleep;
  now?: Date;
  /** Journal de progression (affichage CLI). */
  log?: (message: string) => void;
}

export interface VisibilityResult {
  pilier: PilierResult;
  stats: VisibilityStats;
}

export async function auditVisibility(
  input: VisibilityInput,
): Promise<VisibilityResult> {
  const sleep = input.sleep ?? realSleep;
  const day = dayKey(input.now ?? new Date());
  const log = input.log ?? (() => {});
  const runs: ProviderRun[] = [];

  for (const provider of input.providers) {
    const run: ProviderRun = {
      id: provider.id,
      label: provider.label,
      model: provider.model,
      ok: 0,
      failed: 0,
      cited: 0,
      positions: [],
      fromCache: 0,
    };
    const limiter = new RateLimiter(provider.minIntervalMs, sleep);
    const cacheKey = `${provider.id}:${provider.model}`;

    for (const query of input.config.queries) {
      let response = input.cache.get(cacheKey, query.text, day);
      if (response !== undefined) {
        run.fromCache++;
      } else {
        await limiter.wait();
        log(`  ${provider.label} ← « ${query.text.slice(0, 60)}… »`);
        try {
          response = await provider.ask(query.text);
          input.cache.set(cacheKey, query.text, day, response);
        } catch (err) {
          run.failed++;
          run.erreur ??= err instanceof Error ? err.message : String(err);
          continue;
        }
      }
      run.ok++;
      const match = detectBrand(response, input.config.brand, input.config.domain);
      if (match.cited) {
        run.cited++;
        if (match.position !== null) run.positions.push(match.position);
      }
    }
    runs.push(run);
  }

  const totalReponses = runs.reduce((s, r) => s + r.ok, 0);
  const citations = runs.reduce((s, r) => s + r.cited, 0);
  const allPositions = runs.flatMap((r) => r.positions);
  const tauxCitation = totalReponses ? citations / totalReponses : null;
  const positionMoyenne = allPositions.length
    ? round1(allPositions.reduce((a, b) => a + b, 0) / allPositions.length)
    : null;

  const stats: VisibilityStats = {
    runs,
    missing: input.missing,
    totalReponses,
    citations,
    tauxCitation,
    positionMoyenne,
  };

  const parFournisseur = runs
    .map(
      (r) =>
        `${r.id} ${r.cited}/${r.ok}${r.failed ? ` (${r.failed} échec(s))` : ''}`,
    )
    .join(', ');
  const nonTestes = input.missing.length
    ? ` ; non testés, clé API absente : ${input.missing.map((m) => m.id).join(', ')}`
    : '';

  const detail: CritereDetail = {
    critere: '5.1 Taux de citation sur panel de requêtes',
    points_obtenus: tauxCitation === null ? 0 : round1(tauxCitation * 15),
    points_max: 15,
    methode:
      'Requêtes ICP envoyées séquentiellement aux APIs configurées, détection de marque (regex + fuzzy), score = taux de citation × 15',
    preuve:
      tauxCitation === null
        ? `Aucune réponse exploitable${runs.length ? ` (${runs.map((r) => `${r.id} : ${r.erreur ?? 'échec'}`).join(' ; ')})` : ''}${nonTestes}`
        : `Taux de citation ${Math.round(tauxCitation * 100)} % (${citations}/${totalReponses} réponses, marque « ${input.config.brand} »)` +
          (positionMoyenne !== null ? `, position moyenne ${positionMoyenne}` : '') +
          ` — ${parFournisseur}${nonTestes}`,
  };
  if (tauxCitation === null) detail.statut = 'non_teste';

  return {
    pilier: { score: detail.points_obtenus, max: 15, details: [detail] },
    stats,
  };
}
