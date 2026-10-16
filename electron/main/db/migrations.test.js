import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from './client.js';
import { migrateCatalogV3 } from './migrations.js';
import { createManga } from './repositories/mangas.js';

describe('db/migrations: v3 (catálogos case-insensitive)', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcmig-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const insertPublisher = (name) =>
    db.prepare('INSERT INTO Publisher (Name) VALUES (?)').run(name).lastInsertRowid;

  const publisherOf = (mangaId) =>
    db.prepare('SELECT PublisherId FROM Manga WHERE Id = ?').get(mangaId).PublisherId;

  it('fusiona duplicados, repunta los mangas y deja el canónico más usado', () => {
    // Simula datos v2: quita el índice no-case y mete duplicados por mayúsculas/espacios.
    db.exec('DROP INDEX IF EXISTS UX_Publisher_Name_NoCase');
    const ivreaLower = insertPublisher('ivrea');
    const ivreaUpper = insertPublisher('Ivrea');
    const panini = insertPublisher('  PANINI ');

    const a = createManga(db, { name: 'a', publisherId: ivreaLower }).id;
    const b = createManga(db, { name: 'b', publisherId: ivreaLower }).id; // 'ivrea' se usa 2 veces
    const c = createManga(db, { name: 'c', publisherId: ivreaUpper }).id;
    const d = createManga(db, { name: 'd', publisherId: panini }).id;

    migrateCatalogV3(db);

    const names = db.prepare('SELECT Name FROM Publisher ORDER BY Id').all().map((r) => r.Name);
    assert.deepEqual(names, ['ivrea', 'PANINI']); // se conserva la capitalización del canónico, sin espacios

    const canonical = db.prepare("SELECT Id FROM Publisher WHERE Name = 'ivrea'").get().Id;
    assert.equal(publisherOf(a), canonical);
    assert.equal(publisherOf(b), canonical);
    assert.equal(publisherOf(c), canonical);
    assert.equal(publisherOf(d), db.prepare("SELECT Id FROM Publisher WHERE Name = 'PANINI'").get().Id);
  });

  it('reusa el canónico al crear y bloquea duplicados por índice no-case', () => {
    db.exec('DROP INDEX IF EXISTS UX_Format_Name_NoCase');
    db.exec('DROP INDEX IF EXISTS UX_Publisher_Name_NoCase');
    migrateCatalogV3(db);

    // El índice no-case impide reinsertar la misma editorial con otra capitalización.
    insertPublisher('Ivrea');
    assert.throws(() => insertPublisher('ivrea'));
  });
});
