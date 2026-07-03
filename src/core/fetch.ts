/**
 * Couche réseau injectable : les analyseurs reçoivent un `Fetcher` plutôt
 * que d'appeler fetch directement, pour rester testables sans réseau.
 */

export const USER_AGENT =
  'parallax-geo/0.1 (audit GEO open source; +https://github.com/parallax-geo)';

export interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
}

export type Fetcher = (url: string) => Promise<FetchResult>;

/** Fetcher réel : fetch natif, timeout 15 s, suit les redirections. */
export const httpFetch: Fetcher = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8',
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  } catch {
    // Réseau injoignable, DNS, timeout : traité comme une ressource absente.
    return { ok: false, status: 0, body: '' };
  }
};
