import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from './client.js';
import { dedupeCatalogs } from './catalog-dedupe.js';
import { createManga } from './repositories/mangas.js';

describe('db/catalog-dedupe', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdedup-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const insert = (table, name) =>
    db.prepare(`INSERT INTO ${table} (Name) VALUES (?)`).run(name).lastInsertRowid;

  it('dry-run reporta el plan sin modificar nada', () => {
    insert('Publisher', 'Ivrea');
    insert('Publisher', 'ivrea');
    const report = dedupeCatalogs(db, { dryRun: true });
    assert.equal(report.Publisher.length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Publisher').get().n, 2);
  });

  it('fusiona, repunta los mangas y normaliza espacios', () => {
    const lower = insert('Publisher', 'ivrea');
    insert('Publisher', 'Ivrea');
    insert('Format', '  Tankoubon ');
    const manga = createManga(db, { name: 'a', publisherId: lower }).id;

    const report = dedupeCatalogs(db);

    assert.deepEqual(
      db.prepare('SELECT Name FROM Publisher').all().map((r) => r.Name),
      ['ivrea'] // canónico: el más usado (empate -> menor Id)
    );
    assert.equal(db.prepare('SELECT PublisherId FROM Manga WHERE Id = ?').get(manga).PublisherId, lower);
    assert.equal(db.prepare('SELECT Name FROM Format').get().Name, 'Tankoubon');
    assert.equal(report.Publisher.length, 1);
    assert.equal(report.Format.length, 1);
  });
});
