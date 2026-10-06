import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { handlers, channelNames } from '../ipc/handlers.js';
import { saveOrUpdateProfile, saveOrUpdateManga } from './catalog-base.js';

describe('services/catalog-base + canales', () => {
  let dir;
  let db;
  const ctx = () => ({ db });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mccat-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('perfiles: upsert crea y renombra, canales responden', () => {
    const created = handlers['profile:upsert'](ctx(), { name: 'cole' });
    assert.ok(created.id > 0);
    const renamed = handlers['profile:upsert'](ctx(), { id: created.id, name: 'cole 2' });
    assert.equal(renamed.name, 'cole 2');
    assert.equal(handlers['profile:list'](ctx()).length, 2); // + Default Profile
    assert.equal(handlers['profile:get'](ctx(), created.id).name, 'cole 2');
    assert.deepEqual(handlers['profile:delete'](ctx(), created.id), { ok: true });
    assert.throws(() => saveOrUpdateProfile(db, { name: '  ' }), /requerido/);
  });

  it('mangas/formatos/editoriales: upsert y creación', () => {
    const manga = handlers['manga:upsert'](ctx(), { name: 'one piece', volumes: 100 });
    assert.ok(manga.id > 0);
    assert.equal(handlers['manga:get'](ctx(), manga.id).volumes, 100);
    assert.equal(handlers['manga:list'](ctx()).length, 1);
    const fmt = handlers['format:create'](ctx(), { name: 'Wideban' });
    assert.ok(fmt.id > 5);
    const pub = handlers['publisher:create'](ctx(), { name: 'Kemuri' });
    assert.ok(pub.id > 5);
    const relinked = handlers['manga:upsert'](ctx(), {
      id: manga.id, name: 'one piece', volumes: 101, formatId: fmt.id, publisherId: pub.id,
    });
    assert.equal(relinked.volumes, 101);
    assert.equal(relinked.formatId, fmt.id);
    assert.throws(() => saveOrUpdateManga(db, { name: '' }), /requerido/);
  });

  it('preload expone los mismos canales registrados', async () => {
    const src = fs.readFileSync(
      new URL('../../preload.cjs', import.meta.url),
      'utf8'
    );
    for (const ch of channelNames()) {
      assert.ok(src.includes(`'${ch}'`), `preload no lista ${ch}`);
    }
  });
});
