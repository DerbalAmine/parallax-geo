/**
 * Fournisseurs LLM du Pilier 5 : Claude, OpenAI, Gemini, Perplexity.
 * Seuls les fournisseurs avec une clé configurée sont construits ; les
 * autres sont retournés dans `missing` pour être marqués « non testé,
 * clé API absente » dans le rapport.
 *
 * Modèles : volontairement légers/économiques — la mesure porte sur la
 * présence de la marque dans une réponse type, pas sur la qualité maximale.
 * Intervalles de rate limiting calés sur les quotas d'entrée de gamme
 * (Gemini : palier gratuit ≈ 10-15 requêtes/minute).
 */

import type { KeyRing, ProviderId } from '../core/keys.js';

export interface VisibilityProvider {
  id: Extract<ProviderId, 'claude' | 'openai' | 'gemini' | 'perplexity'>;
  label: string;
  model: string;
  /** Intervalle minimal entre deux appels (rate limiting explicite). */
  minIntervalMs: number;
  ask(query: string): Promise<string>;
}

const TIMEOUT_MS = 60_000;

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text()).replace(/\s+/g, ' ').trim().slice(0, 600);
    throw new Error(`HTTP ${res.status} — ${detail}`);
  }
  return res.json();
}

/** Extrait choices[0].message.content (format OpenAI/Perplexity). */
function openAiStyleText(data: unknown): string {
  const content = (data as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Réponse API sans contenu texte');
  return content;
}

export function claudeProvider(apiKey: string): VisibilityProvider {
  return {
    id: 'claude',
    label: 'Claude (Anthropic)',
    model: 'claude-haiku-4-5',
    minIntervalMs: 1_000,
    async ask(query) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: query }],
      });
      return response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
    },
  };
}

export function openaiProvider(apiKey: string): VisibilityProvider {
  return {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    model: 'gpt-4o-mini',
    minIntervalMs: 1_000,
    async ask(query) {
      const data = await postJson(
        'https://api.openai.com/v1/chat/completions',
        { authorization: `Bearer ${apiKey}` },
        {
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: query }],
        },
      );
      return openAiStyleText(data);
    },
  };
}

export function geminiProvider(apiKey: string): VisibilityProvider {
  // Les clés « Vertex AI express » (préfixe AQ.) sont refusées par l'API
  // Gemini classique ; seul l'endpoint Vertex les accepte. Même schéma de
  // requête/réponse (GenerateContent) dans les deux cas.
  const url = apiKey.startsWith('AQ.')
    ? (model: string) =>
        `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`
    : (model: string) =>
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return {
    id: 'gemini',
    label: 'Gemini (Google)',
    model: 'gemini-2.5-flash',
    // Palier gratuit permanent ≈ 10 req/min : on reste large.
    minIntervalMs: 6_500,
    async ask(query) {
      const data = await postJson(
        url(this.model),
        { 'x-goog-api-key': apiKey },
        { contents: [{ role: 'user', parts: [{ text: query }] }] },
      );
      const parts = (
        data as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
        }
      )?.candidates?.[0]?.content?.parts;
      const text = (parts ?? [])
        .map((p) => (typeof p.text === 'string' ? p.text : ''))
        .join('');
      if (!text) throw new Error('Réponse API sans contenu texte');
      return text;
    },
  };
}

export function perplexityProvider(apiKey: string): VisibilityProvider {
  return {
    id: 'perplexity',
    label: 'Perplexity',
    model: 'sonar',
    minIntervalMs: 1_500,
    async ask(query) {
      const data = await postJson(
        'https://api.perplexity.ai/chat/completions',
        { authorization: `Bearer ${apiKey}` },
        { model: this.model, messages: [{ role: 'user', content: query }] },
      );
      return openAiStyleText(data);
    },
  };
}

export interface BuiltProviders {
  providers: VisibilityProvider[];
  missing: Array<{ id: ProviderId; label: string }>;
}

export function buildProviders(ring: KeyRing): BuiltProviders {
  const providers: VisibilityProvider[] = [];
  const missing: BuiltProviders['missing'] = [];

  if (ring.claude) providers.push(claudeProvider(ring.claude.key));
  else missing.push({ id: 'claude', label: 'Claude (Anthropic)' });

  if (ring.openai) providers.push(openaiProvider(ring.openai.key));
  else missing.push({ id: 'openai', label: 'OpenAI (ChatGPT)' });

  if (ring.gemini) providers.push(geminiProvider(ring.gemini.key));
  else missing.push({ id: 'gemini', label: 'Gemini (Google)' });

  if (ring.perplexity) providers.push(perplexityProvider(ring.perplexity.key));
  else missing.push({ id: 'perplexity', label: 'Perplexity' });

  return { providers, missing };
}
