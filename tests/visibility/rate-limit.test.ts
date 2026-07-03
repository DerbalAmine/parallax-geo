import { describe, expect, it } from 'vitest';

import { RateLimiter } from '../../src/visibility/rate-limit.js';

/** Horloge factice avancée par un sleep factice — aucun vrai délai. */
function fakeClock() {
  let time = 0;
  const sleeps: number[] = [];
  return {
    now: () => time,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      time += ms;
    },
    advance: (ms: number) => {
      time += ms;
    },
    sleeps,
  };
}

describe('RateLimiter', () => {
  it('ne dort pas au premier appel', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(1000, clock.sleep, clock.now);
    await limiter.wait();
    expect(clock.sleeps).toEqual([]);
  });

  it('impose l\'intervalle entre deux appels rapprochés', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(1000, clock.sleep, clock.now);
    await limiter.wait();
    clock.advance(300);
    await limiter.wait();
    expect(clock.sleeps).toEqual([700]);
  });

  it('ne dort pas si l\'intervalle est déjà écoulé', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(1000, clock.sleep, clock.now);
    await limiter.wait();
    clock.advance(1500);
    await limiter.wait();
    expect(clock.sleeps).toEqual([]);
  });

  it('série d\'appels : chaque appel respecte l\'intervalle', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(500, clock.sleep, clock.now);
    for (let i = 0; i < 4; i++) await limiter.wait();
    expect(clock.sleeps).toEqual([500, 500, 500]);
  });
});
