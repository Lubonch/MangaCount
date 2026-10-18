import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// v3 = drops the seeds (only affects fresh installs; doesn't touch existing
// data, so there is no migration step). Never lower the version: users who ran
// 2.0.1 are already on 3.
// v4 = first NON-additive step of the project: adds `MangaExternalRef.IsAdult`.
// Safe because `ensureColumn` checks `PRAGMA table_info` before the ALTER
// (idempotent, even if `user_version` fell behind) and the column is born with
// DEFAULT 0 NOT NULL, so existing rows stay "not adult" with no data loss and no
// AniList backfill.
// v5 = moves the +18 flag to the manga entity: adds `Manga.IsAdult` (source of
// truth for the UI) with the same idempotent `ensureColumn` and a backfill from
// the +18 cover link. Additive: deletes or renames nothing.
// v6 = recommender feedback: adds `RecommendationDismissal` and
// `RecommendationSeen` (CREATE TABLE IF NOT EXISTS in the schema, so running the
// schema on an existing v5 DB creates them without touching data).
export const SCHEMA_VERSION = 6;
const SCHEMA_FILE = path.join(__dirname, 'schema.sqlite.sql');

function applyPragmas(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

// Adds a column only if missing. SQLite does not support `ADD COLUMN IF NOT
// EXISTS`, so `PRAGMA table_info` is queried first: the migration is idempotent
// and safe to re-run.
function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

// Opens (or creates) the DB in the user data folder, applies versioned
// migrations via `PRAGMA user_version` and the seed included in the schema.
// `dataDir` in production is `app.getPath('userData')`; in tests, a tmp dir.
export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'mangacount.db'));
  try {
    applyPragmas(db);
    const version = db.pragma('user_version', { simple: true });
    if (version < SCHEMA_VERSION) {
      const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
      db.exec(schema);
      ensureColumn(db, 'MangaExternalRef', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0');
      ensureColumn(db, 'Manga', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0');
      // Backfill: mangas whose active cover link is +18 become flagged.
      // Idempotent (re-running changes nothing).
      db.exec(
        'UPDATE Manga SET IsAdult = 1 WHERE Id IN (SELECT MangaId FROM MangaExternalRef WHERE IsAdult = 1)'
      );
      db.pragma(`user_version = ${SCHEMA_VERSION}`);
    }
  } catch (err) {
    db.close();
    throw err;
  }
  return db;
}

export function getCounts(db) {
  const row = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM Profile) AS profiles,
              (SELECT COUNT(*) FROM Manga) AS mangas,
              (SELECT COUNT(*) FROM Entry) AS entries,
              (SELECT COUNT(*) FROM Format) AS formats,
              (SELECT COUNT(*) FROM Publisher) AS publishers`
    )
    .get();
  return row;
}
