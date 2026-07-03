/**
 * Cache local SQLite du Pilier 5 (note technique de la grille) :
 * évite de refaire les mêmes appels API sur des runs répétés dans la même
 * journée. Clé = (fournisseur:modèle, requête, jour) ; les réponses d'un
 * autre jour ne sont jamais réutilisées.
 *
 * Emplacement par défaut : .parallax/cache.sqlite (ignoré par git).
 */

import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export class ResponseCache {
  private db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS responses (
        provider   TEXT NOT NULL,
        query      TEXT NOT NULL,
        day        TEXT NOT NULL,
        response   TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (provider, query, day)
      )
    `);
  }

  get(provider: string, query: string, day: string): string | undefined {
    const row = this.db
      .prepare(
        'SELECT response FROM responses WHERE provider = ? AND query = ? AND day = ?',
      )
      .get(provider, query, day) as { response: string } | undefined;
    return row?.response;
  }

  set(provider: string, query: string, day: string, response: string): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO responses (provider, query, day, response, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(provider, query, day, response, new Date().toISOString());
  }

  close(): void {
    this.db.close();
  }
}
