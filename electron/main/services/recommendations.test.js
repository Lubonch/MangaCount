import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createManga } from '../db/repositories/mangas.js';
import { createProfile } from '../db/repositories/profiles.js';
import { upsertEntry, listEntries } from '../db/repositories/entries.js';
import { upsertRef, getRef } from '../db/repositories/manga-external-refs.js';
import { publishers } from '../db/repositories/catalogs.js';
import { clampLimit, getRecommendations } from './recommendations.js';
import { inferUserCountry } from '../../../shared/recommendations/countryInference.js';
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
    // Ivrea -> Argentina. Take a catalog title as owned.
    const { default: catalog } = await import('../../../shared/recommendations/catalog.json', {
      with: { type: 'json' },
    });
    const owned = catalog.find((c) => c.publisher === 'Ivrea');
    assert.ok(owned, 'el catálogo necesita un título Ivrea');
    const ivrea = publishers.create(db, 'Ivrea');
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

  async function seedArgentina() {
    const profile = createProfile(db, 'yo');
    const { default: catalog } = await import('../../../shared/recommendations/catalog.json', {
      with: { type: 'json' },
    });
    const owned = catalog.find((c) => c.publisher === 'Ivrea');
    const ivrea = publishers.create(db, 'Ivrea');
    const manga = createManga(db, { name: owned.title, volumes: 5, publisherId: ivrea.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 5 });
    return profile;
  }

  it('reranking: usa el resultado del provider cuando devuelve items', async () => {
    const profile = await seedArgentina();
    const res = await getRecommendations(db, profile.id, 10, {
      providers: [{ name: 'fake', rerank: async () => [{ title: 'reranked' }] }],
    });
    assert.equal(res.provider, 'fake');
    assert.deepEqual(
      res.items.map((i) => i.title),
      ['reranked']
    );
  });

  it('reranking: provider que falla, devuelve vacío o no-array -> fallback local', async () => {
    const profile = await seedArgentina();
    const boom = {
      name: 'boom',
      rerank: async () => {
        throw new Error('boom');
      },
    };
    const empty = { name: 'empty', rerank: async () => [] };
    const notArray = { name: 'na', rerank: async () => 'nope' };
    const res = await getRecommendations(db, profile.id, 10, {
      providers: [boom, empty, notArray],
    });
    assert.equal(res.provider, 'local');
    assert.ok(res.items.length > 0);
  });

  it('valida profileId', async () => {
    await assert.rejects(handlers['recommendation:get'](ctx(), { profileId: 0 }), /profileId inválido/);
  });

  it('la respuesta incluye inference (breakdown) y blockedByImportCount', async () => {
    const profile = createProfile(db, 'yo');
    const { default: catalog } = await import('../../../shared/recommendations/catalog.json', {
      with: { type: 'json' },
    });
    const owned = catalog.find((c) => c.publisher === 'Ivrea');
    const ivrea = publishers.create(db, 'Ivrea');
    const manga = createManga(db, { name: owned.title, volumes: 5, publisherId: ivrea.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 5 });

    const res = await getRecommendations(db, profile.id, 10);
    assert.ok(res.inference, 'la respuesta debe incluir inference');
    assert.ok(Array.isArray(res.inference.breakdown));
    assert.equal(typeof res.blockedByImportCount, 'number');
  });

  it('alias de editorial: "ovni" cuenta como Argentina', async () => {
    const { default: publisherCountries } = await import(
      '../../../shared/recommendations/publisher-countries.json',
      { with: { type: 'json' } }
    );
    const entries = [{ quantity: 3, manga: { publisher: { name: 'ovni' } } }];
    const inference = inferUserCountry(entries, publisherCountries);
    assert.equal(inference.country, 'Argentina');
    assert.equal(inference.isConfident, true);
  });

  it('mercado confiable sin títulos en catálogo → items vacíos (fallback local)', async () => {
    const profile = createProfile(db, 'yo');
    const yen = publishers.create(db, 'Yen Press');
    const manga = createManga(db, { name: 'Serie Yen', volumes: 1, publisherId: yen.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });

    const res = await getRecommendations(db, profile.id, 10);
    assert.equal(res.inferredCountry, 'United States');
    assert.equal(res.isConfident, true);
    assert.deepEqual(res.items, []);
  });
});

describe('recommendation:get con AniList', () => {
  let dir;
  let db;
  let realFetch;
  let profile;
  const ctx = () => ({ db, dataDir: dir });

  const graphResponse = (nodes) => ({
    ok: true,
    status: 200,
    json: async () => ({ data: { Media: { recommendations: { nodes } } } }),
  });

  const node = (id, rating, title) => ({
    rating,
    mediaRecommendation: {
      id,
      title: { romaji: title },
      genres: [],
      tags: [],
      volumes: null,
      coverImage: { large: `https://img/${id}.jpg` },
      isAdult: false,
    },
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcrech-'));
    db = openDb(dir);
    realFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function seed(name, externalId) {
    const manga = createManga(db, { name });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId });
    return manga;
  }

  it('habilitado y con semillas → provider anilist', async () => {
    profile = createProfile(db, 'anilist');
    seed('Alfa', 100);
    globalThis.fetch = async () => graphResponse([node(1, 9, 'Uno'), node(2, 5, 'Dos')]);
    const res = await handlers['recommendation:get'](ctx(), { profileId: profile.id, limit: 10 });
    assert.equal(res.provider, 'anilist');
    assert.deepEqual(res.items.map((i) => i.externalId), ['1', '2']);
  });

  it('AniList caído → motor local (provider local)', async () => {
    profile = createProfile(db, 'caido');
    seed('Alfa', 100);
    globalThis.fetch = async () => {
      throw new Error('sin red');
    };
    const res = await handlers['recommendation:get'](ctx(), { profileId: profile.id, limit: 10 });
    assert.equal(res.provider, 'local');
  });

  it('dismiss persiste y la próxima get lo excluye', async () => {
    profile = createProfile(db, 'descartar');
    seed('Alfa', 100);
    globalThis.fetch = async () => graphResponse([node(1, 9, 'Uno'), node(2, 5, 'Dos')]);
    assert.deepEqual(
      handlers['recommendation:dismiss'](ctx(), { profileId: profile.id, provider: 'anilist', externalId: 1 }),
      { ok: true }
    );
    const res = await handlers['recommendation:get'](ctx(), { profileId: profile.id, limit: 10 });
    assert.deepEqual(res.items.map((i) => i.externalId), ['2']);
  });

  it('own con mangaId vincula y asegura el Entry; sin mangaId crea el manga', () => {
    profile = createProfile(db, 'own');
    const existing = createManga(db, { name: 'Existente' });

    const linked = handlers['recommendation:own'](ctx(), {
      profileId: profile.id,
      provider: 'anilist',
      externalId: 42,
      mangaId: existing.id,
    });
    assert.equal(linked.id, existing.id);
    assert.equal(getRef(db, existing.id, 'anilist').externalId, '42');
    assert.ok(listEntries(db, profile.id).some((e) => e.mangaId === existing.id));

    const created = handlers['recommendation:own'](ctx(), {
      profileId: profile.id,
      provider: 'anilist',
      externalId: 43,
      title: 'Nombre del usuario',
    });
    assert.equal(created.name, 'Nombre del usuario');
    assert.equal(getRef(db, created.id, 'anilist').externalId, '43');
    assert.ok(listEntries(db, profile.id).some((e) => e.mangaId === created.id));
  });

  it('config get/set con validaciones', () => {
    assert.deepEqual(handlers['recommendation:config-get'](ctx()), {
      enabled: true,
      limit: 10,
      seenTtlDays: 30,
    });
    assert.deepEqual(
      handlers['recommendation:config-set'](ctx(), { enabled: false, limit: 5, seenTtlDays: 90 }),
      { enabled: false, limit: 5, seenTtlDays: 90 }
    );
    assert.throws(() => handlers['recommendation:config-set'](ctx(), { limit: 0 }), /entre 1 y 25/);
    assert.throws(() => handlers['recommendation:config-set'](ctx(), { seenTtlDays: 0 }), /entre 1 y 365/);
    assert.throws(() => handlers['recommendation:config-set'](ctx(), { limit: 30 }), /entre 1 y 25/);
  });

  it('dismiss/own validan profileId y externalId', () => {
    const p = createProfile(db, 'validaciones');
    assert.throws(
      () => handlers['recommendation:dismiss'](ctx(), { profileId: 0, externalId: 1 }),
      /profileId inválido/
    );
    assert.throws(
      () => handlers['recommendation:dismiss'](ctx(), { profileId: p.id, externalId: '' }),
      /identificador/
    );
    assert.throws(
      () => handlers['recommendation:own'](ctx(), { profileId: p.id, externalId: 1, title: '  ' }),
      /nombre para el manga/
    );
    assert.throws(
      () => handlers['recommendation:own'](ctx(), { profileId: p.id, externalId: 1, mangaId: 9999 }),
      /mangaId inválido/
    );
  });
});
