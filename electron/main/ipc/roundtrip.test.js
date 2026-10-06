// Ida y vuelta por canal: el renderer (localAdapter) contra el main (handlers)
// con un transporte loopback en proceso. Cubre las filas 1-15 de parity-matrix.md.
// Nota: el transporte real (structured clone de Electron) no se ejercita aquí;
// los DTOs son JSON plano, compatible con ese transporte.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { handlers } from './handlers.js';
import * as api from '../../../mangacount.client/src/api/localAdapter.js';
import { installApiFetchShim } from '../../../mangacount.client/src/api/localAdapter.js';

describe('ipc roundtrip por canal', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcround-'));
    db = openDb(dir);
    globalThis.window = {
      mangaCount: {
        invoke: (channel, ...args) => {
          const fn = handlers[channel];
          if (!fn) return Promise.reject(new Error(`sin handler: ${channel}`));
          return Promise.resolve(fn({ db, dataDir: dir }, ...args));
        },
      },
    };
  });

  afterEach(() => {
    delete globalThis.window;
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('filas 1-4: perfiles + foto', async () => {
    const created = await api.profileUpsert({ name: 'cole' });
    assert.ok(created.id > 0);
    assert.equal((await api.profileList()).length, 2);
    assert.equal((await api.profileGet(created.id)).name, 'cole');
    const { fileName } = await api.profileUploadPicture(created.id, 'a.png', new Uint8Array([9]));
    assert.match(fileName, /\.png$/);
    assert.deepEqual(await api.profileDelete(created.id), { ok: true });
  });

  it('filas 5-9: entries + import/export + filtros', async () => {
    const profile = await api.profileUpsert({ name: 'yo' });
    const tsv = 'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial\nberserk\t3\t41\t\tFalse\tFalse\tTankoubon\tPanini';
    assert.deepEqual(await api.entryImport(profile.id, tsv), { imported: 1 });
    const list = await api.entryList(profile.id);
    assert.equal(list.length, 1);
    assert.equal((await api.entryGet(list[0].id)).quantity, 3);
    const upserted = await api.entryUpsert({ ...list[0], quantity: 4 });
    assert.equal(upserted.quantity, 4);
    assert.ok((await api.entryExport(profile.id)).includes('berserk'));
    const formats = await api.entryUsedFormats(profile.id);
    assert.equal(formats.length, 1);
    assert.equal(formats[0].name, 'Tankoubon');
    assert.equal(formats[0].count, 1);
    assert.ok(formats[0].id > 0);
    const publishers = await api.entryUsedPublishers(profile.id);
    assert.equal(publishers.length, 1);
    assert.equal(publishers[0].name, 'Panini');
    assert.equal(publishers[0].count, 1);
    assert.ok(publishers[0].id > 0);
  });

  it('filas 10-13: mangas y catálogos', async () => {
    const manga = await api.mangaUpsert({ name: 'dorohedoro', volumes: 23 });
    assert.equal((await api.mangaGet(manga.id)).volumes, 23);
    assert.equal((await api.mangaList()).length, 1);
    assert.equal((await api.formatList()).length, 5);
    assert.ok((await api.formatCreate('Wideban')).id > 0);
    assert.equal((await api.publisherList()).length, 5);
    assert.ok((await api.publisherCreate('Kemuri')).id > 0);
  });

  it('filas 14-15: recomendación y base local', async () => {
    const profile = await api.profileUpsert({ name: 'rec' });
    const rec = await api.recommendationGet(profile.id, 5);
    assert.equal(rec.isConfident, false);
    assert.equal(rec.limit, 5);
    const stats = await api.databaseStatistics();
    assert.ok(stats.profiles >= 2);
    const nuked = await api.databaseNukeLocal();
    assert.equal(nuked.entries, 0);
  });

  it('shim fetch: enruta /api/* por IPC con Response-like', async () => {
    installApiFetchShim(globalThis.window);
    const res = await globalThis.window.fetch('/api/profile');
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(await res.json()));

    const created = await (
      await globalThis.window.fetch('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ name: 'shim' }),
      })
    ).json();
    assert.ok(created.id > 0);

    const entries = await (
      await globalThis.window.fetch(`/api/entry?profileId=${created.id}`)
    ).json();
    assert.deepEqual(entries, []);

    await assert.rejects(
      globalThis.window.fetch('/api/no-existe'),
      /Ruta \/api sin canal IPC/
    );
  });

  it('fallback web: sin window.mangaCount usa fetch', async () => {
    delete globalThis.window;
    let seenUrl = null;
    globalThis.fetch = async (url) => {
      seenUrl = url;
      return { ok: true, json: async () => [] };
    };
    try {
      await api.profileList();
      assert.equal(seenUrl, '/api/profile');
    } finally {
      delete globalThis.fetch;
    }
  });
});
