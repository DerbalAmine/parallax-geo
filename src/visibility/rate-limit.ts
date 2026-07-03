/**
 * Rate limiting explicite par fournisseur (note technique de la grille) :
 * un intervalle minimal entre deux appels au même fournisseur, pour
 * maîtriser les coûts et respecter les quotas (notamment le palier
 * gratuit Gemini). Horloge et sommeil injectables pour les tests.
 */

export type Sleep = (ms: number) => Promise<void>;

export const realSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private lastCall = -Infinity;

  constructor(
    private readonly intervalMs: number,
    private readonly sleep: Sleep = realSleep,
    private readonly now: () => number = Date.now,
  ) {}

  /** Attend le temps nécessaire pour respecter l'intervalle, puis réserve le créneau. */
  async wait(): Promise<void> {
    const elapsed = this.now() - this.lastCall;
    if (elapsed < this.intervalMs) {
      await this.sleep(this.intervalMs - elapsed);
    }
    this.lastCall = this.now();
  }
}
