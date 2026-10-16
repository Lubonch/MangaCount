import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync, strToU8, zipSync } from 'fflate';
import { openDb } from '../db/client.js';
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
  DEFAULT_KEEP,
} from './backup.js';

describe('services/backup', () => {
  let dataDir;
  let destDir;
  let db;

  const at = (minutes) => () => new Date(new Date(2026, 0, 2, 3, 0, 0).getTime() + minutes * 60000);

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdata-'));
    destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdest-'));
    db = openDb(dataDir);
  });

  afterEach(() => {
    try {
      db?.close();
    } catch {
      /* ya cerrada por restore */
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  it('nombre con timestamp y patrón propio', () => {
    assert.equal(backupFileName(new Date(2026, 0, 2, 3, 4)), 'mangacount-backup-2026-01-02-0304.zip');
    assert.equal(isBackupFileName('mangacount-backup-2026-01-02-0304.zip'), true);
    assert.equal(isBackupFileName('otra-cosa.zip'), false);
  });

  it('crea un backup con manifest, db y profiles', async () => {
    const profile = createProfile(db, 'yo');
    const { fileName } = saveProfilePicture(db, dataDir, profile.id, {
      originalName: 'foto.png',
      buffer: Buffer.from([1, 2, 3]),
    });

    const result = await createBackup(db, dataDir, destDir, { now: at(0) });
    assert.equal(result.fileName, 'mangacount-backup-2026-01-02-0300.zip');
    assert.ok(fs.existsSync(result.path));

    const entries = unzipSync(new Uint8Array(fs.readFileSync(result.path)));
    assert.ok(entries['manifest.json']);
    assert.ok(entries['mangacount.db']);
    assert.ok(entries[`profiles/${fileName}`]);
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

    const removed = pruneBackups(destDir, DEFAULT_KEEP);
    assert.equal(removed.length, 1);
    assert.equal(removed[0], 'mangacount-backup-2026-01-02-0300.zip');
    assert.equal(listBackupFiles(destDir).length, DEFAULT_KEEP);
    assert.ok(fs.existsSync(path.join(destDir, 'backup-de-otro-programa.zip')));
    assert.equal(listBackups(destDir).length, DEFAULT_KEEP);
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
    const backup = await createBackup(db, dataDir, destDir, { now: at(0) });

    createProfile(db, 'dos');

    const result = await restoreBackup(db, dataDir, backup.path, { now: at(60), logger: { warn() {} } });
    db = result.db;
    assert.equal(result.restored, true);
    assert.ok(result.safetyBackup);

    const names = listProfiles(db).map((p) => p.name);
    assert.ok(names.includes('uno'));
    assert.ok(!names.includes('dos'));
    assert.ok(fs.existsSync(path.join(dataDir, 'profiles', fileName)));
  });
});
