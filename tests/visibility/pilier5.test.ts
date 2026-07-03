import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ResponseCache } from '../../src/visibility/cache.js';
import { auditVisibility } from '../../src/visibility/index.js';
import type { VisibilityProvider } from '../../src/visibility/providers.js';
import type { IcpConfig } from '../../src/visibility/queries.js';

const CONFIG: IcpConfig = {
  brand: 'ComplyPME',
  domain: 'complypme.fr',
  queries: [
    { text: 'meilleur outil de conformité AI Act pour PME', category: 'conformite' },
    { text: 'audit GEO gratuit pour PME française', category: 'geo' },
  ],
};

const noSleep = async (): Promise<void> => {};

function fakeProvider(
  id: VisibilityProvider['id'],
  responses: Record<string, string | Error>,
  calls: string[] = [],
): VisibilityProvider & { calls: string[] } {
  return {
    id,
    label: id,
    model: `${id}-model`,
    minIntervalMs: 1000,
    calls,
    async ask(query) {
      calls.push(query);
      const r = responses[query];
      if (r === undefined) throw new Error('requête inattendue');
      if (r instanceof Error) throw r;
      return r;
    },
  };
}

let tmpDir: string;
let cache: ResponseCache;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-p5-'));
  cache = new ResponseCache(path.join(tmpDir, 'cache.sqlite'));
});

afterEach(() => {
  cache.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('auditVisibility (Pilier 5)', () => {
  it('score = taux de citation × 15, position moyenne calculée', async () => {
    const gemini = fakeProvider('gemini', {
      [CONFIG.queries[0]!.text]: '1. LegalPlace\n2. ComplyPME — très bien',
      [CONFIG.queries[1]!.text]: 'Aucun outil précis ne me vient.',
    });
    const claude = fakeProvider('claude', {
      [CONFIG.queries[0]!.text]: 'ComplyPME est une option sérieuse.',
      [CONFIG.queries[1]!.text]: 'Essayez complypme.fr pour un audit.',
    });

    const { pilier, stats } = await auditVisibility({
      config: CONFIG,
      providers: [gemini, claude],
      missing: [
        { id: 'openai', label: 'OpenAI' },
        { id: 'perplexity', label: 'Perplexity' },
      ],
      cache,
      sleep: noSleep,
    });

    // 3 citations sur 4 réponses ⇒ 15 × 0.75 = 11.3 (arrondi à une décimale)
    expect(stats.citations).toBe(3);
    expect(stats.totalReponses).toBe(4);
    expect(pilier.score).toBe(11.3);
    expect(stats.positionMoyenne).toBe(2);
    expect(pilier.details[0]?.preuve).toContain('75 %');
    expect(pilier.details[0]?.preuve).toContain('non testés, clé API absente : openai, perplexity');
  });

  it('réutilise le cache le même jour : zéro appel API au second run', async () => {
    const responses = { [CONFIG.queries[0]!.text]: 'ComplyPME', [CONFIG.queries[1]!.text]: 'rien' };
    const now = new Date('2026-07-03T10:00:00Z');

    const p1 = fakeProvider('gemini', responses);
    await auditVisibility({
      config: CONFIG, providers: [p1], missing: [], cache, sleep: noSleep, now,
    });
    expect(p1.calls).toHaveLength(2);

    const p2 = fakeProvider('gemini', responses);
    const second = await auditVisibility({
      config: CONFIG, providers: [p2], missing: [], cache, sleep: noSleep, now,
    });
    expect(p2.calls).toHaveLength(0); // tout vient du cache
    expect(second.stats.runs[0]?.fromCache).toBe(2);
    expect(second.pilier.score).toBe(7.5); // 1/2 cité
  });

  it('le cache d\'un autre jour n\'est pas réutilisé', async () => {
    const responses = { [CONFIG.queries[0]!.text]: 'ComplyPME', [CONFIG.queries[1]!.text]: 'rien' };
    const p1 = fakeProvider('gemini', responses);
    await auditVisibility({
      config: CONFIG, providers: [p1], missing: [], cache, sleep: noSleep,
      now: new Date('2026-07-03T10:00:00Z'),
    });
    const p2 = fakeProvider('gemini', responses);
    await auditVisibility({
      config: CONFIG, providers: [p2], missing: [], cache, sleep: noSleep,
      now: new Date('2026-07-04T10:00:00Z'),
    });
    expect(p2.calls).toHaveLength(2);
  });

  it('un appel en échec est exclu du dénominateur et compté en erreur', async () => {
    const gemini = fakeProvider('gemini', {
      [CONFIG.queries[0]!.text]: 'ComplyPME est cité.',
      [CONFIG.queries[1]!.text]: new Error('HTTP 429 — rate limit'),
    });
    const { pilier, stats } = await auditVisibility({
      config: CONFIG, providers: [gemini], missing: [], cache, sleep: noSleep,
    });
    expect(stats.runs[0]?.failed).toBe(1);
    expect(stats.runs[0]?.erreur).toContain('429');
    expect(stats.totalReponses).toBe(1);
    expect(pilier.score).toBe(15); // 1/1 cité
    expect(pilier.details[0]?.preuve).toContain('1 échec(s)');
  });

  it('toutes les requêtes en échec : pilier non testé, audit sans erreur', async () => {
    const gemini = fakeProvider('gemini', {
      [CONFIG.queries[0]!.text]: new Error('HTTP 401 — clé invalide'),
      [CONFIG.queries[1]!.text]: new Error('HTTP 401 — clé invalide'),
    });
    const { pilier } = await auditVisibility({
      config: CONFIG, providers: [gemini], missing: [], cache, sleep: noSleep,
    });
    expect(pilier.score).toBe(0);
    expect(pilier.details[0]?.statut).toBe('non_teste');
    expect(pilier.details[0]?.preuve).toContain('401');
  });

  it('appelle les fournisseurs séquentiellement, requête par requête', async () => {
    const order: string[] = [];
    const make = (id: VisibilityProvider['id']): VisibilityProvider => ({
      id, label: id, model: 'm', minIntervalMs: 10,
      async ask(q) {
        order.push(`${id}:${q.slice(0, 6)}`);
        return 'rien';
      },
    });
    await auditVisibility({
      config: CONFIG, providers: [make('gemini'), make('claude')], missing: [],
      cache, sleep: noSleep,
    });
    expect(order).toEqual([
      'gemini:meille', 'gemini:audit ',
      'claude:meille', 'claude:audit ',
    ]);
  });
});
