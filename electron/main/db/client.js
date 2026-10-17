import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// v3 = quita los seeds (sólo afecta instalaciones nuevas; no toca datos
// existentes, así que no hay paso de migración). No retroceder la versión: los
// usuarios que corrieron 2.0.1 ya están en 3.
// v4 = primer paso NO aditivo del proyecto: agrega `MangaExternalRef.IsAdult`.
// Es seguro porque `ensureColumn` verifica `PRAGMA table_info` antes del ALTER
// (idempotente, aunque `user_version` se haya quedado atrás) y la columna nace
// con DEFAULT 0 NOT NULL, así que las filas existentes quedan en "no adulto" sin
// pérdida de datos ni backfill de AniList.
export const SCHEMA_VERSION = 4;
const SCHEMA_FILE = path.join(__dirname, 'schema.sqlite.sql');

function applyPragmas(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

// Agrega una columna sólo si falta. SQLite no soporta `ADD COLUMN IF NOT
// EXISTS`, así que se consulta `PRAGMA table_info` primero: la migración es
// idempotente y segura de re-ejecutar.
function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
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
      ensureColumn(db, 'MangaExternalRef', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0');
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
