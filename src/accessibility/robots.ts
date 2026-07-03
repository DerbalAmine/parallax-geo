/**
 * Sous-critère 1.1 — Robots.txt n'exclut pas les crawlers IA (8 points).
 *
 * Méthode (docs/scoring-methodology.md) : parsing des blocs User-agent pour
 * GPTBot, ClaudeBot (anthropic-ai), PerplexityBot, Google-Extended, CCBot.
 * Score = 8 × (bots autorisés / bots testés). Un `Disallow: /` compte comme
 * bloqué pour le bot visé.
 *
 * Sémantique robots.txt appliquée : un bot obéit à son bloc spécifique s'il
 * existe, sinon au bloc `User-agent: *`, sinon il est autorisé.
 */

export interface AiBot {
  name: string;
  /** Tokens User-agent acceptés, en minuscules. */
  tokens: string[];
}

export const AI_BOTS: readonly AiBot[] = [
  { name: 'GPTBot', tokens: ['gptbot'] },
  { name: 'ClaudeBot', tokens: ['claudebot', 'anthropic-ai'] },
  { name: 'PerplexityBot', tokens: ['perplexitybot'] },
  { name: 'Google-Extended', tokens: ['google-extended'] },
  { name: 'CCBot', tokens: ['ccbot'] },
] as const;

export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

/** Regroupe les directives par bloc User-agent (agents consécutifs partagés). */
export function parseRobotsGroups(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = /^([a-z][a-z-]*)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1]!.toLowerCase();
    const value = (match[2] ?? '').trim();

    if (field === 'user-agent') {
      if (!lastLineWasAgent || !current) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
    } else {
      lastLineWasAgent = false;
      if (!current) continue;
      if (field === 'disallow') current.disallow.push(value);
      else if (field === 'allow') current.allow.push(value);
    }
  }
  return groups;
}

export interface BotVerdict {
  bot: string;
  blocked: boolean;
  /** Bloc appliqué : token spécifique, '*', ou 'aucun'. */
  via: string;
}

export function verdictForBot(groups: RobotsGroup[], bot: AiBot): BotVerdict {
  const specific = groups.filter((g) =>
    g.agents.some((a) => bot.tokens.includes(a)),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((g) => g.agents.includes('*'));

  if (!applicable.length) {
    return { bot: bot.name, blocked: false, via: 'aucun' };
  }
  const blocked = applicable.some((g) => g.disallow.some((d) => d === '/'));
  return {
    bot: bot.name,
    blocked,
    via: specific.length ? bot.tokens.join('/') : '*',
  };
}

export interface RobotsEvaluation {
  verdicts: BotVerdict[];
  allowed: number;
  tested: number;
  /** 8 × (autorisés / testés). */
  points: number;
}

/** `content = null` : robots.txt absent ou injoignable ⇒ aucun blocage. */
export function evaluateRobots(content: string | null): RobotsEvaluation {
  const groups = content === null ? [] : parseRobotsGroups(content);
  const verdicts = AI_BOTS.map((bot) => verdictForBot(groups, bot));
  const allowed = verdicts.filter((v) => !v.blocked).length;
  const tested = verdicts.length;
  return { verdicts, allowed, tested, points: (8 * allowed) / tested };
}
