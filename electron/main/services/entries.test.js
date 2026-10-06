import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
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
  const ctx = () => ({ db });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcsvc-'));
    db = openDb(dir);
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
});
