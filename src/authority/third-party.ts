/**
 * 4.3 Présence sur sources tierces françaises (8 points, flag --deep).
 *
 * Trois recherches SerpAPI sur le nom d'entité (Schema.org, à défaut racine
 * du domaine) : Wikipedia (2 pts), annuaires français reconnus — Societe.com,
 * Infogreffe, Pages Jaunes, Kompass (2 pts), presse française via la
 * recherche d'actualités (4 pts : ≥ 3 articles, 2 pts : 1-2 articles).
 * Toute erreur d'API marque le critère « non testé » sans interrompre l'audit.
 */

const SERPAPI_URL = 'https://serpapi.com/search.json';
const TIMEOUT_MS = 30_000;

/** Une recherche = un objet de paramètres SerpAPI, injectable pour les tests. */
export type SearchFn = (params: Record<string, string>) => Promise<unknown>;

export function serpApiSearch(apiKey: string): SearchFn {
  return async (params) => {
    const qs = new URLSearchParams({ ...params, api_key: apiKey });
    const res = await fetch(`${SERPAPI_URL}?${qs}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = (await res.text()).replace(/\s+/g, ' ').trim().slice(0, 300);
      throw new Error(`SerpAPI HTTP ${res.status} — ${detail}`);
    }
    return res.json();
  };
}

const ANNUAIRES = ['societe.com', 'infogreffe.fr', 'pagesjaunes.fr', 'kompass.com'];

interface OrganicResult {
  link?: unknown;
}

function organicLinks(data: unknown): string[] {
  const results = (data as { organic_results?: OrganicResult[] })?.organic_results;
  return (results ?? [])
    .map((r) => (typeof r.link === 'string' ? r.link : ''))
    .filter(Boolean);
}

function newsCount(data: unknown): { count: number; sources: string[] } {
  const results = (data as { news_results?: Array<{ link?: unknown }> })
    ?.news_results;
  const links = (results ?? [])
    .map((r) => (typeof r.link === 'string' ? r.link : ''))
    .filter(Boolean);
  const sources = [...new Set(links.map((l) => new URL(l).hostname.replace(/^www\./, '')))];
  return { count: links.length, sources };
}

export interface ThirdPartyEvaluation {
  points: number;
  preuve: string;
}

export async function evaluateThirdParty(
  entityName: string,
  search: SearchFn,
): Promise<ThirdPartyEvaluation> {
  const fr = { gl: 'fr', hl: 'fr' };

  // Wikipedia (2 pts)
  const wiki = await search({
    engine: 'google',
    q: `"${entityName}" site:wikipedia.org`,
    ...fr,
  });
  const wikiLink = organicLinks(wiki).find((l) => l.includes('wikipedia.org'));

  // Annuaires français (2 pts)
  const annuaires = await search({
    engine: 'google',
    q: `"${entityName}" ${ANNUAIRES.map((d) => `site:${d}`).join(' OR ')}`,
    ...fr,
  });
  const annuaireHits = [
    ...new Set(
      organicLinks(annuaires)
        .map((l) => ANNUAIRES.find((d) => l.includes(d)))
        .filter((d): d is string => Boolean(d)),
    ),
  ];

  // Presse française (4 pts : ≥ 3 articles ; 2 pts : 1-2)
  const presse = await search({
    engine: 'google',
    q: `"${entityName}"`,
    tbm: 'nws',
    ...fr,
  });
  const news = newsCount(presse);
  const pointsPresse = news.count >= 3 ? 4 : news.count >= 1 ? 2 : 0;

  const points = (wikiLink ? 2 : 0) + (annuaireHits.length ? 2 : 0) + pointsPresse;
  const preuve =
    `entité « ${entityName} » — Wikipedia : ${wikiLink ? `oui (${wikiLink})` : 'non'} ; ` +
    `annuaires : ${annuaireHits.length ? annuaireHits.join(', ') : 'aucun'} ; ` +
    `presse : ${news.count} article(s)${news.sources.length ? ` (${news.sources.slice(0, 3).join(', ')})` : ''}`;
  return { points, preuve };
}

/** Nom de repli quand aucun Schema.org Organization ne déclare de nom. */
export function entityNameFromUrl(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host.split('.').slice(0, -1).join('.') || host;
}
