# Parallax

**Audit GEO (Generative Engine Optimization) en ligne de commande. Fonctionne sans clé API.**

[Français](#français) · [English](#english)

---

## Français

Parallax mesure si votre site web est visible et citable par les LLM (ChatGPT, Claude,
Perplexity, Gemini). Le nom vient du principe astronomique de parallaxe : le décalage de
position apparent d'un objet observé depuis plusieurs points de vue — ici, chaque LLM est
un point d'observation différent.

Outil gratuit, open source (MIT), indépendant de tout vendor de scraping payant, calibré
pour le marché des PME françaises, transparent sur ses limites méthodologiques.

### Démarrage rapide

```bash
npm install -g parallax-geo
parallax audit https://exemple.fr
parallax init   # optionnel : configurer des clés API pour débloquer plus de critères
```

C'est tout : la première commande installe l'outil, la deuxième produit un audit complet
sans aucune clé API, la troisième (optionnelle) débloque les critères avancés.

> Le package n'est pas encore publié sur npm. En attendant, installation depuis les
> sources : `git clone <ce dépôt> && cd parallax && npm install && npm run build && npm link`.

> Prérequis : Node.js ≥ 20. Le critère « contenu accessible sans JavaScript » utilise
> Playwright (`npx playwright install chromium` si nécessaire) ; sans navigateur, ce
> critère est simplement marqué non testé, l'audit aboutit quand même.

### Le score

L'audit note votre site sur 100 points répartis en 5 piliers :

| Pilier | Points | Ce qui est mesuré |
| --- | --- | --- |
| 1 · Accessibilité IA | 20 | robots.txt, llms.txt, contenu sans JavaScript |
| 2 · Structure sémantique | 20 | hiérarchie Hn, Schema.org, meta/Open Graph, format Q/R |
| 3 · Citabilité du contenu | 25 | réponses directes, chiffres sourcés, définitions, fraîcheur |
| 4 · Autorité et entité | 20 | cohérence NAP, signaux E-E-A-T, sources tierces |
| 5 · Visibilité mesurée | 15 | taux de citation réel de votre marque par les LLM |

Niveaux : **vert** (≥ 70), **jaune** (≥ 40), **orange** (≥ 20), **rouge** (< 20).
Si le Pilier 1 est sous 10/20, le score est plafonné à 40 : un site inaccessible aux
crawlers IA ne peut pas être bien classé, quel que soit son contenu.

Les critères qui nécessitent une clé absente sont **exclus du calcul** (le score sur 100
est normalisé sur les points réellement testés) et listés à part dans le rapport — un
audit sans clé n'est jamais pénalisé ni interrompu.

### Les paliers : des clés API optionnelles, jamais requises

L'audit par défaut ne demande aucune clé. Les clés ne servent qu'à débloquer des critères
supplémentaires, jamais à obtenir un premier résultat.

| Palier | Clés | Ce qui est débloqué |
| --- | --- | --- |
| **0** | aucune | Piliers 1, 2, 4 (hors 4.3) et 3 (hors 3.1) — un score complet et actionnable |
| **1** | Claude | critère 3.1, réponses directes en début de section (`--with-claude`) |
| **2** | au choix | Pilier 5, visibilité mesurée (`--visibility`, au moins une clé parmi Claude, OpenAI, Gemini, Perplexity) ; critère 4.3, sources tierces françaises (`--deep`, clé SerpAPI, à venir) |

Configuration : `parallax init` (stockage local dans `.parallax/config.json`, ignoré par
git) ou variables d'environnement (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`GEMINI_API_KEY`, `PERPLEXITY_API_KEY`).

**Quel fournisseur pour le Pilier 5 ?** Gemini est le seul des quatre à afficher un
palier gratuit permanent (modèles Flash, sans carte bancaire) — c'est le point d'entrée
conseillé sur le papier. Nuance importante constatée sur le terrain : sur certains
comptes européens, Google exige une facturation active pour l'API de génération
(`403 PERMISSION_DENIED` / `BILLING_DISABLED`), ce qui neutralise le palier gratuit.
Si vous êtes dans ce cas, une clé Claude ou OpenAI (payantes, quelques centimes par
audit avec le cache d'une journée) est le chemin le plus fiable.

### Le Pilier 5 en pratique

```bash
parallax audit https://exemple.fr --visibility --queries mes-requetes.yaml
```

Le fichier de requêtes décrit votre client idéal (voir
[`examples/queries.example.yaml`](examples/queries.example.yaml)) :

```yaml
brand: "MaMarque"
domain: "mamarque.fr"
queries:
  - text: "meilleur outil de conformité AI Act pour PME"
    category: "conformite"
```

Chaque requête est envoyée à chaque fournisseur configuré ; l'outil détecte votre marque
dans les réponses (regex + fuzzy matching) et calcule le taux de citation. Les réponses
sont mises en cache une journée (`.parallax/cache.sqlite`), le rate limiting est intégré.

Note de transparence : la mesure passe par les APIs officielles des modèles, pas par les
interfaces utilisateur réelles (ChatGPT.com, Perplexity.ai). Les réponses peuvent différer
de ce que voit un utilisateur final. C'est un choix assumé — gratuit, indépendant de tout
vendor de scraping, conforme aux conditions d'utilisation des plateformes.

### Exports

```bash
parallax audit https://exemple.fr --json rapport.json --markdown rapport.md
```

Le JSON suit le schéma documenté dans
[`docs/scoring-methodology.md`](docs/scoring-methodology.md) (la grille de scoring
complète, critère par critère). Le markdown reprend le même contenu, mis en forme.

### Limites connues (v1)

- **Audit mono-page** : seule l'URL fournie est analysée (plus les pages contact et
  mentions légales du même domaine pour le NAP et le SIRET). Auditez la page la plus
  représentative de votre site — en général la page d'accueil.
- **Pilier 5 validé en réel uniquement avec Claude.** Les intégrations OpenAI, Gemini
  et Perplexity sont implémentées et testées unitairement, mais n'ont pas encore été
  exercées de bout en bout avec de vraies clés (Gemini : voir la nuance facturation UE
  ci-dessus). Retour d'expérience bienvenu en issue.
- **Sous-critère 4.3 non implémenté** (présence sur sources tierces françaises) : le
  flag `--deep` est expérimental, le critère apparaît toujours « non testé » et est
  exclu du calcul.

### Licence

MIT.

---

## English

**Command-line GEO (Generative Engine Optimization) audit. Works without any API key.**

Parallax measures whether your website is visible and citable by LLMs (ChatGPT, Claude,
Perplexity, Gemini). The name comes from the astronomical principle of parallax: the
apparent shift in position of an object observed from several vantage points — here,
each LLM is a different vantage point.

Free, open source (MIT), independent from any paid scraping vendor, calibrated for the
French SMB market (NAP checks, SIRET, French directories and press), and transparent
about its methodological limits.

### Quickstart

```bash
npm install -g parallax-geo
parallax audit https://example.com
parallax init   # optional: configure API keys to unlock more criteria
```

That's it: install, run a full audit with zero API keys, and optionally unlock the
advanced criteria.

> Not yet published to npm. Meanwhile, install from source:
> `git clone <this repo> && cd parallax && npm install && npm run build && npm link`.

> Requires Node.js ≥ 20. The "content without JavaScript" criterion uses Playwright
> (`npx playwright install chromium` if needed); without a browser the criterion is
> simply marked untested and the audit still completes.

### Scoring

Your site is scored out of 100 points across 5 pillars: AI accessibility (20), semantic
structure (20), content citability (25), authority & entity (20), measured visibility
(15). Levels: **green** (≥ 70), **yellow** (≥ 40), **orange** (≥ 20), **red** (< 20).
If pillar 1 scores below 10/20, the total is capped at 40 — a site AI crawlers cannot
read will not rank, whatever its content.

Criteria that would need a missing key are **excluded from the computation** (the /100
score is normalized over the points actually tested) and listed separately in the
report — an audit without keys is never penalized nor interrupted.

### Tiers: API keys are optional, never required

| Tier | Keys | Unlocks |
| --- | --- | --- |
| **0** | none | pillars 1, 2, 4 (except 4.3) and 3 (except 3.1) — a complete, actionable score |
| **1** | Claude | criterion 3.1, direct answers at the top of each section (`--with-claude`) |
| **2** | your pick | pillar 5, measured visibility (`--visibility`, any of Claude, OpenAI, Gemini, Perplexity); criterion 4.3, third-party sources (`--deep`, SerpAPI key, upcoming) |

Configure with `parallax init` or environment variables (`ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`).

**Which provider for pillar 5?** Gemini is the only one of the four advertising a
permanent free tier (Flash models, no credit card) — on paper the recommended entry
point. Important field-tested caveat: on some European accounts, Google requires active
billing for the generation API (`403 PERMISSION_DENIED` / `BILLING_DISABLED`), which
voids the free tier. In that case a Claude or OpenAI key (paid, a few cents per audit
thanks to the one-day cache) is the most reliable path.

### Pillar 5 in practice

```bash
parallax audit https://example.com --visibility --queries my-queries.yaml
```

The queries file describes your ideal customer profile (see
[`examples/queries.example.yaml`](examples/queries.example.yaml)). Each query is sent to
every configured provider; brand mentions are detected (regex + fuzzy matching) and the
citation rate is computed. Responses are cached for a day, rate limiting is built in.

Transparency note: measurements go through the models' official APIs, not the real user
interfaces (ChatGPT.com, Perplexity.ai). Answers may differ from what an end user sees.
This is a deliberate trade-off — free, vendor-independent, and compliant with the
platforms' terms of service.

### Exports

```bash
parallax audit https://example.com --json report.json --markdown report.md
```

The JSON follows the schema documented in
[`docs/scoring-methodology.md`](docs/scoring-methodology.md) (the full scoring grid, in
French). The markdown export renders the same content for humans.

### Known limitations (v1)

- **Single-page audit**: only the given URL is analyzed (plus same-domain contact and
  legal pages for NAP/SIRET checks). Audit your most representative page.
- **Pillar 5 validated end-to-end with Claude only.** OpenAI, Gemini and Perplexity
  integrations are implemented and unit-tested but not yet exercised with real keys
  (Gemini: see the EU billing caveat above). Feedback welcome via issues.
- **Criterion 4.3 not implemented** (third-party French sources): the `--deep` flag is
  experimental, the criterion always shows as untested and is excluded from the score.

### License

MIT.
