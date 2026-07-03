import { describe, expect, it } from 'vitest';

import {
  evaluateRobots,
  parseRobotsGroups,
} from '../../src/accessibility/robots.js';

describe('parseRobotsGroups', () => {
  it('regroupe les User-agent consécutifs dans un même bloc', () => {
    const groups = parseRobotsGroups(
      'User-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: *\nDisallow:',
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.agents).toEqual(['gptbot', 'ccbot']);
    expect(groups[0]?.disallow).toEqual(['/']);
    expect(groups[1]?.agents).toEqual(['*']);
  });

  it('ignore les commentaires et les lignes invalides', () => {
    const groups = parseRobotsGroups(
      '# bloc\nUser-agent: GPTBot # bot OpenAI\nDisallow: / # tout\nn importe quoi',
    );
    expect(groups[0]?.agents).toEqual(['gptbot']);
    expect(groups[0]?.disallow).toEqual(['/']);
  });
});

describe('evaluateRobots', () => {
  it('robots.txt absent : les 5 bots sont autorisés, 8 points', () => {
    const res = evaluateRobots(null);
    expect(res.allowed).toBe(5);
    expect(res.tested).toBe(5);
    expect(res.points).toBe(8);
  });

  it('robots.txt vide ou sans blocage : 8 points', () => {
    const res = evaluateRobots('User-agent: *\nDisallow:\nAllow: /');
    expect(res.points).toBe(8);
  });

  it('User-agent: * avec Disallow: / bloque les 5 bots', () => {
    const res = evaluateRobots('User-agent: *\nDisallow: /');
    expect(res.allowed).toBe(0);
    expect(res.points).toBe(0);
  });

  it('un bloc spécifique GPTBot ne bloque que GPTBot', () => {
    const res = evaluateRobots('User-agent: GPTBot\nDisallow: /');
    expect(res.allowed).toBe(4);
    expect(res.points).toBeCloseTo(8 * (4 / 5));
    expect(res.verdicts.find((v) => v.bot === 'GPTBot')?.blocked).toBe(true);
  });

  it('reconnaît l\'alias anthropic-ai pour ClaudeBot', () => {
    const res = evaluateRobots('User-agent: anthropic-ai\nDisallow: /');
    expect(res.verdicts.find((v) => v.bot === 'ClaudeBot')?.blocked).toBe(true);
    expect(res.allowed).toBe(4);
  });

  it('un bloc spécifique permissif l\'emporte sur un * bloquant', () => {
    const res = evaluateRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nDisallow:',
    );
    const gptbot = res.verdicts.find((v) => v.bot === 'GPTBot');
    expect(gptbot?.blocked).toBe(false);
    expect(res.allowed).toBe(1);
  });

  it('un Disallow partiel (/private) ne compte pas comme blocage', () => {
    const res = evaluateRobots('User-agent: GPTBot\nDisallow: /private');
    expect(res.allowed).toBe(5);
    expect(res.points).toBe(8);
  });

  it('la casse des User-agent est ignorée', () => {
    const res = evaluateRobots('User-agent: gptbot\nDisallow: /');
    expect(res.verdicts.find((v) => v.bot === 'GPTBot')?.blocked).toBe(true);
  });
});
