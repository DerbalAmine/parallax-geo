# Changelog

Toutes les décisions d'architecture notables sont documentées ici au fil de l'eau.

## [Non publié]

### Validation partie a — cohérence des Piliers 1-4 (2026-07-04)

Protocole : évaluation qualitative en aveugle de l'hygiène technique GEO
(structure Hn, richesse Schema.org, fraîcheur, sourcing des chiffres) des
9 sites du panel, par 9 agents indépendants analysant uniquement le HTML
brut, sans accès aux scores de l'outil. Échelle : faible / moyen / bon /
excellent. Comparaison ensuite avec le score de préparation (Piliers 1-4).

| Site | Jugement aveugle | Score outil /100 |
| --- | --- | --- |
| webtensor.fr | bon | 67,6 |
| complypme.fr | moyen | 60,3 |
| legalstart.fr | moyen | 52 |
| qonto.com | moyen | 51,1 |
| sitehop.fr | moyen | 49,6 |
| anthropic.com | moyen | 40,1 |
| expertise-bp.fr | **faible** | **57** ← anomalie |
| doctolib.fr | faible | 38,6 |
| hr-associes.fr | faible | 37,7 |

**Verdict : cohérent dans l'ensemble.** Moyennes par groupe monotones —
faible 44,4 < moyen 50,6 < bon 67,6 — et 8 sites sur 9 correctement
ordonnés (le « bon » domine tous les « moyens », qui dominent les
« faibles »), à une exception près.

**Écart identifié : expertise-bp.fr (jugé faible, scoré 57), causé par
deux artefacts de critères, vérifiés :**

1. **1.2 faux positif soft-404** : le site renvoie sa page HTML avec un
   code 200 pour n'importe quel chemin — l'outil a validé « /llms.txt
   présent (46 352 caractères) » alors que c'est la page d'accueil
   (content-type text/html, vérifié au curl). +5 points indus. Correctif
   à prévoir : exiger un content-type texte ou rejeter un contenu qui
   commence par du HTML.
2. **3.2 faux positifs sur les data points** : « 22/49 data points sourcés
   sur 1180 mots (densité 18,6/1000) ⇒ 7/7 » alors que l'évaluation
   aveugle ne trouve aucun chiffre sourcé — les numéros de téléphone,
   codes postaux et le SIRET comptent comme data points, et la proximité
   d'un simple lien de navigation vaut « source ». Le même artefact donne
   7/7 à doctolib.fr sur 151 mots de footer (3/3 data points « sourcés »
   par des liens de navigation, densité 19,9/1000) : sur une page quasi
   vide, une base de texte minuscule gonfle la densité. Correctifs à
   prévoir : plancher de mots avant de calculer la densité, exclusion des
   motifs téléphone/code postal/SIRET, et « source » restreinte aux liens
   externes ou aux expressions de sourcing.

Corrigé de ces deux artefacts, expertise-bp.fr redescendrait à ≈ 40/100,
sous tous les « moyens » — l'ordre serait alors intégralement cohérent.

### Validation partie b — cohérence du Pilier 5 (2026-07-04)

Vérification manuelle effectuée par l'utilisateur sur les interfaces
réelles (ChatGPT.com, Perplexity.ai) : Doctolib et Qonto sont cités sur
leurs questions sectorielles (rendez-vous médical, banque en ligne),
ComplyPME est absent sur les siennes. **Résultat cohérent** avec la mesure
API du Pilier 5 (Doctolib/Qonto cités par l'API Claude sur les mêmes types
de requêtes lors du pré-test du panel, ComplyPME 0/5 sur ses requêtes
ICP). Les deux parties du protocole de validation sont donc exécutées et
concluantes.

### Repositionnement du score + validation invalidée + 4.3 (2026-07-04)

- **La validation « cités vs non cités » sur le score composite est invalidée
  et retirée comme preuve de fiabilité.** Protocole exécuté : prémisse
  vérifiée avec l'API Claude (5 sites notoires cités dans leur niche, 5
  petits sites non cités), audits palier 0 sur les 10. Résultat inversé :
  cités 45,4/100 de moyenne (doctolib 38,6, legalstart 52, qonto 51,1,
  anthropic 40,1), non cités 54,4/100 (complypme 60,3, expertise-bp 57,
  sitehop 49,6, webtensor 67,6, hr-associes 37,7). Causes : le critère
  réellement corrélé à la citation (4.3, présence tierce) n'était pas
  implémenté ; llms.txt (5 pts) n'est adopté par aucun site notoire ; les
  petits sites vitrines statiques passent trivialement le Pilier 1. malt.fr
  et blablacar.fr, très cités, n'ont pas pu être audités (anti-bot, 403).
- **Nouveau positionnement (décision produit)** : le score composite mesure
  la préparation technique GEO, pas la probabilité de citation — paragraphe
  ajouté à la grille, README FR/EN mis à jour. Le Pilier 5 devient un signal
  complémentaire rapporté à part : « Score de préparation GEO x/100 »
  (Piliers 1-4 normalisés) et « Citation mesurée aujourd'hui x/n requêtes »
  (CLI, JSON `citation_mesuree`, markdown) — plus jamais un seul chiffre qui
  mélange les deux. Les recommandations ne portent que sur les leviers
  techniques des Piliers 1-4.
- **Nouveau protocole de validation** (remplace l'ancien, documenté dans la
  grille) : (a) cohérence des Piliers 1-4 — évaluation manuelle de l'hygiène
  technique de 5 sites par un humain, indépendamment de leur notoriété,
  comparée au classement de l'outil ; (b) cohérence du Pilier 5 —
  vérification manuelle sur ChatGPT.com et Perplexity.ai pour 3 marques
  connues et 3 inconnues, comparée au taux mesuré par API. À exécuter avant
  le tag v1.
- **4.3 implémenté** (amélioration indépendante, pas un correctif de la
  validation) : trois recherches SerpAPI sur le nom d'entité (Schema.org, à
  défaut racine du domaine) — Wikipedia 2 pts, annuaires français
  (Societe.com, Infogreffe, Pages Jaunes, Kompass) 2 pts, presse via
  actualités 4 pts (≥ 3 articles ; 2 pts pour 1-2). Recherche injectable
  (tests sans réseau), erreur SerpAPI ⇒ non testé sans interrompre l'audit.
  Non validé en réel faute de clé SerpAPI sur la machine.

### Pré-publication v1 (2026-07-04)

- **npm** : le package n'est pas encore publié (aucune session npm sur la
  machine, pas encore de remote GitHub) — le README documente l'installation
  depuis les sources (`npm install && npm run build && npm link`) en
  attendant `npm publish`.
- **CI GitHub Actions** : `.github/workflows/ci.yml` — npm ci, build, tests
  sur chaque push et pull request (Node 20, ubuntu-latest).
- **`langue_detectee` branché** (critère 4.4, métadonnée non notée) :
  dépendance `franc` sur le texte extrait de la page ; codes ISO 639-3
  ramenés aux codes courts usuels (fr, en, de…), `indeterminee` sous
  50 caractères ou si franc ne tranche pas.
- **`--deep` marqué EXPÉRIMENTAL** dans l'aide du CLI (4.3 non implémenté,
  toujours « non testé ») et section « Limites connues v1 » ajoutée au
  README (mono-page, Pilier 5 validé en réel sur Claude uniquement, 4.3).

### Phase 6 — Score final, exports, README (2026-07-04)

- **Score global /100 avec normalisation (décision produit, documentée dans la
  grille)** : les critères non testés sont exclus du calcul — le score sur 100
  vaut score_brut / score_max_teste × 100, pour qu'un audit palier 0 puisse
  atteindre tous les niveaux sans être pénalisé par les critères à clé API.
  Ils sont listés à part dans le rapport (terminal, JSON `criteres_non_testes`,
  markdown) avec leur raison. Le Pilier 5 sans `--visibility` apparaît
  désormais comme critère non testé (schéma JSON stable dans tous les cas).
- **Plafond conditionnel** : Pilier 1 < 10/20 ⇒ score plafonné à 40, message
  exact de la grille affiché en rouge (terminal), en blockquote (markdown) et
  via `plafond_applique` (JSON). Si un critère du Pilier 1 est non testé
  (Playwright absent), le seuil s'évalue au prorata des points testés.
- **Niveaux** vert (≥ 70) / jaune (≥ 40) / orange (≥ 20) / rouge, colorés dans
  le terminal.
- **Recommandations** : une par critère testé où des points manquent, triées
  par points manquants décroissants ; priorité haute ≥ 4 pts, moyenne ≥ 2,
  basse en dessous ; action concrète par critère (table dans
  src/core/recommendations.ts) avec les points récupérables affichés.
- **Exports** : JSON conforme au schéma de la grille (enrichi de score_brut,
  score_max_teste, criteres_non_testes — schéma mis à jour dans la doc) ;
  export markdown complet (`--markdown <fichier>`) : piliers en tableaux,
  message de plafond, non testés, recommandations, note de transparence si le
  Pilier 5 a tourné.
- **README bilingue** (français d'abord) : « fonctionne sans clé API » en
  tête, quickstart en 3 commandes, paliers 0/1/2, recommandation Gemini
  nuancée par la contrainte de facturation UE constatée le même jour.

### Diagnostic Gemini + correctifs de visibilité des erreurs (2026-07-04)

- **Gemini reste bloqué pour cette v1 ; Claude est la validation réelle du
  Pilier 5.** Constats du diagnostic (clés AI Studio réelles, deux comptes,
  trois projets Google) : les nouvelles clés AI Studio sont au format
  « auth key » `AQ.` (format officiel 2026, remplace `AIza`) ; sur l'API
  Gemini classique, la liste des modèles répond mais `generateContent`
  renvoie `403 PERMISSION_DENIED — "Your project has been denied access"`
  (blocage projet non documenté, connu des forums Google) ; le chemin
  alternatif Vertex exige la facturation (`403 BILLING_DISABLED`) — en
  pratique, pour ce compte UE, Gemini requiert une facturation Google
  active. À retester une fois la facturation activée (le code est prêt,
  voir fallback ci-dessous) ; la doc doit nuancer « palier gratuit
  permanent » pour les comptes UE.
- **Les erreurs d'appel du Pilier 5 étaient invisibles** dès qu'un autre
  fournisseur réussissait (symptôme : « gemini 0/0 (5 échecs) » sans aucun
  message). Correctifs : chaque échec est loggé en direct dans le CLI avec
  son message complet ; la preuve du critère 5.1 inclut désormais l'erreur
  du fournisseur en échec même quand le taux de citation est calculable ;
  le corps des erreurs HTTP n'est plus tronqué à 200 caractères (600,
  espaces compactés).
- **Fallback Vertex pour les clés `AQ.`** : `geminiProvider` détecte le
  préfixe et bascule sur `aiplatform.googleapis.com` (même schéma
  GenerateContent) au lieu de `generativelanguage.googleapis.com`.

### Correctifs post-Phase 5 (2026-07-03)

- **`parallax init` plantait au lancement** (`UnknownPromptTypeError`) :
  inquirer ≥ 12 a renommé le type de prompt `list` en `select`. Seule
  occurrence dans le code (`password` est toujours valide). Corrigé et
  vérifié en conditions réelles (flux complet, config écrite).
- **Repli global `~/.parallax/config.json`** : la config des clés n'était
  lue que dans le dossier courant — un `parallax init` lancé depuis le home
  était invisible pour un audit lancé ailleurs. Nouvelle priorité :
  variables d'environnement > `.parallax/` du dossier courant >
  `~/.parallax/` (home). Tests isolés du vrai home de la machine.

### Phase 5 — Pilier 5, visibilité mesurée (2026-07-03)

- **Grille mise à jour avant développement** : prorata 2.1 (déjà documenté en
  Phase 3, vérifié), reconnaissance des sous-types Schema.org en 2.2 et 4.1
  (renvoi vers src/core/schema-types.ts), quatre fournisseurs cités au
  Pilier 5 (Claude, OpenAI, Gemini, Perplexity), et schéma exact du fichier
  de requêtes ICP ajouté à la section 5.1.
- **Fichier de requêtes ICP** : YAML par défaut (dépendance `yaml`), JSON
  accepté si l'extension est .json. Validation stricte avec messages
  actionnables (`QueriesFileError`) : brand/domain non vides, queries non
  vide, text obligatoire, category optionnelle. Le domaine est normalisé
  (https://, chemin et casse retirés). Exemple : examples/queries.example.yaml
  (domaine complypme.fr — le site réellement en ligne, getcomplypme.com étant
  une page de parking).
- **Fournisseurs** : modèles volontairement économiques — claude-haiku-4-5,
  gpt-4o-mini, gemini-2.5-flash, sonar (Perplexity). Claude passe par le SDK
  officiel, les trois autres par leur API REST (fetch natif, timeout 60 s).
  Seuls les fournisseurs avec clé sont interrogés ; les autres apparaissent
  dans la preuve comme « non testés, clé API absente ».
- **Rate limiting explicite** par fournisseur : intervalle minimal entre deux
  appels (Gemini 6,5 s — palier gratuit ≈ 10 req/min ; Claude/OpenAI 1 s ;
  Perplexity 1,5 s), horloge et sommeil injectables pour des tests instantanés.
  Appels strictement séquentiels, conformément à la grille.
- **Cache SQLite** : `.parallax/cache.sqlite` (ignoré par git), clé =
  (fournisseur:modèle, requête, jour UTC). Un run répété le même jour ne
  refait aucun appel ; un autre jour invalide le cache. Vérifié en réel :
  second run complet en ~2 s, zéro appel API.
- **Détection de marque** : comparaison sur formes compactées (minuscules,
  sans accents ni séparateurs) pour tolérer « Comply PME » / « comply-pme » ;
  domaine complet et racine de domaine (≥ 4 caractères) ; fuzzy matching
  Levenshtein avec tolérance de 20 % de la longueur de la marque (min. 1) sur
  mots et bigrammes. Position = rang du premier élément de liste (numérotée
  ou à puces) citant la marque ; position moyenne sur l'ensemble des réponses.
- **Scoring** : taux de citation = citations / réponses réussies ; score =
  taux × 15, arrondi à une décimale. Un appel en échec (429, 401…) est exclu
  du dénominateur et compté comme échec dans la preuve ; si toutes les
  requêtes échouent, le critère passe `non_teste` avec le premier message
  d'erreur. La note de transparence méthodologique de la grille est affichée
  dans chaque rapport où le Pilier 5 tourne.
- **CLI** : nouveau flag `--queries <fichier>` ; `--visibility` sans fichier
  ou sans clé LLM n'interrompt jamais l'audit (critère non testé avec la
  raison). Score affiché sur 70/77/85/92 selon les paliers actifs.
- **Validation réelle (complypme.fr)** : orchestration exercée avec la clé
  Claude réelle — 5 requêtes ICP, 0/5 citations (résultat plausible pour une
  marque récente ; c'est précisément ce que l'outil doit mesurer). OpenAI :
  variable présente mais vide dans l'environnement de test ⇒ correctement
  détectée absente. Gemini : pas encore validé en réel — la seule clé Google
  disponible est restreinte à Custom Search (403 sur generativelanguage) ;
  à re-tester dès qu'une clé AI Studio (palier gratuit) est fournie.

### Phase 4 — Pilier 3 complet + sous-types Schema.org (2026-07-03)

- **Sous-types Schema.org reconnus (décision produit, Option 1)** : liste
  statique et documentée dans `src/core/schema-types.ts` — sous-types
  officiels de LocalBusiness (ProfessionalService, LegalService, Attorney,
  AccountingService, Restaurant, Store, MedicalBusiness, RealEstateAgent,
  HomeAndConstructionBusiness, Plumber, Electrician) et d'Article
  (NewsArticle, TechArticle, Report). Justification : la correspondance
  stricte pénalisait les PME utilisant un sous-type légitime (constat
  complypme.fr : NAP complet dans un `ProfessionalService`, noté 0). Une
  liste statique reste prévisible et extensible en PR séparée, contrairement
  à un parcours du graphe Schema.org. Effet mesuré : complypme.fr passe de
  0/8 à 3/8 en 2.2 et de 0/6 à 2/6 en 4.1.
- **3.2 chiffres sourcés** : 1 point par data point sourcé pour 1000 mots
  (densité 7/1000 ⇒ plafond de 7 pts). Les liens externes sont matérialisés
  par un marqueur injecté dans le texte pour mesurer la proximité en
  caractères ; expressions de source reconnues : selon, source, d'après,
  étude/rapport/chiffres de… Data point = pourcentage, montant (€, millions…),
  année 19xx/20xx ou nombre ≥ 2 chiffres.
- **3.3 définitions** : 1 point par définition, plafonné à 6. Sujet court
  (≤ 80 caractères) + verbe définitoire (est un/une, est le/la, sont des,
  désigne, se définit comme) en tout début de paragraphe (p, li, dd), phrase
  complète > 15 mots.
- **3.4 fraîcheur** : sources acceptées — meta article:modified_time /
  article:published_time / og:updated_time, balise <time datetime>, pattern
  texte « mis à jour le » avec dates françaises (12 mars 2024, 03/02/2026).
  La date la plus récente gagne ; « entre 6 et 12 mois » lu comme [6, 12]
  inclus ; dates construites en UTC (bug de fuseau détecté par les tests).
- **3.1 réponses directes** : un seul appel API groupé pour toutes les
  sections (au lieu d'un appel par section — même classification, coût et
  latence réduits), plafonné à 20 sections par page. Modèle
  `claude-haiku-4-5` via le SDK officiel `@anthropic-ai/sdk`, conformément
  au « appel API Claude léger » de la grille. Le classificateur est
  injectable : aucun appel réseau dans les tests. Toute erreur API (clé
  invalide, rate limit…) marque le critère `non_teste` sans faire échouer
  l'audit ; sans flag --with-claude ou sans clé, la preuve précise la raison.
- **CLI** : les quatre piliers palier 0/1 étant implémentés, le score
  affiché devient significatif — x/70 (palier 0) ou x/77 (--with-claude),
  hors 4.3 et Pilier 5. Le score /100 avec plafond et niveaux arrive en
  Phase 6.
- **Sites réels (palier 0, Pilier 3)** : complypme.fr 2.9/25, legalstart.fr
  5.1/25, anthropic.com 7/25 (7/7 en 3.2 grâce à des chiffres systématiquement
  sourcés — cohérent avec sa réputation de citabilité). Limite connue : le
  chemin API réel du 3.1 n'a pas pu être exercé en live (aucune clé Claude
  sur la machine de dev) ; couvert par tests unitaires (prompt, parsing,
  erreurs, prorata).

### Phase 3 — Pilier 4, sous-critères 4.1 et 4.2 (2026-07-03)

- **2.1 révisé (décision produit)** : le volet « titres > 3 mots significatifs »
  passe de la règle de majorité à un prorata — 1 point × (titres avec plus de
  3 mots significatifs / total des titres), cohérent avec le scoring
  proportionnel de 1.1, 2.4, 3.2 et 3.3. La grille
  (docs/scoring-methodology.md) a été mise à jour avec la formule exacte.
- **4.1 cohérence NAP** : un élément est « cohérent » s'il est présent dans le
  Schema.org Organization/LocalBusiness ET retrouvé dans le texte visible.
  Texte comparé : footer (balise, classes/ids `footer`), complété par la page
  contact du même domaine si un lien existe. Téléphones normalisés avant
  comparaison (+33/0033 ↔ 0, séparateurs ignorés) ; adresse cohérente si le
  code postal apparaît dans le texte (et la ville quand elle est déclarée),
  à défaut la rue. Sans bloc Organization exploitable : 0 point, preuve
  explicite « comparaison impossible ».
- **4.2 E-E-A-T** : page à propos détectée sur le href ou le libellé des liens
  (à-propos/about/qui-sommes-nous, accents ignorés) ; auteur via
  `meta[name=author]` ou `author` JSON-LD (chaîne ou objet avec `name`) ;
  SIRET cherché sur la page auditée puis sur la page « mentions légales » du
  même domaine — mot-clé SIRET/SIREN suivi de 9 à 14 chiffres, ou motif
  14 chiffres groupés 3-3-3-5 (un téléphone à 10 chiffres ne matche pas).
- **4.3** figure déjà dans le rapport comme `non_teste` (flag --deep + clé
  SerpAPI, implémentation à venir) pour que le schéma JSON soit stable.
- **Pages annexes** : seuls les liens du même domaine sont suivis (contact,
  mentions légales) — jamais de fetch externe au palier 0.
- **Constat terrain (complypme.fr)** : le site déclare son NAP complet dans un
  bloc `ProfessionalService` (sous-type Schema.org de LocalBusiness) que la
  correspondance stricte de la grille ne reconnaît pas ⇒ 0/6 en 4.1 et 0/8 en
  2.2 malgré des données présentes. Question ouverte : reconnaître les
  sous-types officiels de Organization/LocalBusiness en v1 ? (décision
  utilisateur attendue, voir résumé de phase).
- **Validé sur sites réels** : anthropic.com 2/20 (pas de JSON-LD Organization,
  pas de SIRET — attendu pour un site américain), legalstart.fr 2/20 (nom
  cohérent uniquement), complypme.fr 6/20 dont 6/6 en E-E-A-T (à propos +
  meta author + SIRET sur mentions légales). getcomplypme.com est une page de
  parking Gandi : l'audit de référence utilise complypme.fr.

### Phase 2 — Piliers 1 et 2 (2026-07-03)

`docs/scoring-methodology.md` est la source de vérité unique ; les choix ci-dessous
comblent les points que la grille laisse ouverts, sans en modifier les barèmes.

- **Analyseurs injectables** : chaque pilier reçoit son `Fetcher` (réseau) et son
  `Renderer` (Playwright) en paramètre au lieu de les importer — les tests tournent
  sans réseau ni navigateur, et le CLI branche les implémentations réelles.
- **1.1 robots.txt** : sémantique standard appliquée — un bot obéit à son bloc
  spécifique s'il existe, sinon au bloc `User-agent: *`, sinon il est autorisé.
  Un robots.txt absent ou injoignable vaut « aucun blocage » (8/8). Seul un
  `Disallow: /` exact compte comme blocage, conformément à la grille (un
  `Disallow: /private` ne pénalise pas).
- **1.3 sans JS** : borne « ratio entre 0.4 et 0.8 » lue comme [0.4, 0.8] ⇒ 4 pts,
  le 7 pts exigeant strictement > 0.8. Page dont le rendu ne produit aucun texte :
  ratio 1 (rien ne dépend de JS). Si le navigateur Playwright n'est pas installé,
  le critère est marqué `non_teste` au lieu de faire échouer l'audit.
- **2.1 « mots significatifs »** : mot de ≥ 3 lettres hors liste de mots vides
  fr/en ; le point est accordé si la majorité stricte des titres dépasse 3 mots
  significatifs. Page sans aucun titre : 0/5.
- **2.2 Schema.org** : correspondance stricte avec les types listés par la grille
  (Organization, LocalBusiness, FAQPage, Article, BlogPosting) — les sous-types
  (NewsArticle…) ne comptent pas en v1. Types collectés récursivement (dont
  `@graph` et `@type` en tableau) ; bloc JSON invalide ignoré silencieusement.
- **2.4 Q/R** : 1 point par pattern détecté, plafonné à 4. Une « réponse » = au
  moins 80 caractères de texte après la question dans la fenêtre des 200, coupée
  à la question suivante pour ne pas compter les listes de questions.
- **Plafond conditionnel** (`applyPlafond`) : `plafond_applique` est vrai dès que
  le Pilier 1 est sous 10/20, même si le score total est déjà ≤ 40 — le message
  d'avertissement de la grille doit s'afficher dans tous les cas.
- **Validé sur sites réels** : anthropic.com (19/40) et legalstart.fr (25/40),
  scores différenciés et preuves cohérentes.

### Phase 1 — Mise en place du projet (2026-07-03)

- **Nom de package npm : `parallax-geo`** (le binaire reste `parallax`). Le nom `parallax`
  est déjà pris sur le registre npm ; le suffixe `-geo` lève l'ambiguïté sans changer la
  commande.
- **ESM (`"type": "module"`) + TypeScript `NodeNext`.** chalk ≥ 5 et inquirer ≥ 9 sont
  ESM-only ; partir en ESM natif évite les doubles builds et les contournements CJS.
  Node ≥ 20 requis.
- **tsconfig strict renforcé** : `strict` plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride` — le parsing HTML et les réponses
  d'API sont des données non fiables, autant que le compilateur nous couvre.
- **Vitest comme framework de test** : natif ESM/TypeScript, zéro config, API compatible
  Jest. Règle du projet : pas de PR sans test.
- **Structure par pilier** : un dossier `src/<pilier>` par pilier de la grille de scoring
  (accessibility, semantic, citability, authority, visibility), `src/core` pour le
  transverse (config, types, fetch), `src/cli` pour les commandes. `tests/` en miroir.
- **Config locale des clés dans `.parallax/config.json`** (ignoré par git), fusionnée avec
  les variables d'environnement — l'environnement a priorité sur le fichier, pour respecter
  la convention 12-factor et faciliter la CI. Un audit avec clés partielles aboutit
  toujours : chaque critère sans clé est marqué « non testé, clé API absente ».
- **`bin/parallax.js` est un simple shim** vers `dist/cli/index.js` : le point d'entrée
  exécutable ne contient aucune logique, tout est compilé depuis `src/`.
