import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SCHEMA_VERSION = 1;
const SCHEMA_FILE = path.join(__dirname, 'schema.sqlite.sql');

function applyPragmas(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

// Abre (o crea) la BD en la carpeta de datos del usuario, aplica migraciones
// versionadas vía `PRAGMA user_version` y el seed incluido en el esquema.
// `dataDir` en producción es `app.getPath('userData')`; en tests, un tmp.
export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'mangacount.db'));
  try {
    applyPragmas(db);
    const version = db.pragma('user_version', { simple: true });
    if (version < SCHEMA_VERSION) {
      const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
      db.exec(schema);
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
