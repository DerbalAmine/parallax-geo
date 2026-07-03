import { describe, expect, it } from 'vitest';

import { checkLlmsTxt } from '../../src/accessibility/llms.js';
import type { Fetcher } from '../../src/core/fetch.js';

const fakeFetcher =
  (routes: Record<string, { status: number; body: string }>): Fetcher =>
  async (url) => {
    const path = new URL(url).pathname;
    const route = routes[path];
    if (!route) return { ok: false, status: 404, body: '' };
    return { ok: route.status < 400, status: route.status, body: route.body };
  };

describe('checkLlmsTxt', () => {
  it('5 points si /llms.txt répond 200 avec du contenu', async () => {
    const res = await checkLlmsTxt(
      'https://exemple.fr',
      fakeFetcher({ '/llms.txt': { status: 200, body: '# Mon site\n…' } }),
    );
    expect(res.points).toBe(5);
    expect(res.path).toBe('/llms.txt');
  });

  it('retombe sur /llms-full.txt si /llms.txt est absent', async () => {
    const res = await checkLlmsTxt(
      'https://exemple.fr',
      fakeFetcher({ '/llms-full.txt': { status: 200, body: 'contenu' } }),
    );
    expect(res.points).toBe(5);
    expect(res.path).toBe('/llms-full.txt');
  });

  it('0 point si aucun des deux fichiers n\'existe', async () => {
    const res = await checkLlmsTxt('https://exemple.fr', fakeFetcher({}));
    expect(res.points).toBe(0);
    expect(res.found).toBe(false);
  });

  it('0 point si la réponse 200 est vide (page d\'erreur soft)', async () => {
    const res = await checkLlmsTxt(
      'https://exemple.fr',
      fakeFetcher({ '/llms.txt': { status: 200, body: '   \n ' } }),
    );
    expect(res.points).toBe(0);
  });

  it('0 point sur une redirection vers une 404 (statut non 200)', async () => {
    const res = await checkLlmsTxt(
      'https://exemple.fr',
      fakeFetcher({ '/llms.txt': { status: 404, body: 'Not found' } }),
    );
    expect(res.points).toBe(0);
  });
});
