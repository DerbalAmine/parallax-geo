/**
 * Rendu JavaScript complet via Playwright (sous-critère 1.3).
 *
 * Injectable comme le Fetcher : les tests fournissent un `Renderer` factice.
 * Import dynamique de playwright pour ne payer son chargement que si le
 * rendu est réellement demandé.
 */

export type Renderer = (url: string) => Promise<string>;

export class RendererIndisponibleError extends Error {
  constructor(cause: unknown) {
    super(
      'Navigateur Playwright indisponible — exécutez « npx playwright install chromium ».',
      { cause },
    );
    this.name = 'RendererIndisponibleError';
  }
}

export const renderWithPlaywright: Renderer = async (url) => {
  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new RendererIndisponibleError(err);
  }
  try {
    const page = await browser.newPage();
    // networkidle peut ne jamais survenir (analytics, websockets) : on
    // capture alors l'état atteint au timeout plutôt que d'échouer.
    await page
      .goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      .catch(() => {});
    return await page.content();
  } finally {
    await browser.close();
  }
};
