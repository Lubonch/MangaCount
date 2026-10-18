import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createProfile } from '../db/repositories/profiles.js';
import { createManga } from '../db/repositories/mangas.js';
import { upsertEntry } from '../db/repositories/entries.js';
import { upsertRef } from '../db/repositories/manga-external-refs.js';
import { dismiss, markSeen } from '../db/repositories/recommendation-feedback.js';
import { getAnilistRecommendations, clampAnilistLimit } from './anilist-recommendations.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

function graphNode(id, rating, { title = `T${id}`, genres = [], tags = [], volumes = null, isAdult = false } = {}) {
  return {
    rating,
    mediaRecommendation: {
      id,
      title: { romaji: title },
      genres,
      tags,
      volumes,
      coverImage: { large: `https://img/${id}.jpg` },
      isAdult,
    },
  };
}

// Fake `fetchImpl`: never touches the network. Responds the graph by seed id and
// empty for title searches (seeds without a link).
function makeFetch(graphs, { failIds = [], searchResults = [] } = {}) {
  return async (_url, opts = {}) => {
    const body = JSON.parse(opts.body ?? '{}');
    const id = body?.variables?.id;
    if (id != null) {
      if (failIds.includes(id)) throw new Error('AniList caído');
      const nodes = graphs[id] ?? [];
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { Media: { recommendations: { nodes } } } }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ data: { Page: { media: searchResults } } }) };
  };
}

describe('services/anilist-recommendations', () => {
  let dir;
  let db;
  let profile;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcanilist-'));
    db = openDb(dir);
    profile = createProfile(db, 'yo');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function seedManga(name, externalId) {
    const manga = createManga(db, { name });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    if (externalId != null) upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId });
    return manga;
  }

  const deps = (fetchImpl, extra = {}) => ({
    fetchImpl,
    now: NOW,
    seenTtlDays: 30,
    ...extra,
  });

  it('clampAnilistLimit limita 1-25', () => {
    assert.equal(clampAnilistLimit(0), 1);
    assert.equal(clampAnilistLimit(99), 25);
    assert.equal(clampAnilistLimit(5), 5);
    assert.equal(clampAnilistLimit(), 10);
  });

  it('sin semillas resolubles devuelve null (fallback local)', async () => {
    const res = await getAnilistRecommendations(db, profile.id, deps(makeFetch({})));
    assert.equal(res, null);
  });

  it('agrega el grafo de varias semillas y ordena por rating', async () => {
    seedManga('Alfa', 100);
    seedManga('Beta', 200);
    const fetchImpl = makeFetch({
      100: [graphNode(1, 10, { title: 'Alta' }), graphNode(2, 3, { title: 'Baja' })],
      200: [graphNode(2, 2, { title: 'Baja' })],
    });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.equal(res.provider, 'anilist');
    assert.equal(res.isConfident, true);
    assert.deepEqual(res.items.map((i) => i.externalId), ['1', '2']);
    assert.equal(res.items[0].coverUrl, 'https://img/1.jpg');
    assert.equal(res.items[0].reason, 'Alfa');
    assert.equal(res.exhausted, true); // there are only 2 candidates for the default 10
  });

  it('el mismo mediaRecommendation en dos semillas suma rating y sube de posición', async () => {
    seedManga('Alfa', 100);
    seedManga('Beta', 200);
    seedManga('Gamma', 300);
    const fetchImpl = makeFetch({
      100: [graphNode(9, 4, { title: 'Compartida' }), graphNode(8, 6, { title: 'Sola' })],
      200: [graphNode(9, 5, { title: 'Compartida' })],
      300: [],
    });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.equal(res.items[0].externalId, '9');
    // `reason` = the highest-rated seed that brought it (Beta, rating 5).
    assert.equal(res.items[0].reason, 'Beta');
  });

  it('filtra descartados, ya poseídos, vistos dentro del TTL y +18', async () => {
    seedManga('Alfa', 100);
    seedManga('Beta', 200);
    // "already have it": a profile manga linked to candidate 5.
    const owned = createManga(db, { name: 'Poseída' });
    upsertEntry(db, { mangaId: owned.id, profileId: profile.id, quantity: 1 });
    upsertRef(db, { mangaId: owned.id, provider: 'anilist', externalId: 5 });
    dismiss(db, profile.id, 'anilist', 2);
    markSeen(db, profile.id, 'anilist', 3, iso(5));
    const fetchImpl = makeFetch({
      100: [
        graphNode(2, 9, { title: 'Descartada' }),
        graphNode(3, 8, { title: 'Vista' }),
        graphNode(4, 7, { title: 'Adulto', isAdult: true }),
        graphNode(5, 6, { title: 'Ya la tengo' }),
        graphNode(6, 5, { title: 'Pasa' }),
      ],
      200: [],
    });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.deepEqual(res.items.map((i) => i.externalId), ['6']);
  });

  it('excluye por título normalizado aunque no haya vínculo', async () => {
    seedManga('Alfa', 100);
    seedManga('Monster', null); // owned local, no ref
    const fetchImpl = makeFetch({
      100: [graphNode(7, 9, { title: 'Monster' }), graphNode(8, 4, { title: 'Otra' })],
    });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.deepEqual(res.items.map((i) => i.externalId), ['8']);
  });

  it('una vista fuera del TTL vuelve a aparecer', async () => {
    seedManga('Alfa', 100);
    markSeen(db, profile.id, 'anilist', 9, iso(40)); // 40 days > TTL 30
    const fetchImpl = makeFetch({ 100: [graphNode(9, 9, { title: 'Vuelve' })] });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.deepEqual(res.items.map((i) => i.externalId), ['9']);
  });

  it('marca las devueltas como vistas (no se repiten dentro del TTL)', async () => {
    seedManga('Alfa', 100);
    const fetchImpl = makeFetch({ 100: [graphNode(1, 9, { title: 'Uno' })] });
    const first = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.equal(first.items.length, 1);
    const second = await getAnilistRecommendations(db, profile.id, deps(fetchImpl));
    assert.equal(second.items.length, 0);
    assert.equal(second.exhausted, true);
  });

  it('fallo total de AniList devuelve null; fallo parcial sigue con el resto', async () => {
    seedManga('Alfa', 100);
    seedManga('Beta', 200);

    const allFail = makeFetch({}, { failIds: [100, 200] });
    assert.equal(await getAnilistRecommendations(db, profile.id, deps(allFail)), null);

    const partial = makeFetch({ 200: [graphNode(1, 9, { title: 'Sobrevive' })] }, { failIds: [100] });
    const res = await getAnilistRecommendations(db, profile.id, deps(partial));
    assert.deepEqual(res.items.map((i) => i.externalId), ['1']);
  });

  it('buffer insuficiente: devuelve menos que limit y exhausted', async () => {
    seedManga('Alfa', 100);
    const fetchImpl = makeFetch({ 100: [graphNode(1, 9, { title: 'Única' })] });
    const res = await getAnilistRecommendations(db, profile.id, deps(fetchImpl, { limit: 3 }));
    assert.equal(res.items.length, 1);
    assert.equal(res.exhausted, true);
    assert.equal(res.limit, 3);
  });
});
