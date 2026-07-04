# GEO Audit : Grille de scoring v1

Spec fonctionnelle destinée à devenir l'input direct d'une session Claude Code. Chaque critère précise sa méthode de détection technique pour être codé sans ambiguïté.

## Formule globale

Score final = somme des 5 piliers (100 points), avec un plafond conditionnel.

Plafond conditionnel : si le score du Pilier 1 (Accessibilité IA) est inférieur à 10 sur 20, le score final est plafonné à 40 sur 100, quel que soit le total des autres piliers. Le rapport doit alors afficher un message explicite : "Site non accessible aux crawlers IA, le reste du score est indicatif."

Critères non testés (clé API absente, flag non passé, outil indisponible) : exclus du calcul. Le score sur 100 est normalisé sur le total des points effectivement testés (score_brut divisé par score_max_teste, multiplié par 100), pour qu'un audit palier 0 puisse atteindre tous les niveaux sans être pénalisé par les critères à clé API. Les critères exclus sont listés à part dans le rapport avec leur raison. Si un critère du Pilier 1 est non testé, le seuil du plafond s'évalue sur le score du Pilier 1 ramené sur 20 au prorata des points testés.

Niveaux (cohérents avec le système ComplyPME) :
1. Vert : score supérieur ou égal à 70
2. Jaune : score supérieur ou égal à 40
3. Orange : score supérieur ou égal à 20
4. Rouge : score inférieur à 20

## Pilier 1 : Accessibilité IA (20 points)

### 1.1 Robots.txt n'exclut pas les crawlers IA (8 points)

Méthode : fetch de /robots.txt, parsing des blocs User-agent pour GPTBot, ClaudeBot (anthropic-ai), PerplexityBot, Google-Extended, CCBot. Score proportionnel : 8 fois (nombre de bots autorisés divisé par nombre de bots testés). Un Disallow: / sur un bot compte comme bloqué pour ce bot.

Implémentation : fetch natif, parsing par regex sur les blocs User-agent, pas besoin de librairie externe.

### 1.2 Présence d'un fichier llms.txt (5 points)

Méthode : fetch de /llms.txt puis /llms-full.txt. Si réponse 200 avec contenu non vide, 5 points. Sinon 0.

Bonus non noté en v1 : vérifier la conformité à la structure Markdown attendue (titre H1, sections H2) pour une v2 du scoring.

### 1.3 Contenu accessible sans JavaScript (7 points)

Méthode : extraire le texte utile via un fetch HTTP brut (HTML statique, avec cheerio), extraire le texte utile après rendu complet (Playwright headless), calculer le ratio longueur texte brut divisée par longueur texte rendu.

Barème : ratio supérieur à 0.8, 7 points. Ratio entre 0.4 et 0.8, 4 points. Ratio inférieur à 0.4 (SPA complète), 0 point.

Implémentation : cheerio pour le HTML brut, playwright pour le rendu JS.

## Pilier 2 : Structure sémantique (20 points)

### 2.1 Hiérarchie Hn propre (5 points)

Méthode : parsing DOM avec cheerio. Un seul H1 sur la page, 2 points. Absence de saut de niveau (H1 direct vers H3 sans H2), 2 points. Titres contenant plus de 3 mots significatifs : 1 point, noté au prorata : 1 point multiplié par (nombre de titres avec plus de 3 mots significatifs divisé par nombre total de titres de la page).

### 2.2 Données structurées Schema.org (8 points)

Méthode : extraction des blocs script type application/ld+json, parsing JSON, vérification des types présents. Organization ou LocalBusiness, 3 points. FAQPage, 3 points. Article ou BlogPosting, 2 points.

Les sous-types officiels Schema.org courants sont reconnus au même titre que leur type parent (pas de correspondance stricte sur Organization/LocalBusiness seuls) : pour LocalBusiness — ProfessionalService, LegalService, Attorney, AccountingService, Restaurant, Store, MedicalBusiness, RealEstateAgent, HomeAndConstructionBusiness, Plumber, Electrician ; pour Article — NewsArticle, TechArticle, Report. La liste statique de référence est maintenue dans src/core/schema-types.ts, extensible en PR séparée.

Validation optionnelle en v2 : appel au Rich Results Test de Google si une clé API est disponible.

### 2.3 Meta et Open Graph (3 points)

Méthode : vérifier présence et longueur de la balise title (50 à 60 caractères, 1 point), de meta description (120 à 160 caractères, 1 point), des balises og:title, og:description et og:image (1 point si les trois sont présentes).

### 2.4 Format question-réponse détectable (4 points)

Méthode : regex sur le texte pour détecter des phrases finissant par un point d'interrogation suivies dans les 200 caractères par un paragraphe de réponse. Détection complémentaire : présence de balises details/summary, ou classes CSS contenant faq, question, ou accordion.

Score proportionnel au nombre de patterns détectés par page, plafonné à 4 points.

## Pilier 3 : Citabilité du contenu (25 points)

### 3.1 Réponses directes en début de section (7 points)

Méthode : pour chaque section délimitée par un Hn, extraire les deux premières phrases. Appel API Claude léger avec un prompt de classification binaire : la phrase répond-elle directement à la question posée par le titre. Score égal à 7 fois (nombre de sections avec réponse directe divisé par nombre total de sections).

C'est le seul sous-critère du pilier nécessitant un appel LLM, les trois autres sont purement heuristiques.

### 3.2 Chiffres et données sourcées (7 points)

Méthode : regex pour détecter nombres, pourcentages et dates, pondérés par proximité (moins de 100 caractères) d'un lien externe ou d'une expression comme "selon" ou "source". Score proportionnel à la densité de data points sourcés par 1000 mots, plafonné à 7 points.

### 3.3 Définitions autonomes (6 points)

Méthode : détection de patterns du type "X est un", "X désigne", "X se définit comme" en début de paragraphe, avec vérification que la phrase complète dépasse 15 mots. Score proportionnel au nombre trouvé, plafonné à 6 points.

### 3.4 Fraîcheur du contenu (5 points)

Méthode : recherche d'une date de publication ou de mise à jour via meta article:modified_time, balise time, ou pattern texte "mis à jour le". Moins de 6 mois, 5 points. Entre 6 et 12 mois, 3 points. Plus de 12 mois ou date absente, 0 point.

## Pilier 4 : Autorité et entité (20 points)

### 4.1 Cohérence NAP et identité d'entité (6 points)

Méthode : extraire nom, adresse et téléphone depuis le Schema.org Organization et depuis le footer ou la page contact en texte brut. Comparer la cohérence entre les deux sources. 2 points par élément cohérent (nom, adresse, téléphone).

Le bloc Schema.org source peut être un Organization, un LocalBusiness, ou l'un de leurs sous-types officiels reconnus (même liste statique que le critère 2.2, maintenue dans src/core/schema-types.ts).

### 4.2 Signaux E-E-A-T (6 points)

Méthode : présence d'une page à propos (lien contenant "à propos", "about" ou "qui sommes-nous"), 2 points. Auteurs nommés sur le contenu via balise author ou Schema.org author, 2 points. Mentions légales avec SIRET visible, 2 points (critère adapté au contexte français).

### 4.3 Présence sur sources tierces (8 points)

Méthode : appel à une API de recherche web (SerpAPI ou équivalent) pour vérifier la présence sur Wikipedia (2 points), sur des annuaires français reconnus, Societe.com, Infogreffe, Pages Jaunes Pro, Kompass France (2 points), et des mentions presse française via recherche d'actualités, Les Echos, La Tribune, presse sectorielle francophone (4 points).

Ce critère est calibré pour le marché français par choix de positionnement, à la différence des outils anglophones existants qui vérifient des annuaires génériques ou américains. C'est un des points de différenciation explicites de l'outil.

Sous-critère le plus coûteux en appels API, à activer uniquement avec un flag --deep pour ne pas pénaliser la vitesse et le coût de l'audit standard.

### 4.4 Langue et pertinence marché (métadonnée, non notée)

Méthode : détection de la langue principale du contenu (librairie franc ou équivalent). Le champ apparaît dans le rapport en tant que métadonnée informative (langue_detectee), pas comme un point de score, pour ne pas pénaliser injustement un site multilingue tout en signalant clairement si l'audit s'applique à un contenu francophone.

## Pilier 5 : Visibilité mesurée (15 points)

### 5.1 Taux de citation sur panel de requêtes (15 points)

Méthode : l'utilisateur fournit une liste de N requêtes représentatives de son ICP dans un fichier YAML ou JSON. L'outil interroge séquentiellement les APIs Claude, OpenAI, Gemini et Perplexity (bring your own key) avec ces requêtes, analyse chaque réponse pour détecter le nom de marque ou le domaine (regex et fuzzy matching), calcule le taux de citation et la position moyenne quand la marque apparaît dans une liste. Seuls les fournisseurs pour lesquels une clé est configurée sont interrogés, les autres sont marqués "non testé, clé API absente".

Schéma du fichier de requêtes ICP (YAML par défaut, pensé pour édition manuelle et commentaires ; JSON accepté selon l'extension du fichier) :

```yaml
brand: "ComplyPME"
domain: "getcomplypme.com"
queries:
  - text: "meilleur outil de conformité AI Act pour PME"
    category: "conformite"
  - text: "comment savoir si mon entreprise est visible sur ChatGPT"
    category: "geo"
```

Score = taux de citation multiplié par 15.

Note technique : prévoir un cache local en SQLite pour éviter de refaire les mêmes appels sur des runs répétés dans la même journée, et un rate limiting explicite pour maîtriser les coûts.

Note de transparence méthodologique, à afficher explicitement dans chaque rapport : cette mesure passe par les APIs officielles des modèles, pas par les interfaces utilisateur réelles (ChatGPT.com, Perplexity.ai). Les réponses via API peuvent différer de ce que voit un utilisateur final, notamment sur les citations de sources. C'est un choix assumé pour rester gratuit, indépendant de tout vendor de scraping payant, et conforme aux conditions d'utilisation des plateformes. Ne pas prétendre à une équivalence parfaite avec l'expérience utilisateur réelle.

## Schéma de sortie JSON

Structure attendue pour le rapport, consommable par un formateur markdown ou une interface web ultérieure.

```json
{
  "url": "string",
  "audited_at": "ISO 8601 datetime",
  "langue_detectee": "string, ex: fr, en, indeterminee",
  "score_global": "number 0-100, normalisé sur les points testés, plafond appliqué",
  "score_brut": "number, somme des points obtenus sur les critères testés",
  "score_max_teste": "number, somme des points max des critères testés (dénominateur)",
  "niveau": "vert | jaune | orange | rouge",
  "plafond_applique": "boolean",
  "criteres_non_testes": [
    { "pilier": "string, id du pilier", "critere": "string", "raison": "string" }
  ],
  "piliers": {
    "accessibilite_ia": { "score": "number", "max": 20, "details": [] },
    "structure_semantique": { "score": "number", "max": 20, "details": [] },
    "citabilite_contenu": { "score": "number", "max": 25, "details": [] },
    "autorite_entite": { "score": "number", "max": 20, "details": [] },
    "visibilite_mesuree": { "score": "number", "max": 15, "details": [] }
  },
  "recommandations": [
    { "priorite": "haute | moyenne | basse", "critere": "string", "action": "string" }
  ]
}
```

Recommandations : une par critère testé où des points manquent, triées par points manquants décroissants. Priorité : haute si 4 points ou plus manquent, moyenne à partir de 2, basse en dessous. Les critères non testés n'apparaissent pas en recommandation (ils sont déjà listés dans criteres_non_testes).

Chaque objet dans un tableau "details" contient : critere (string), points_obtenus (number), points_max (number), methode (string), preuve (string ou extrait détecté).

## Notes d'implémentation pour Claude Code

Stack recommandée : TypeScript et Node, cohérent avec ta stack actuelle et donc réutilisable pour les sessions Claude Code sans changement de contexte.

Librairies : cheerio (parsing HTML statique), playwright (rendu JS), commander (interface CLI), node-fetch ou fetch natif, chalk (mise en forme du rapport terminal), better-sqlite3 (cache local pour le Pilier 5).

Ordre de développement suggéré :
1. Piliers 1 et 2, entièrement heuristiques, aucune dépendance API, permettent de valider le crawler et le parsing DOM.
2. Pilier 4, sous-critères 4.1 et 4.2 uniquement (4.3 en dernier car coûteux en API).
3. Pilier 3, sous-critères 3.2, 3.3 et 3.4 (heuristiques), puis 3.1 (nécessite l'API Claude).
4. Pilier 5, le plus complexe (multi-API, cache, rate limiting), à construire en dernier une fois le reste stable.

Validation du modèle avant de coder quoi que ce soit : tester la grille à la main sur 10 sites (5 reconnus comme cités par les LLM dans leur niche, 5 qui ne le sont pas). Si les sites cités scorent nettement plus haut, le modèle tient. Sinon, ajuster les pondérations avant de lancer le développement.

## Licence et positionnement open source

Licence recommandée : MIT. Objectif d'adoption et de traction pour la visibilité personnelle et pour ComplyPME, pas de protection commerciale du code lui-même. Le vrai moat reste le service d'interprétation et d'exécution autour de l'outil, pas le score en tant que tel.

Nom du package npm : parallax-geo (parallax déjà pris sur le registre), binaire exécutable : parallax.

README : bilingue, français en premier, anglais en second. Aucun concurrent identifié (Bright Data GEO/AEO Tracker, OneGlanse) ne propose de version française, ce qui rend le repo immédiatement identifiable comme la référence francophone du secteur.

Positionnement à afficher dès les premières lignes du README : audit technique GEO gratuit et indépendant de tout vendor de scraping payant, calibré pour le marché des PME françaises, transparent sur ses limites méthodologiques.

## Architecture de clés API progressive

Principe : l'audit par défaut ne demande aucune clé API. Les clés ne sont nécessaires que pour débloquer des points supplémentaires, jamais pour obtenir un premier résultat.

Palier 0, zéro clé : Piliers 1 et 2 entiers (40 points), Pilier 4 sans le sous-critère 4.3 (12 points), Pilier 3 sans le sous-critère 3.1 (18 points). Total accessible sans configuration : 70 points sur 100. Commande : parallax audit <url>.

Palier 1, une clé Claude : débloque le sous-critère 3.1 (classification des réponses directes en début de section, 7 points). Total : 77 points sur 100. C'est la clé la plus simple à obtenir pour l'utilisateur puisque c'est celle de l'écosystème dans lequel l'outil a été construit.

Palier 2, options avancées : sous-critère 4.3 (sources tierces françaises, 8 points, flag --deep, nécessite une clé SerpAPI ou équivalent) et Pilier 5 entier (visibilité mesurée, 15 points, flag --visibility, nécessite au moins une clé parmi Claude, OpenAI, Gemini, Perplexity).

Recommandation de fournisseur pour le Pilier 5 : documenter Gemini comme point d'entrée conseillé, seul fournisseur parmi les quatre à proposer un palier gratuit permanent (modèles Flash, environ 1500 requêtes par jour, sans carte bancaire), contrairement à Claude et OpenAI qui n'offrent pas de palier gratuit permanent.

Commande d'initialisation : parallax init, assistant interactif qui détecte les clés déjà présentes en variables d'environnement, propose d'en configurer de nouvelles, stocke la configuration localement dans un fichier ignoré par git, et permet de relancer un audit à tout moment sans reconfigurer. Un audit avec des clés partielles doit toujours aboutir : les critères sans clé disponible sont marqués explicitement "non testé, clé API absente" dans le rapport plutôt que de faire échouer l'ensemble de la commande.
