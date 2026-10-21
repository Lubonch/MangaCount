// Full-system backup and restore.
//
// The state lives in <dataDir>: `mangacount.db` (WAL), `profiles/` and `covers/`. The
// backup is a `.zip` with a consistent snapshot of the DB (better-sqlite3's db.backup(),
// online and WAL-safe), the profile photos, the cover cache and a `manifest.json`.
// `preferences.json` and `logs/` stay OUT: the config belongs to the machine, not to the data.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { openDb, SCHEMA_VERSION } from '../db/client.js';
import { createRemoteFs, LIST_TIMEOUT_MS, WRITE_TIMEOUT_MS } from './remote-fs.js';

export const APP_NAME = 'MangaCount';
export const BACKUP_PREFIX = 'mangacount-backup-';
export const DEFAULT_KEEP = 5;
const DB_FILE = 'mangacount.db';
const PROFILES_DIR = 'profiles';
const COVERS_DIR = 'covers';
const RESOURCE_DIRS = [PROFILES_DIR, COVERS_DIR];
const MANIFEST = 'manifest.json';

// Flagged error so the handler can tell apart "destination not responding".
export const DESTINATION_TIMEOUT = 'DESTINATION_TIMEOUT';

// Lazy worker instance: not created if a destination is never touched.
let defaultRemoteFs = null;
const getRemoteFs = () => (defaultRemoteFs ??= createRemoteFs());

// Seam for tests: replaces the worker with an in-process implementation.
export function setRemoteFs(instance) {
  defaultRemoteFs = instance;
}

// Last list known per destination, to return it if the destination stops responding.
const lastLists = new Map();
export function cachedBackups(destinationDir) {
  return lastLists.get(destinationDir) ?? [];
}

const mapTimeout = (err) => {
  if (err?.timedOut) {
    const timeout = new Error('El destino no responde');
    timeout.code = DESTINATION_TIMEOUT;
    return timeout;
  }
  return err;
};

const callDest = async (remoteFs, op, args, timeoutMs) => {
  try {
    return await remoteFs.call(op, args, { timeoutMs });
  } catch (err) {
    throw mapTimeout(err);
  }
};

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

// Creates a full backup in `destinationDir` and returns { path, fileName, createdAt }.
// Snapshot to a temp file, zip in memory and atomic move inside the destination.
export async function createBackup(
  db,
  dataDir,
  destinationDir,
  { now = () => new Date(), remoteFs = getRemoteFs() } = {}
) {
  if (!destinationDir) throw new Error('destinationDir requerido');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcbackup-'));
  try {
    const tmpDb = path.join(tmp, DB_FILE);
    await db.backup(tmpDb);

    const createdAt = now().toISOString();
    const files = {
      [MANIFEST]: strToU8(JSON.stringify({ app: APP_NAME, schemaVersion: SCHEMA_VERSION, createdAt })),
      [DB_FILE]: new Uint8Array(fs.readFileSync(tmpDb)),
    };
    for (const dirName of RESOURCE_DIRS) {
      for (const file of walkFiles(path.join(dataDir, dirName))) {
        files[`${dirName}/${file.rel}`] = new Uint8Array(fs.readFileSync(file.full));
      }
    }

    const zipped = zipSync(files, { level: 6 });
    const fileName = backupFileName(now());
    const finalPath = path.join(destinationDir, fileName);
    const tmpZip = `${finalPath}.tmp`;
    await callDest(remoteFs, 'mkdir', [destinationDir], WRITE_TIMEOUT_MS);
    await callDest(remoteFs, 'writeFile', [tmpZip, zipped], WRITE_TIMEOUT_MS);
    await callDest(remoteFs, 'rename', [tmpZip, finalPath], WRITE_TIMEOUT_MS);

    return { path: finalPath, fileName, createdAt };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function listBackupFiles(destinationDir, { remoteFs = getRemoteFs() } = {}) {
  if (!destinationDir) return [];
  return callDest(remoteFs, 'listBackupFiles', [destinationDir], LIST_TIMEOUT_MS);
}

export async function listBackups(destinationDir, { remoteFs = getRemoteFs() } = {}) {
  if (!destinationDir) return [];
  const backups = await callDest(remoteFs, 'listBackups', [destinationDir], LIST_TIMEOUT_MS);
  lastLists.set(destinationDir, backups);
  return backups;
}

// Keeps the `keep` most recent (the name sorts chronologically), pruning
// only its own files; returns the removed names.
export async function pruneBackups(destinationDir, keep = DEFAULT_KEEP, { remoteFs = getRemoteFs() } = {}) {
  const files = (await listBackupFiles(destinationDir, { remoteFs })).sort();
  if (files.length <= keep) return [];
  const remove = files.slice(0, files.length - keep);
  for (const name of remove) {
    await callDest(remoteFs, 'rm', [path.join(destinationDir, name)], WRITE_TIMEOUT_MS);
  }
  return remove;
}

// Validates the zip (manifest + app/schemaVersion + integrity_check) WITHOUT touching data
// and returns the manifest.
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

// Restores a backup replacing everything: validates, makes a safety backup of the current
// state, closes the DB, cleans the `-wal`/`-shm` sidecars, replaces `mangacount.db`
// and `profiles/`, and reopens. Returns the new connection for the caller to use.
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

  for (const dirName of RESOURCE_DIRS) {
    const base = path.join(dataDir, dirName);
    fs.rmSync(base, { recursive: true, force: true });
    fs.mkdirSync(base, { recursive: true });
  }
  for (const [name, bytes] of Object.entries(entries)) {
    const dirName = RESOURCE_DIRS.find((dir) => name.startsWith(`${dir}/`));
    if (!dirName) continue;
    const rel = name.slice(dirName.length + 1);
    // Anti zip-slip: discard paths with `..` or empty (absolute) segments.
    if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) continue;
    const base = path.join(dataDir, dirName);
    const target = path.resolve(base, rel);
    if (target !== base && !target.startsWith(base + path.sep)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }

  const newDb = openDb(dataDir);
  return { restored: true, safetyBackup, manifest, db: newDb };
}
