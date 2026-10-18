import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createProfile } from '../db/repositories/profiles.js';
import { createManga } from '../db/repositories/mangas.js';
import { upsertEntry } from '../db/repositories/entries.js';
import { parseTsv, importTsv, exportTsv } from './entries.js';
import { handlers } from '../ipc/handlers.js';

const SAMPLE = [
  'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial',
  'berserk\t10\t41\t\tFalse\tTrue\tTankoubon\tPanini',
  'vagabond\t5\t37\t20-21\tFalse\tFalse\tKanzenban\tIvrea',
].join('\n');

describe('services/entries', () => {
  let dir;
  let db;
  let profile;
  const ctx = () => ({ db });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcsvc-'));
    db = openDb(dir);
    profile = createProfile(db, 'yo');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('parsea TSV con header, tipos y defaults', () => {
    const rows = parseTsv(SAMPLE, 7);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      mangaName: 'berserk',
      quantity: 10,
      totalVolumes: 41,
      pending: null,
      priority: true,
      formatName: 'Tankoubon',
      publisherName: 'Panini',
      profileId: 7,
    });
    assert.equal(rows[1].pending, '20-21');
  });

  it('importa creando mangas y reimportar actualiza sin duplicar', () => {
    assert.deepEqual(importTsv(db, SAMPLE, 1), { imported: 2 });
    assert.deepEqual(importTsv(db, SAMPLE, 1), { imported: 2 });
    const viaIpc = handlers['entry:list'](ctx(), 1);
    assert.equal(viaIpc.length, 2);
    assert.equal(viaIpc.find((e) => e.manga.name === 'berserk').quantity, 10);
  });

  it('exporta las 8 columnas con round-trip', () => {
    importTsv(db, SAMPLE, 1);
    const out = handlers['entry:export'](ctx(), 1);
    const lines = out.split('\n');
    assert.equal(lines[0], 'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial');
    assert.equal(lines.length, 3);
    const back = parseTsv(out, 1);
    assert.equal(back[0].mangaName, 'berserk');
    assert.equal(back[0].quantity, 10);
  });

  it('handlers validan profileId y TSV', () => {
    assert.throws(() => handlers['entry:list'](ctx(), 0), /profileId inválido/);
    assert.throws(() => handlers['entry:import'](ctx(), { profileId: 1, tsv: '' }), /TSV vacío/);
    assert.deepEqual(handlers['entry:used-formats'](ctx(), 1), []);
  });

  it('parsea filas cortas, campos vacíos y números inválidos', () => {
    const text = [
      'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial',
      'naruto', // row with 1 field: everything by default
      '\t5\t10', // no title: skipped
      'bleach\tabc\t', // non-numeric quantity and empty total
      'onepiece\t1\t10\t\tFalse\t\t\t', // empty format/publisher/pending
    ].join('\n');
    const rows = parseTsv(text, 1);
    assert.equal(rows.length, 3);

    assert.equal(rows[0].mangaName, 'naruto');
    assert.equal(rows[0].quantity, 0);
    assert.equal(rows[0].totalVolumes, null);
    assert.equal(rows[0].pending, null);
    assert.equal(rows[0].priority, false);
    assert.equal(rows[0].formatName, 'Unknown');
    assert.equal(rows[0].publisherName, 'Unknown');

    assert.equal(rows[1].mangaName, 'bleach');
    assert.equal(rows[1].quantity, 0); // parseIntOr -> fallback
    assert.equal(rows[1].totalVolumes, null);

    assert.equal(rows[2].mangaName, 'onepiece');
    assert.equal(rows[2].pending, null);
    assert.equal(rows[2].formatName, 'Unknown');
    assert.equal(rows[2].publisherName, 'Unknown');
  });

  it('reimportar actualiza el catálogo del manga sin duplicar', () => {
    const HEADER = 'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial';
    const row = (fmt, pub) => `${HEADER}\nserie\t1\t5\t\tFalse\tFalse\t${fmt}\t${pub}`;
    importTsv(db, row('Tankoubon', 'Panini'), 1);
    importTsv(db, row('Tankoubon', 'Ivrea'), 1); // same format, different publisher
    importTsv(db, row('Tankoubon', 'Ivrea'), 1); // both equal: does not update
    importTsv(db, row('Kanzenban', 'Ivrea'), 1); // different format: short-circuit
    const mangas = handlers['manga:list']({ db });
    assert.equal(mangas.length, 1);
    const ivrea = handlers['publisher:list']({ db }).find((p) => p.name === 'Ivrea');
    assert.equal(mangas[0].publisherId, ivrea.id);
  });

  it('importa filas con total vacío y catálogos en blanco (default Unknown)', () => {
    const tsv =
      'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial\n' +
      'sin-total\t1\t\t\tFalse\tTrue\t   \t';
    assert.deepEqual(importTsv(db, tsv, profile.id), { imported: 1 });
    const manga = handlers['manga:list']({ db })[0];
    assert.equal(manga.volumes, 0); // totalVolumes null -> 0
    assert.equal(manga.name, 'sin-total');
    assert.ok(handlers['format:list']({ db }).every((f) => f.name.trim() !== ''));
  });

  it('exporta una serie completa (cantidad >= volúmenes)', () => {
    const manga = createManga(db, { name: 'completa', volumes: 5 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 5 });
    const row = exportTsv(db, profile.id).split('\n')[1].split('\t');
    assert.equal(row[4], 'True');
  });

  it('exporta series en publicación y sin catálogos (defaults Unknown)', () => {
    const manga = createManga(db, { name: 'en publicación' });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 0, priority: false });
    const row = exportTsv(db, profile.id).split('\n')[1].split('\t');
    assert.equal(row[0], 'en publicación');
    assert.equal(row[2], '0'); // volumes 0
    assert.equal(row[4], 'False'); // complete false
    assert.equal(row[5], 'False'); // priority false
    assert.equal(row[6], 'Unknown');
    assert.equal(row[7], 'Unknown');
  });

  it('exporta entradas huérfanas (manga null en el JOIN)', () => {
    // Entry without a valid Manga: the LEFT JOIN returns manga null.
    db.pragma('foreign_keys = OFF');
    db.prepare('INSERT INTO Entry (ProfileId, MangaId, PurchasedVolumes) VALUES (?, 999999, 3)').run(
      profile.id
    );
    db.pragma('foreign_keys = ON');
    const row = exportTsv(db, profile.id).split('\n')[1].split('\t');
    assert.equal(row[0], ''); // no name
    assert.equal(row[3], ''); // pending null
    assert.equal(row[4], 'False');
    assert.equal(row[5], 'False');
    assert.equal(row[6], 'Unknown');
    assert.equal(row[7], 'Unknown');
  });
});
