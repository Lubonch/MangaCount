// Fusiona editoriales/formatos duplicados que sólo difieren en mayúsculas o
// espacios (p. ej. "Ivrea" vs "ivrea") en la base local de MangaCount.
//
// IMPORTANTE: este script usa better-sqlite3 compilado para **Node**. Si venís de
// correr la app en dev, antes hacé `npm run rebuild:node` (y después
// `npm run rebuild:electron` para volver a Electron).
//
// Uso:
//   node scripts/dedupe-catalogs.mjs --dry-run          # sólo muestra el plan
//   node scripts/dedupe-catalogs.mjs                    # aplica (userData del SO)
//   node scripts/dedupe-catalogs.mjs --data-dir=/ruta   # otra carpeta de datos

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { dedupeCatalogs } from '../electron/main/db/catalog-dedupe.js';

function defaultDataDir() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'mangacount');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'mangacount');
  }
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'mangacount');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dataDirArg = args.find((a) => a.startsWith('--data-dir='));
const dataDir = dataDirArg ? dataDirArg.slice('--data-dir='.length) : defaultDataDir();
const dbPath = path.join(dataDir, 'mangacount.db');

if (!fs.existsSync(dbPath)) {
  console.error(`No existe la base en: ${dbPath}`);
  console.error('Pasá --data-dir=<carpeta userData> si está en otro lado.');
  process.exit(1);
}

const db = new Database(dbPath);
try {
  const report = dedupeCatalogs(db, { dryRun });
  const total = (r) => r.Format.length + r.Publisher.length;
  console.log(dryRun ? '🔎 DRY RUN (nada modificado)' : '✅ Dedupe aplicado');
  console.log(`Base: ${dbPath}`);
  console.log(JSON.stringify(report, null, 2));
  console.log(total(report) === 0 ? 'No había duplicados.' : `Grupos fusionados: ${total(report)}`);
} finally {
  db.close();
}
