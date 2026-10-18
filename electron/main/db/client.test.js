import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
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

  it('crea la BD con esquema en un directorio nuevo (sin seed de catálogos)', () => {
    db = openDb(dir);
    assert.ok(fs.existsSync(path.join(dir, 'mangacount.db')));
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
    assert.deepEqual(getCounts(db), {
      profiles: 0,
      mangas: 0,
      entries: 0,
      formats: 0,
      publishers: 0,
    });
  });

  it('reapertura no duplica el seed y conserva datos', () => {
    db = openDb(dir);
    db.prepare('INSERT INTO Profile (Name) VALUES (?)').run('segundo');
    db.close();
    db = openDb(dir);
    assert.equal(getCounts(db).profiles, 1);
    assert.equal(getCounts(db).formats, 0);
  });

  it('openDb cierra y propaga si falla la aplicación del esquema', () => {
    db = openDb(dir);
    // Forces the schema to run again and fail: an object named after one of its
    // indexes blows up the `db.exec`.
    db.exec('DROP INDEX IX_Entry_ProfileId');
    db.prepare('CREATE TABLE IX_Entry_ProfileId (x)').run();
    db.pragma('user_version = 0');
    db.close();
    assert.throws(
      () => openDb(dir),
      /there is already a table named IX_Entry_ProfileId/
    );
    db = null; // the internal connection was already closed inside openDb
  });

  it('respeta UNIQUE(ProfileId, MangaId) y FK con CASCADE', () => {
    db = openDb(dir);
    const profileId = db
      .prepare('INSERT INTO Profile (Name) VALUES (?) RETURNING Id')
      .get('yo').Id;
    const manga = db
      .prepare('INSERT INTO Manga (Title, TotalVolumes) VALUES (?, ?) RETURNING Id')
      .get('berserk', 41);
    db.prepare(
      'INSERT INTO Entry (ProfileId, MangaId, PurchasedVolumes) VALUES (?, ?, 0)'
    ).run(profileId, manga.Id);
    assert.throws(() =>
      db
        .prepare('INSERT INTO Entry (ProfileId, MangaId, PurchasedVolumes) VALUES (?, ?, 0)')
        .run(profileId, manga.Id)
    );
    db.prepare('DELETE FROM Profile WHERE Id = ?').run(profileId);
    assert.equal(getCounts(db).entries, 0);
  });

  it('base nueva: MangaExternalRef nace con la columna IsAdult', () => {
    db = openDb(dir);
    const col = db
      .prepare('PRAGMA table_info(MangaExternalRef)')
      .all()
      .find((c) => c.name === 'IsAdult');
    assert.ok(col, 'falta la columna IsAdult');
    assert.equal(col.notnull, 1);
    assert.equal(col.dflt_value, '0');
  });

  it('migra v3 → v4 agregando IsAdult con default 0, y reabrir es idempotente', () => {
    const file = path.join(dir, 'mangacount.db');
    // DB with the previous schema (v3): built with the current schema and the
    // column removed to simulate an install before the migration.
    const legacy = new Database(file);
    legacy.exec(fs.readFileSync(new URL('./schema.sqlite.sql', import.meta.url), 'utf8'));
    legacy.exec('ALTER TABLE MangaExternalRef DROP COLUMN IsAdult');
    const mangaId = legacy
      .prepare('INSERT INTO Manga (Title, TotalVolumes) VALUES (?, ?) RETURNING Id')
      .get('legacy', 1).Id;
    legacy
      .prepare(
        'INSERT INTO MangaExternalRef (MangaId, Provider, ExternalId, CoverFile) VALUES (?, ?, ?, ?)'
      )
      .run(mangaId, 'anilist', '42', 'legacy.png');
    legacy.pragma('user_version = 3');
    legacy.close();

    db = openDb(dir);
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
    assert.equal(db.prepare('SELECT IsAdult FROM MangaExternalRef').get().IsAdult, 0);

    // Reopening does not fail even if the column already exists: `ensureColumn` is idempotent.
    db.close();
    db = openDb(dir);
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
    assert.equal(db.prepare('SELECT IsAdult FROM MangaExternalRef').get().IsAdult, 0);
  });

  it('base nueva: Manga nace con la columna IsAdult', () => {
    db = openDb(dir);
    const col = db
      .prepare('PRAGMA table_info(Manga)')
      .all()
      .find((c) => c.name === 'IsAdult');
    assert.ok(col, 'falta la columna IsAdult');
    assert.equal(col.notnull, 1);
    assert.equal(col.dflt_value, '0');
  });

  it('migra v4 → v5: agrega Manga.IsAdult y hace backfill desde el vínculo +18', () => {
    const file = path.join(dir, 'mangacount.db');
    // DB with the previous schema (v4): removes Manga.IsAdult and leaves a +18 link.
    const legacy = new Database(file);
    legacy.exec(fs.readFileSync(new URL('./schema.sqlite.sql', import.meta.url), 'utf8'));
    legacy.exec('ALTER TABLE Manga DROP COLUMN IsAdult');
    const adult = legacy
      .prepare('INSERT INTO Manga (Title, TotalVolumes) VALUES (?, ?) RETURNING Id')
      .get('adult', 1).Id;
    const plain = legacy
      .prepare('INSERT INTO Manga (Title, TotalVolumes) VALUES (?, ?) RETURNING Id')
      .get('plain', 1).Id;
    legacy
      .prepare(
        'INSERT INTO MangaExternalRef (MangaId, Provider, ExternalId, CoverFile, IsAdult) VALUES (?, ?, ?, ?, 1)'
      )
      .run(adult, 'anilist', '42', 'adult.png');
    legacy
      .prepare(
        'INSERT INTO MangaExternalRef (MangaId, Provider, ExternalId, CoverFile, IsAdult) VALUES (?, ?, ?, ?, 0)'
      )
      .run(plain, 'anilist', '43', 'plain.png');
    legacy.pragma('user_version = 4');
    legacy.close();

    db = openDb(dir);
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
    const row = (id) => db.prepare('SELECT IsAdult FROM Manga WHERE Id = ?').get(id).IsAdult;
    assert.equal(row(adult), 1);
    assert.equal(row(plain), 0);

    // Reopening is idempotent: the backfill breaks nothing and changes nothing.
    db.close();
    db = openDb(dir);
    assert.equal(row(adult), 1);
    assert.equal(row(plain), 0);
  });
});
