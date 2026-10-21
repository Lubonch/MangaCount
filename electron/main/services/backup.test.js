import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync, strToU8, zipSync } from 'fflate';
import { openDb, SCHEMA_VERSION } from '../db/client.js';
import { createProfile, listProfiles } from '../db/repositories/profiles.js';
import { saveProfilePicture } from './files.js';
import {
  createBackup,
  pruneBackups,
  listBackups,
  listBackupFiles,
  validateBackup,
  restoreBackup,
  backupFileName,
  isBackupFileName,
  setRemoteFs,
  DEFAULT_KEEP,
} from './backup.js';
import { fsOps } from './fs-worker.js';

describe('services/backup', () => {
  let dataDir;
  let destDir;
  let db;

  const at = (minutes) => () => new Date(new Date(2026, 0, 2, 3, 0, 0).getTime() + minutes * 60000);

  beforeEach(() => {
    // No real worker: the ops run in-process (same code as the worker).
    setRemoteFs({ call: async (op, args) => fsOps[op](...args) });
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdata-'));
    destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdest-'));
    db = openDb(dataDir);
  });

  afterEach(() => {
    try {
      db?.close();
    } catch {
      /* already closed by restore */
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  it('nombre con timestamp y patrón propio', () => {
    assert.equal(backupFileName(new Date(2026, 0, 2, 3, 4)), 'mangacount-backup-2026-01-02-0304.zip');
    assert.equal(isBackupFileName('mangacount-backup-2026-01-02-0304.zip'), true);
    assert.equal(isBackupFileName('otra-cosa.zip'), false);
  });

  it('crea un backup con manifest, db, profiles y covers', async () => {
    const profile = createProfile(db, 'yo');
    const { fileName } = saveProfilePicture(db, dataDir, profile.id, {
      originalName: 'foto.png',
      buffer: Buffer.from([1, 2, 3]),
    });
    fs.mkdirSync(path.join(dataDir, 'covers'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'covers', '7.jpg'), Buffer.from([4, 5, 6]));

    const result = await createBackup(db, dataDir, destDir, { now: at(0) });
    assert.equal(result.fileName, 'mangacount-backup-2026-01-02-0300.zip');
    assert.ok(fs.existsSync(result.path));

    const entries = unzipSync(new Uint8Array(fs.readFileSync(result.path)));
    assert.ok(entries['manifest.json']);
    assert.ok(entries['mangacount.db']);
    assert.ok(entries[`profiles/${fileName}`]);
    assert.ok(entries['covers/7.jpg']);
    const manifest = JSON.parse(Buffer.from(entries['manifest.json']).toString());
    assert.equal(manifest.app, 'MangaCount');
    assert.equal(typeof manifest.schemaVersion, 'number');
    assert.equal(validateBackup(result.path).app, 'MangaCount');
  });

  it('poda conservando los últimos 5 y sin tocar archivos ajenos', async () => {
    for (let i = 0; i < 6; i += 1) {
      await createBackup(db, dataDir, destDir, { now: at(i) });
    }
    fs.writeFileSync(path.join(destDir, 'backup-de-otro-programa.zip'), 'x');

    const removed = await pruneBackups(destDir, DEFAULT_KEEP);
    assert.equal(removed.length, 1);
    assert.equal(removed[0], 'mangacount-backup-2026-01-02-0300.zip');
    assert.equal((await listBackupFiles(destDir)).length, DEFAULT_KEEP);
    assert.ok(fs.existsSync(path.join(destDir, 'backup-de-otro-programa.zip')));
    assert.equal((await listBackups(destDir)).length, DEFAULT_KEEP);
  });

  it('rechaza un zip sin manifest', () => {
    const bad = path.join(destDir, 'basura.zip');
    fs.writeFileSync(bad, zipSync({ 'otro.txt': strToU8('nada') }));
    assert.throws(() => validateBackup(bad), /manifest/);
  });

  it('rechaza un manifest de otra app o schema', () => {
    const bad = path.join(destDir, 'ajeno.zip');
    fs.writeFileSync(
      bad,
      zipSync({
        'manifest.json': strToU8(JSON.stringify({ app: 'Otra', schemaVersion: 1 })),
        'mangacount.db': new Uint8Array(),
      })
    );
    assert.throws(() => validateBackup(bad), /otra app/i);
  });

  it('restaura reemplazando el estado e informa el safety-backup', async () => {
    const uno = createProfile(db, 'uno');
    const { fileName } = saveProfilePicture(db, dataDir, uno.id, {
      originalName: 'foto.png',
      buffer: Buffer.from([9, 9, 9]),
    });
    const coversPath = path.join(dataDir, 'covers');
    fs.mkdirSync(coversPath, { recursive: true });
    fs.writeFileSync(path.join(coversPath, '1.jpg'), Buffer.from([7, 7, 7]));
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });

    createProfile(db, 'dos');
    fs.writeFileSync(path.join(coversPath, '999.jpg'), Buffer.from([8, 8, 8]));

    const result = await restoreBackup(db, dataDir, backup.path, { now: at(60), logger: { warn() {} } });
    db = result.db;
    assert.equal(result.restored, true);
    assert.ok(result.safetyBackup);

    const names = listProfiles(db).map((p) => p.name);
    assert.ok(names.includes('uno'));
    assert.ok(!names.includes('dos'));
    assert.ok(fs.existsSync(path.join(dataDir, 'profiles', fileName)));
    assert.ok(fs.existsSync(path.join(coversPath, '1.jpg')));
    assert.equal(fs.existsSync(path.join(coversPath, '999.jpg')), false);
  });

  it('restore rechaza entradas con path traversal (zip-slip)', async () => {
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });
    const entries = unzipSync(new Uint8Array(fs.readFileSync(backup.path)));
    entries['profiles/../evil.txt'] = strToU8('pwned');
    entries['covers/../evil-cover.txt'] = strToU8('pwned');
    const evil = path.join(destDir, 'evil.zip');
    fs.writeFileSync(evil, zipSync(entries));

    const result = await restoreBackup(db, dataDir, evil, { now: at(60), logger: { warn() {} } });
    db = result.db;
    assert.equal(fs.existsSync(path.join(dataDir, 'evil.txt')), false);
    assert.equal(fs.existsSync(path.join(dataDir, 'evil-cover.txt')), false);
  });

  it('restore de un backup sin covers deja el cache vacío', async () => {
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });
    const entries = unzipSync(new Uint8Array(fs.readFileSync(backup.path)));
    for (const name of Object.keys(entries)) {
      if (name.startsWith('covers/')) delete entries[name];
    }
    const old = path.join(destDir, 'viejo.zip');
    fs.writeFileSync(old, zipSync(entries));

    const coversPath = path.join(dataDir, 'covers');
    fs.mkdirSync(coversPath, { recursive: true });
    fs.writeFileSync(path.join(coversPath, '5.jpg'), Buffer.from([1]));

    const result = await restoreBackup(db, dataDir, old, { now: at(60), logger: { warn() {} } });
    db = result.db;
    assert.equal(result.restored, true);
    assert.deepEqual(fs.readdirSync(coversPath), []);
  });

  it('nombre por defecto y backup con reloj por defecto', async () => {
    assert.match(backupFileName(), /^mangacount-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/);
    const result = await createBackup(db, dataDir, destDir);
    assert.equal(isBackupFileName(result.fileName), true);
    assert.ok(fs.existsSync(result.path));
  });

  it('rechaza createBackup sin destino', async () => {
    await assert.rejects(() => createBackup(db, dataDir, ''), /destinationDir requerido/);
  });

  it('listBackupFiles tolera destino nulo o inexistente', async () => {
    assert.deepEqual(await listBackupFiles(null), []);
    assert.deepEqual(await listBackupFiles(path.join(destDir, 'no-existe')), []);
  });

  it('pruneBackups no poda cuando no se supera keep', async () => {
    await createBackup(db, dataDir, destDir, { now: at(0) });
    assert.deepEqual(await pruneBackups(destDir, 5), []);
  });

  it('createBackup incluye subdirectorios de profiles y omite no-archivos', async () => {
    const profile = createProfile(db, 'yo');
    saveProfilePicture(db, dataDir, profile.id, { originalName: 'a.png', buffer: Buffer.from([1]) });
    const sub = path.join(dataDir, 'profiles', 'anidado');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, 'nota.txt'), 'hola');
    // a symlink is neither file nor directory: walkFiles ignores it
    fs.symlinkSync(path.join(sub, 'nota.txt'), path.join(dataDir, 'profiles', 'link.txt'));

    const result = await createBackup(db, dataDir, destDir, { now: at(0) });
    const entries = unzipSync(new Uint8Array(fs.readFileSync(result.path)));
    assert.ok(entries['profiles/anidado/nota.txt']);
    assert.ok(!Object.keys(entries).some((k) => k.endsWith('link.txt')));
  });

  it('validateBackup rechaza rutas inexistentes, manifest ilegible, schema y db faltantes', async () => {
    assert.throws(() => validateBackup(path.join(destDir, 'nada.zip')), /inexistente/);

    const ilegible = path.join(destDir, 'ilegible.zip');
    fs.writeFileSync(
      ilegible,
      zipSync({
        'manifest.json': strToU8('{esto no es json'),
        'mangacount.db': new Uint8Array(),
      })
    );
    assert.throws(() => validateBackup(ilegible), /ilegible/);

    const schema = path.join(destDir, 'schema.zip');
    fs.writeFileSync(
      schema,
      zipSync({
        'manifest.json': strToU8(JSON.stringify({ app: 'MangaCount', schemaVersion: 999 })),
        'mangacount.db': new Uint8Array(),
      })
    );
    assert.throws(() => validateBackup(schema), /schemaVersion incompatible/);

    const sinDb = path.join(destDir, 'sindb.zip');
    fs.writeFileSync(
      sinDb,
      zipSync({
        'manifest.json': strToU8(
          JSON.stringify({ app: 'MangaCount', schemaVersion: SCHEMA_VERSION })
        ),
      })
    );
    assert.throws(() => validateBackup(sinDb), /falta mangacount.db/);
  });

  it('restore loguea un warning si el safety-backup falla y sigue', async () => {
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });
    const blocked = path.join(destDir, 'bloqueado');
    fs.writeFileSync(blocked, 'no soy un directorio');
    const warnings = [];

    const result = await restoreBackup(db, dataDir, backup.path, {
      now: at(60),
      safetyDir: blocked,
      logger: { warn: (m) => warnings.push(m) },
    });
    db = result.db;
    assert.equal(result.restored, true);
    assert.equal(result.safetyBackup, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /safety-backup/);
  });

  it('restore con opciones por defecto (now/logger/safetyDir)', async () => {
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });
    const result = await restoreBackup(db, dataDir, backup.path);
    db = result.db;
    assert.equal(result.restored, true);
    assert.ok(result.safetyBackup);
  });

  it('restore descarta entradas con rel vacío o segmentos vacíos', async () => {
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });
    const entries = unzipSync(new Uint8Array(fs.readFileSync(backup.path)));
    entries['profiles/'] = strToU8('');
    entries['profiles//nested.txt'] = strToU8('x');
    const weird = path.join(destDir, 'weird.zip');
    fs.writeFileSync(weird, zipSync(entries));

    const result = await restoreBackup(db, dataDir, weird, { now: at(60), logger: { warn() {} } });
    db = result.db;
    assert.equal(fs.existsSync(path.join(dataDir, 'nested.txt')), false);
  });
});
