# Changelog

Toutes les décisions d'architecture notables sont documentées ici au fil de l'eau.

## [Non publié]

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
