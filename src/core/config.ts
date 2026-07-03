/**
 * Lecture/écriture de la configuration locale de Parallax.
 *
 * Emplacement : `.parallax/config.json` dans le répertoire courant
 * (ignoré par git — voir .gitignore). Ne contient que des clés API
 * saisies via `parallax init` ; les variables d'environnement restent
 * prioritaires à la résolution.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Env, FileConfig, KeyRing } from './keys.js';
import { resolveKeys } from './keys.js';

export const CONFIG_DIR = '.parallax';
export const CONFIG_FILE = 'config.json';

export function configPath(cwd: string): string {
  return path.join(cwd, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Charge le fichier de config local. Un fichier absent ou illisible
 * (JSON invalide) est traité comme une config vide : l'audit ne doit
 * jamais échouer à cause de la config.
 */
export function loadFileConfig(cwd: string): FileConfig {
  try {
    const raw = fs.readFileSync(configPath(cwd), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as FileConfig;
  } catch {
    return {};
  }
}

/** Écrit la config locale (crée le dossier si besoin, permissions 0600). */
export function saveFileConfig(cwd: string, config: FileConfig): string {
  const file = configPath(cwd);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
  });
  return file;
}

/**
 * Résolution complète, par priorité décroissante :
 * variables d'environnement > .parallax/config.json du dossier courant >
 * ~/.parallax/config.json (repli global — permet à `parallax init` lancé
 * depuis le home de servir tous les audits, où qu'ils soient lancés).
 */
export function loadKeyRing(
  cwd: string,
  env: Env = process.env,
  home: string = os.homedir(),
): KeyRing {
  const local = loadFileConfig(cwd);
  const global = path.resolve(cwd) === path.resolve(home) ? {} : loadFileConfig(home);
  return resolveKeys(env, {
    keys: { ...global.keys, ...local.keys },
  });
}
