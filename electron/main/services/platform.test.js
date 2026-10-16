import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createManga } from '../db/repositories/mangas.js';
import { createProfile } from '../db/repositories/profiles.js';
import { getProfileById } from '../db/repositories/profiles.js';
import { upsertEntry } from '../db/repositories/entries.js';
import { saveProfilePicture, profilePicturePath } from './files.js';
import { createLogger } from './logger.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { databaseStatistics, nukeLocalData } from './database.js';
import { handlers } from '../ipc/handlers.js';

describe('services/files+logger+prefs+database', () => {
  let dir;
  let db;
  const ctx = () => ({ db, dataDir: dir });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcplat-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fotos: valida, guarda y actualiza el perfil', () => {
    const profile = createProfile(db, 'yo');
    const { fileName, url } = handlers['profile:upload-picture'](ctx(), {
      profileId: profile.id,
      originalName: 'foto.png',
      buffer: Buffer.from([1, 2, 3]),
    });
    assert.match(fileName, /^profile_\d+_[0-9a-f-]+\.png$/);
    assert.equal(url, `mangacount://profiles/${fileName}`);
    assert.equal(getProfileById(db, profile.id).profilePicture, url);
    assert.ok(fs.existsSync(profilePicturePath(dir, fileName)));
    assert.throws(
      () => saveProfilePicture(db, dir, profile.id, { originalName: 'x.txt', buffer: Buffer.from('hola') }),
      /imágenes/
    );
    assert.throws(
      () => saveProfilePicture(db, dir, profile.id, { originalName: 'x.png', buffer: Buffer.alloc(0) }),
      /vacío/
    );
  });

  it('logger: rota al cambiar el día solo con contenido', () => {
    const logsDir = path.join(dir, 'logs');
    let today = new Date(2026, 4, 10, 12, 0, 0);
    const log = createLogger({ logsDir, now: () => today });
    log.info('hola');
    assert.ok(fs.existsSync(path.join(logsDir, 'app.txt')));
    today = new Date(2026, 4, 11, 9, 0, 0);
    log.info('día nuevo');
    assert.ok(fs.existsSync(path.join(logsDir, 'app.2026-05-11.txt')));
    // Vacío no rota: borro actual, escribo nada y cambio de día.
    fs.rmSync(path.join(logsDir, 'app.txt'));
    fs.writeFileSync(path.join(logsDir, 'app.txt'), '');
    fs.utimesSync(path.join(logsDir, 'app.txt'), new Date(2026, 4, 11), new Date(2026, 4, 11));
    today = new Date(2026, 4, 12, 9, 0, 0);
    const log2 = createLogger({ logsDir, now: () => today });
    log2.info('x');
    assert.ok(!fs.existsSync(path.join(logsDir, 'app.2026-05-12.txt')));
  });

  it('prefs: round-trip con default vacío', () => {
    assert.deepEqual(loadPrefs(dir), {});
    savePrefs(dir, { lastImportDir: '/tmp' });
    assert.deepEqual(loadPrefs(dir), { lastImportDir: '/tmp' });
  });

  it('database: statistics y nuke-local con reseed', () => {
    const profile = createProfile(db, 'yo');
    const manga = createManga(db, { name: 'berserk', volumes: 41 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    const stats = handlers['database:statistics'](ctx());
    assert.equal(stats.entries, 1);
    assert.equal(stats.mangas, 1);
    const nuked = handlers['database:nuke-local'](ctx());
    assert.equal(nuked.ok, true);
    assert.equal(nuked.entries, 0);
    assert.equal(nuked.mangas, 0);
    assert.equal(nuked.profiles, 1); // Default Profile reasegurado
    assert.equal(nuked.formats, 5); // catálogos conservados (divergencia documentada)
  });
});
