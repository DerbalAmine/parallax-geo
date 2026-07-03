/**
 * Fournisseurs d'API reconnus par Parallax et détection des clés.
 *
 * Règle de résolution : variable d'environnement > fichier de config locale.
 * L'absence de clé n'est jamais une erreur — les critères concernés sont
 * simplement marqués « non testé, clé API absente » dans le rapport.
 */

export type ProviderId =
  | 'claude'
  | 'openai'
  | 'gemini'
  | 'perplexity'
  | 'serpapi';

export interface ProviderInfo {
  id: ProviderId;
  /** Nom affiché dans le CLI. */
  label: string;
  /** Variables d'environnement acceptées, par ordre de priorité. */
  envVars: string[];
  /** Ce que la clé débloque, affiché dans `parallax init`. */
  unlocks: string;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    envVars: ['ANTHROPIC_API_KEY'],
    unlocks: 'Sous-critère 3.1 (--with-claude, +7 points) et Pilier 5',
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    envVars: ['OPENAI_API_KEY'],
    unlocks: 'Pilier 5 (--visibility)',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google) — palier gratuit permanent, fournisseur recommandé',
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    unlocks: 'Pilier 5 (--visibility)',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    envVars: ['PERPLEXITY_API_KEY'],
    unlocks: 'Pilier 5 (--visibility)',
  },
  {
    id: 'serpapi',
    label: 'SerpAPI',
    envVars: ['SERPAPI_API_KEY', 'SERPAPI_KEY'],
    unlocks: 'Sous-critère 4.3, sources tierces françaises (--deep)',
  },
] as const;

export type KeySource = 'env' | 'config';

export interface ResolvedKey {
  provider: ProviderId;
  key: string;
  source: KeySource;
  /** Nom de la variable d'environnement utilisée, si source === 'env'. */
  envVar?: string;
}

export type KeyRing = Partial<Record<ProviderId, ResolvedKey>>;

/** Contenu du fichier `.parallax/config.json` (clés stockées localement). */
export interface FileConfig {
  keys?: Partial<Record<ProviderId, string>>;
}

export type Env = Record<string, string | undefined>;

/** Détecte les clés présentes dans l'environnement pour un fournisseur. */
export function detectEnvKey(
  provider: ProviderInfo,
  env: Env,
): ResolvedKey | undefined {
  for (const envVar of provider.envVars) {
    const value = env[envVar]?.trim();
    if (value) {
      return { provider: provider.id, key: value, source: 'env', envVar };
    }
  }
  return undefined;
}

/**
 * Résout l'ensemble des clés disponibles.
 * L'environnement a priorité sur le fichier de configuration.
 */
export function resolveKeys(env: Env, fileConfig: FileConfig = {}): KeyRing {
  const ring: KeyRing = {};
  for (const provider of PROVIDERS) {
    const fromEnv = detectEnvKey(provider, env);
    if (fromEnv) {
      ring[provider.id] = fromEnv;
      continue;
    }
    const fromFile = fileConfig.keys?.[provider.id]?.trim();
    if (fromFile) {
      ring[provider.id] = {
        provider: provider.id,
        key: fromFile,
        source: 'config',
      };
    }
  }
  return ring;
}

/** Au moins une clé parmi les quatre fournisseurs LLM (requis pour --visibility). */
export function hasVisibilityProvider(ring: KeyRing): boolean {
  return (['claude', 'openai', 'gemini', 'perplexity'] as const).some(
    (id) => ring[id] !== undefined,
  );
}
