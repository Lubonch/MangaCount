import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createManga } from '../db/repositories/mangas.js';
import { createProfile } from '../db/repositories/profiles.js';
import { upsertEntry } from '../db/repositories/entries.js';
import { publishers } from '../db/repositories/catalogs.js';
import { clampLimit, getRecommendations } from './recommendations.js';
import { handlers } from '../ipc/handlers.js';

describe('services/recommendations', () => {
  let dir;
  let db;
  const ctx = () => ({ db });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcrec-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('clamp de limit 1-10 como el controller', () => {
    assert.equal(clampLimit(0), 1);
    assert.equal(clampLimit(99), 10);
    assert.equal(clampLimit(5), 5);
    assert.equal(clampLimit(), 10);
  });

  it('perfil vacío: sin confianza y sin items (fallback local)', async () => {
    const profile = createProfile(db, 'nuevo');
    const res = await handlers['recommendation:get'](ctx(), { profileId: profile.id, limit: 10 });
    assert.equal(res.isConfident, false);
    assert.deepEqual(res.items, []);
    assert.equal(res.limit, 10);
  });

  it('colección Ivrea: mercado Argentina, sin owned ni fuera de mercado', async () => {
    const profile = createProfile(db, 'yo');
    // Ivrea -> Argentina. Tomo un título del catálogo como owned.
    const { default: catalog } = await import('../../../shared/recommendations/catalog.json', {
      with: { type: 'json' },
    });
    const owned = catalog.find((c) => c.publisher === 'Ivrea');
    assert.ok(owned, 'el catálogo necesita un título Ivrea');
    const ivrea = publishers.list(db).find((p) => p.name === 'Ivrea');
    const manga = createManga(db, { name: owned.title, volumes: 5, publisherId: ivrea.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 5 });
    const res = await getRecommendations(db, profile.id, 10);
    assert.equal(res.inferredCountry, 'Argentina');
    assert.equal(res.provider, 'local');
    assert.ok(res.items.length > 0 && res.items.length <= 10);
    for (const item of res.items) {
      assert.equal(item.publisherCountry, 'Argentina');
      assert.notEqual(item.title.toLowerCase(), owned.title.toLowerCase());
    }
  });

  it('valida profileId', async () => {
    await assert.rejects(handlers['recommendation:get'](ctx(), { profileId: 0 }), /profileId inválido/);
  });
});
