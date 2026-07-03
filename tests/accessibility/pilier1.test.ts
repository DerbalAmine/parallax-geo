import { describe, expect, it } from 'vitest';

import { auditAccessibility } from '../../src/accessibility/index.js';
import type { Fetcher } from '../../src/core/fetch.js';

const html = (body: string) => `<html><head></head><body>${body}</body></html>`;

const fakeFetcher =
  (routes: Record<string, string>): Fetcher =>
  async (url) => {
    const path = new URL(url).pathname;
    const body = routes[path];
    return body === undefined
      ? { ok: false, status: 404, body: '' }
      : { ok: true, status: 200, body };
  };

describe('auditAccessibility (Pilier 1 intégré)', () => {
  it('site idéal : 20/20', async () => {
    const staticHtml = html('<p>' + 'contenu statique riche. '.repeat(50) + '</p>');
    const result = await auditAccessibility({
      url: 'https://exemple.fr/',
      staticHtml,
      fetcher: fakeFetcher({
        '/robots.txt': 'User-agent: *\nAllow: /',
        '/llms.txt': '# Exemple\nDescription du site.',
      }),
      renderer: async () => staticHtml,
    });
    expect(result.score).toBe(20);
    expect(result.details).toHaveLength(3);
  });

  it('SPA bloquant les bots sans llms.txt : 0/20', async () => {
    const result = await auditAccessibility({
      url: 'https://exemple.fr/',
      staticHtml: html('<div id="root"></div>'),
      fetcher: fakeFetcher({ '/robots.txt': 'User-agent: *\nDisallow: /' }),
      renderer: async () =>
        html('<p>' + 'contenu injecté par JavaScript. '.repeat(80) + '</p>'),
    });
    expect(result.score).toBe(0);
  });

  it('renderer indisponible : 1.3 marqué non testé, l\'audit aboutit quand même', async () => {
    const result = await auditAccessibility({
      url: 'https://exemple.fr/',
      staticHtml: html('<p>contenu</p>'),
      fetcher: fakeFetcher({}),
      renderer: async () => {
        throw new Error('navigateur absent');
      },
    });
    const nojs = result.details.find((d) => d.critere.startsWith('1.3'));
    expect(nojs?.statut).toBe('non_teste');
    expect(nojs?.points_obtenus).toBe(0);
    // robots.txt absent (8) + llms.txt absent (0) + non testé (0)
    expect(result.score).toBe(8);
  });

  it('score proportionnel quand une partie des bots est bloquée', async () => {
    const result = await auditAccessibility({
      url: 'https://exemple.fr/',
      staticHtml: html('<p>texte</p>'),
      fetcher: fakeFetcher({
        '/robots.txt': 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /',
      }),
      renderer: async () => html('<p>texte</p>'),
    });
    const robots = result.details.find((d) => d.critere.startsWith('1.1'));
    expect(robots?.points_obtenus).toBeCloseTo(4.8); // 8 × 3/5
    expect(robots?.preuve).toContain('GPTBot');
    expect(robots?.preuve).toContain('CCBot');
  });
});
