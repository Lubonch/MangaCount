import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, getCounts, SCHEMA_VERSION } from './client.js';

describe('db/client', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctest-'));
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('crea la BD con esquema y seed en un directorio nuevo', () => {
    db = openDb(dir);
    assert.ok(fs.existsSync(path.join(dir, 'mangacount.db')));
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
    assert.deepEqual(getCounts(db), {
      profiles: 1,
      mangas: 0,
      entries: 0,
      formats: 5,
      publishers: 5,
    });
  });

  it('reapertura no duplica el seed y conserva datos', () => {
    db = openDb(dir);
    db.prepare('INSERT INTO Profile (Name) VALUES (?)').run('segundo');
    db.close();
    db = openDb(dir);
    assert.equal(getCounts(db).profiles, 2);
    assert.equal(getCounts(db).formats, 5);
  });

  it('respeta UNIQUE(ProfileId, MangaId) y FK con CASCADE', () => {
    db = openDb(dir);
    const manga = db
      .prepare('INSERT INTO Manga (Title, TotalVolumes) VALUES (?, ?) RETURNING Id')
      .get('berserk', 41);
    db.prepare(
      'INSERT INTO Entry (ProfileId, MangaId, PurchasedVolumes) VALUES (1, ?, 0)'
    ).run(manga.Id);
    assert.throws(() =>
      db
        .prepare('INSERT INTO Entry (ProfileId, MangaId, PurchasedVolumes) VALUES (1, ?, 0)')
        .run(manga.Id)
    );
    db.prepare('DELETE FROM Profile WHERE Id = 1').run();
    assert.equal(getCounts(db).entries, 0);
  });
});
