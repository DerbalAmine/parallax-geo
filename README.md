# Parallax

**Audit GEO (Generative Engine Optimization) en ligne de commande. Fonctionne sans clé API.**

Parallax mesure si votre site web est visible et citable par les LLM (ChatGPT, Claude,
Perplexity, Gemini). Le nom vient du principe astronomique de parallaxe : le décalage de
position apparent d'un objet observé depuis plusieurs points de vue — ici, chaque LLM est
un point d'observation différent.

Outil gratuit, open source (MIT), indépendant de tout vendor de scraping payant, calibré
pour le marché des PME françaises.

## Installation

```bash
npm install -g parallax-geo
```

## Utilisation

```bash
# Audit de base — aucune clé API requise, score sur 70 points
parallax audit https://exemple.fr

# Configuration interactive des clés API (optionnel)
parallax init
```

> README minimal — documentation complète à venir (Phase 6).

## Licence

MIT
