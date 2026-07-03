# Changelog

Toutes les décisions d'architecture notables sont documentées ici au fil de l'eau.

## [Non publié]

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
