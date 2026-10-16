// Backup y restore del sistema completo.
//
// El estado vive en <dataDir>: `mangacount.db` (WAL), `profiles/`. El backup es
// un `.zip` con un snapshot consistente de la base (db.backup() de better-sqlite3,
// online y WAL-safe), la carpeta de fotos y un `manifest.json`. `preferences.json`
// y `logs/` quedan FUERA: la config es de la máquina, no del dato.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { openDb, SCHEMA_VERSION } from '../db/client.js';

export const APP_NAME = 'MangaCount';
export const BACKUP_PREFIX = 'mangacount-backup-';
export const DEFAULT_KEEP = 5;
const DB_FILE = 'mangacount.db';
const PROFILES_DIR = 'profiles';
const MANIFEST = 'manifest.json';

const pad = (n) => String(n).padStart(2, '0');

export function backupStamp(date = new Date()) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

export function backupFileName(date = new Date()) {
  return `${BACKUP_PREFIX}${backupStamp(date)}.zip`;
}

export function isBackupFileName(name) {
  return /^mangacount-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/.test(name);
}

function walkFiles(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else if (entry.isFile()) out.push({ full, rel: path.relative(base, full).split(path.sep).join('/') });
  }
  return out;
}

// Crea un backup completo en `destinationDir` y devuelve { path, fileName, createdAt }.
// Snapshot a un temporal, zip en memoria y move atómico dentro del destino.
export async function createBackup(db, dataDir, destinationDir, { now = () => new Date() } = {}) {
  if (!destinationDir) throw new Error('destinationDir requerido');
  fs.mkdirSync(destinationDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcbackup-'));
  try {
    const tmpDb = path.join(tmp, DB_FILE);
    await db.backup(tmpDb);

    const createdAt = now().toISOString();
    const files = {
      [MANIFEST]: strToU8(JSON.stringify({ app: APP_NAME, schemaVersion: SCHEMA_VERSION, createdAt })),
      [DB_FILE]: new Uint8Array(fs.readFileSync(tmpDb)),
    };
    for (const file of walkFiles(path.join(dataDir, PROFILES_DIR))) {
      files[`${PROFILES_DIR}/${file.rel}`] = new Uint8Array(fs.readFileSync(file.full));
    }

    const zipped = zipSync(files, { level: 6 });
    const fileName = backupFileName(now());
    const finalPath = path.join(destinationDir, fileName);
    const tmpZip = `${finalPath}.tmp`;
    fs.writeFileSync(tmpZip, zipped);
    fs.renameSync(tmpZip, finalPath);

    return { path: finalPath, fileName, createdAt };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function listBackupFiles(destinationDir) {
  if (!destinationDir || !fs.existsSync(destinationDir)) return [];
  return fs.readdirSync(destinationDir).filter(isBackupFileName);
}

export function listBackups(destinationDir) {
  return listBackupFiles(destinationDir)
    .sort()
    .map((fileName) => {
      const stat = fs.statSync(path.join(destinationDir, fileName));
      return {
        fileName,
        path: path.join(destinationDir, fileName),
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    });
}

// Conserva los `keep` más recientes (el nombre ordena cronológicamente) podando
// solo los archivos propios; devuelve los nombres eliminados.
export function pruneBackups(destinationDir, keep = DEFAULT_KEEP) {
  const files = listBackupFiles(destinationDir).sort();
  if (files.length <= keep) return [];
  const remove = files.slice(0, files.length - keep);
  for (const name of remove) fs.rmSync(path.join(destinationDir, name), { force: true });
  return remove;
}

// Valida el zip (manifest + app/schemaVersion + integrity_check) SIN tocar datos
// y devuelve el manifest.
export function validateBackup(zipPath) {
  if (!fs.existsSync(zipPath)) throw new Error(`Backup inexistente: ${zipPath}`);
  const entries = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));

  if (!entries[MANIFEST]) throw new Error('Backup inválido: falta manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(strFromU8(entries[MANIFEST]));
  } catch {
    throw new Error('Backup inválido: manifest.json ilegible');
  }
  if (manifest.app !== APP_NAME) throw new Error(`Backup de otra app: ${manifest.app}`);
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion incompatible: ${manifest.schemaVersion} (esperado ${SCHEMA_VERSION})`
    );
  }
  if (!entries[DB_FILE]) throw new Error('Backup inválido: falta mangacount.db');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcverify-'));
  try {
    const tmpDb = path.join(tmp, DB_FILE);
    fs.writeFileSync(tmpDb, entries[DB_FILE]);
    const probe = new Database(tmpDb);
    try {
      const result = probe.pragma('integrity_check', { simple: true });
      if (result !== 'ok') throw new Error(`integrity_check falló: ${result}`);
    } finally {
      probe.close();
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return manifest;
}

// Restaura un backup reemplazando todo: valida, hace un safety-backup del estado
// actual, cierra la base, limpia sidecars `-wal`/`-shm`, reemplaza `mangacount.db`
// y `profiles/`, y reabre. Devuelve la conexión nueva para que el caller la use.
export async function restoreBackup(
  db,
  dataDir,
  zipPath,
  { now = () => new Date(), logger = console, safetyDir } = {}
) {
  const manifest = validateBackup(zipPath);

  const dest = safetyDir ?? path.join(dataDir, 'backups-restore');
  let safetyBackup = null;
  try {
    const rescued = await createBackup(db, dataDir, dest, { now });
    safetyBackup = rescued.path;
  } catch (err) {
    logger?.warn?.(`safety-backup previo al restore falló: ${err?.message ?? err}`);
  }

  db.close();
  const entries = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));

  for (const name of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) {
    fs.rmSync(path.join(dataDir, name), { force: true });
  }
  fs.writeFileSync(path.join(dataDir, DB_FILE), entries[DB_FILE]);

  const profilesPath = path.join(dataDir, PROFILES_DIR);
  fs.rmSync(profilesPath, { recursive: true, force: true });
  fs.mkdirSync(profilesPath, { recursive: true });
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.startsWith(`${PROFILES_DIR}/`)) continue;
    const rel = name.slice(PROFILES_DIR.length + 1);
    // Anti zip-slip: descartar rutas con `..` o segmentos vacíos (absolutas).
    if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) continue;
    const target = path.resolve(profilesPath, rel);
    if (target !== profilesPath && !target.startsWith(profilesPath + path.sep)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }

  const newDb = openDb(dataDir);
  return { restored: true, safetyBackup, manifest, db: newDb };
}
