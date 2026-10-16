// Traspaso único PostgreSQL -> SQLite (uso único, luego se archiva).
//
// Uso:
//   PG_CONNECTION_STRING="Host=...;..." node electron/main/db/migrate-from-postgres.js [DATA_DIR]
//   (DATA_DIR por defecto: carpeta de datos indicada por la app; NUNCA sobre la BD en uso:
//   correr con la app cerrada y la BD PG en solo-lectura si es posible.)
//
// Orden FK-seguro: Format, Publisher, Profile, Manga, Entry.
// Verificación: conteos por tabla PG vs SQLite, UNIQUE(ProfileId,MangaId) sin
// colisiones y spot-check de 20 entries (quantity/pending/priority).
// Falla con exit 1 ante cualquier diferencia.

import pg from 'pg';
import { openDb, getCounts } from './client.js';

const { Client } = pg;

function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name}`);
    process.exit(2);
  }
  return value;
}

// Convierte "Host=h;Database=d;Username=u;Password=p;Port=n" a config pg.
function parseDotnetConnString(raw) {
  const parts = Object.fromEntries(
    raw.split(';').filter(Boolean).map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim().toLowerCase(), kv.slice(i + 1).trim()];
    })
  );
  return {
    host: parts.host ?? 'localhost',
    database: parts.database ?? 'MangaCount',
    user: parts.username ?? 'mangacount',
    password: parts.password ?? '',
    port: Number(parts.port ?? 5432),
  };
}

async function main() {
  const dataDir = process.argv[2] ?? process.env.MANGACOUNT_DATA_DIR;
  if (!dataDir) {
    console.error('Pasá DATA_DIR como argumento o MANGACOUNT_DATA_DIR');
    process.exit(2);
  }
  const client = new Client(parseDotnetConnString(mustEnv('PG_CONNECTION_STRING')));
  await client.connect();
  try {
    const db = openDb(dataDir);
    try {
      const copy = async (table, cols, map) => {
        const { rows } = await client.query(`SELECT ${cols.join(', ')} FROM ${table}`);
        const insert = db.prepare(
          `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        );
        let inserted = 0;
        const tx = db.transaction((list) => {
          for (const r of list) inserted += insert.run(...map(r)).changes;
        });
        tx(rows);
        return { read: rows.length, inserted };
      };

      // lower(): las tablas reales en PG están en minúsculas.
      const moved = {};
      moved.Format = await copy('format', ['id', 'name'], (r) => [r.id, r.name]);
      moved.Publisher = await copy('publisher', ['id', 'name'], (r) => [r.id, r.name]);
      moved.Profile = await copy('profile', ['id', 'name'], (r) => [r.id, r.name]);
      moved.Manga = await copy(
        'manga',
        ['id', 'title', 'totalvolumes', 'formatid', 'publisherid', 'imageurl'],
        (r) => [r.id, r.title, r.totalvolumes, r.formatid, r.publisherid, r.imageurl ?? null]
      );
      moved.Entry = await copy(
        'entry',
        ['id', 'profileid', 'mangaid', 'purchasedvolumes', 'pendingvolumes', 'ispriority'],
        (r) => [r.id, r.profileid, r.mangaid, r.purchasedvolumes, r.pendingvolumes, r.ispriority]
      );

      // Verificación 0: sin filas descartadas por INSERT OR IGNORE en las tablas
      // sin seed (Manga no tiene UNIQUE aparte del PK; Entry tiene UNIQUE(ProfileId,MangaId)).
      // Filete: si PG tuviera violaciones de UNIQUE, se pierden en silencio -> fallar.
      for (const table of ['Manga', 'Entry']) {
        const { read, inserted } = moved[table];
        if (inserted !== read) {
          throw new Error(
            `${table}: ${read - inserted} fila(s) descartada(s) por INSERT OR IGNORE (¿colisión UNIQUE?)`
          );
        }
      }

      // Verificación 1: conteos por tabla.
      const counts = getCounts(db);
      const expected = {
        profiles: moved.Profile.read,
        mangas: moved.Manga.read,
        entries: moved.Entry.read,
        formats: moved.Format.read,
        publishers: moved.Publisher.read,
      };
      // El seed (perfil/formatos/editoriales por defecto) puede sumar filas base.
      for (const [k, v] of Object.entries(expected)) {
        if (counts[k] < v) throw new Error(`Conteo ${k}: SQLite=${counts[k]} < PG=${v}`);
      }

      // Verificación 2: UNIQUE sin colisiones.
      const dupes = db
        .prepare('SELECT ProfileId, MangaId, COUNT(*) c FROM Entry GROUP BY 1, 2 HAVING c > 1')
        .all();
      if (dupes.length > 0) throw new Error(`Colisiones UNIQUE: ${JSON.stringify(dupes)}`);

      // Verificación 3: spot-check de 20 entries.
      const sample = db
        .prepare('SELECT Id, PurchasedVolumes, PendingVolumes, IsPriority FROM Entry ORDER BY Id LIMIT 20')
        .all();
      for (const s of sample) {
        const { rows } = await client.query(
          'SELECT purchasedvolumes, pendingvolumes, ispriority FROM entry WHERE id = $1',
          [s.Id]
        );
        const pg = rows[0];
        if (
          !pg ||
          pg.purchasedvolumes !== s.PurchasedVolumes ||
          (pg.pendingvolumes ?? null) !== s.PendingVolumes ||
          pg.ispriority !== !!s.IsPriority
        ) {
          throw new Error(`Spot-check falló en entry ${s.Id}`);
        }
      }

      console.log('Traspaso OK:', JSON.stringify({ moved, counts }));
    } finally {
      db.close();
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Traspaso FALLÓ:', err.message);
  process.exit(1);
});
