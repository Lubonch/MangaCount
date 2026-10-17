import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createManga, getMangaById, setMangaIsAdult } from '../db/repositories/mangas.js';
import { upsertRef, getRef, listRefsByManga } from '../db/repositories/manga-external-refs.js';
import {
  ANILIST_URL,
  MAX_COVER_BYTES,
  assertCoverSize,
  normalizeTitle,
  pickAutoMatch,
  searchManga,
  searchMangaOnce,
  searchMangaDexOnce,
  MANGA_URL,
  fetchCover,
  isAllowedCoverUrl,
  extensionForContentType,
  sniffImageExt,
  coverFileName,
  saveCoverFile,
  removeCoverFile,
  linkCover,
  linkLocalCover,
  refreshCover,
  unlinkCover,
  statusCover,
  coverMap,
  autoMatchCover,
} from './covers.js';

const imageResponse = (type, bytes = [1, 2, 3]) => ({
  ok: true,
  status: 200,
  headers: { get: () => type },
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});

describe('services/covers: assertCoverSize', () => {
  it('acepta el límite exacto y rechaza por encima', () => {
    assert.doesNotThrow(() => assertCoverSize(MAX_COVER_BYTES));
    assert.throws(() => assertCoverSize(MAX_COVER_BYTES + 1), /demasiado grande/);
  });
});

describe('services/covers: normalizeTitle', () => {
  it('normaliza acentos, mayúsculas y signos', () => {
    assert.equal(normalizeTitle('  Berserk! '), 'berserk');
    assert.equal(normalizeTitle('Boku no Héroe'), 'boku no heroe');
    assert.equal(normalizeTitle('One-Punch   Man'), 'one punch man');
  });
});

describe('services/covers: pickAutoMatch', () => {
  const candidates = [
    { id: 1, title: 'Berserk', altTitles: [] },
    { id: 2, title: 'Vinland Saga', altTitles: [] },
  ];

  it('vincula con match exacto y único', () => {
    assert.equal(pickAutoMatch('berserk', candidates).id, 1);
  });

  it('devuelve null si es ambiguo o no hay match', () => {
    const dup = [
      { id: 1, title: 'Berserk', altTitles: [] },
      { id: 2, title: 'BERSERK', altTitles: [] },
    ];
    assert.equal(pickAutoMatch('Berserk', dup), null);
    assert.equal(pickAutoMatch('Naruto', candidates), null);
  });
});

describe('services/covers: searchManga', () => {
  it('mapea los resultados de AniList (fetch fake)', async () => {
    const fetchImpl = async (url, opts) => {
      assert.equal(url, ANILIST_URL);
      assert.equal(opts.headers['User-Agent'], 'MangaCount');
      const body = JSON.parse(opts.body);
      assert.equal(body.variables.search, 'Berserk');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              media: [
                {
                  id: 30013,
                  title: { romaji: 'Berserk', english: 'Berserk', native: 'ベルセルク' },
                  coverImage: { large: 'https://img/berserk.jpg', medium: 'https://img/b.jpg' },
                  format: 'MANGA',
                  volumes: 41,
                  startDate: { year: 1989 },
                },
              ],
            },
          },
        }),
      };
    };
    const results = await searchManga('Berserk', { fetchImpl });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 30013);
    assert.equal(results[0].coverUrl, 'https://img/berserk.jpg');
    assert.deepEqual(results[0].altTitles, ['Berserk', 'ベルセルク']);
  });

  it('marca RATE_LIMIT con retryAfter en 429', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      headers: { get: () => '15' },
    });
    await assert.rejects(
      () => searchManga('Berserk', { fetchImpl, retries: 0 }),
      (err) => err.code === 'RATE_LIMIT' && err.retryAfterMs === 15000
    );
  });

  it('reintenta una vez tras un 429 respetando Retry-After', async () => {
    let calls = 0;
    const slept = [];
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 429, headers: { get: () => '2' } };
      return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
    };
    const results = await searchManga('x', { fetchImpl, fallbackToMangaDex: false, sleep: (ms) => slept.push(ms) });
    assert.deepEqual(results, []);
    assert.equal(calls, 2);
    assert.deepEqual(slept, [2000]);
  });

  it('mapea los resultados de MangaDex (fetch fake)', async () => {
    const fetchImpl = async (url) => {
      assert.ok(String(url).startsWith(`${MANGA_URL}?`));
      assert.ok(String(url).includes('includes%5B%5D=cover_art'));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'abc-uuid',
              attributes: {
                title: { en: 'Some Manga', 'ja-ro': 'Sonota' },
                altTitles: [{ ja: 'ソノタ' }],
                contentRating: 'erotica',
                year: 2020,
                lastVolume: '5',
              },
              relationships: [{ type: 'cover_art', attributes: { fileName: 'cover.png' } }],
            },
          ],
        }),
      };
    };
    const results = await searchMangaDexOnce('Some Manga', { fetchImpl, includeAdult: true });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Some Manga');
    assert.equal(results[0].coverUrl, 'https://uploads.mangadex.org/covers/abc-uuid/cover.png');
    assert.equal(results[0].isAdult, true);
    assert.equal(results[0].source, 'mangadex');
    assert.equal(results[0].provider, 'mangadex');
    assert.equal(results[0].volumes, 5);
    assert.ok(results[0].altTitles.includes('ソノタ'));
  });

  it('no pide contenido adulto a MangaDex si la preferencia está apagada', async () => {
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(String(url));
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    };
    await searchMangaDexOnce('x', { fetchImpl, includeAdult: false });
    assert.ok(!seen[0].includes('erotica'));
    assert.ok(!seen[0].includes('pornographic'));
    assert.ok(seen[0].includes('safe'));
  });

  it('cae a MangaDex solo si AniList no devuelve candidatos', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url === ANILIST_URL) {
        return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'md-1',
              attributes: { title: { en: 'Fallback Title' }, contentRating: 'safe' },
              relationships: [{ type: 'cover_art', attributes: { fileName: 'c.png' } }],
            },
          ],
        }),
      };
    };
    const results = await searchManga('Fallback Title', { fetchImpl });
    assert.equal(calls.length, 2);
    assert.equal(results[0].source, 'mangadex');
  });

  it('no consulta MangaDex si AniList devuelve resultados', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              media: [
                { id: 1, title: { romaji: 'Hit' }, coverImage: { large: 'https://img/hit.jpg' } },
              ],
            },
          },
        }),
      };
    };
    const results = await searchManga('Hit', { fetchImpl });
    assert.equal(calls.length, 1);
    assert.equal(results[0].source, 'anilist');
  });

  it('si MangaDex falla en el fallback, devuelve vacío', async () => {
    const fetchImpl = async (url) => {
      if (url === ANILIST_URL) {
        return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
      }
      throw new Error('red caída');
    };
    assert.deepEqual(await searchManga('x', { fetchImpl }), []);
  });
});

describe('services/covers: fetchCover', () => {
  it('acepta imágenes y deduce la extensión', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    const result = await fetchCover('https://img/x.jpg', { fetchImpl });
    assert.equal(result.ext, 'jpg');
    assert.equal(result.buffer.length, 3);
  });

  it('rechaza respuestas que no son imagen', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await assert.rejects(() => fetchCover('https://img/x', { fetchImpl }), /not an image/);
  });

  it('rechaza URLs que no son https', async () => {
    const boom = () => {
      throw new Error('no debería llamar a fetch');
    };
    await assert.rejects(() => fetchCover('file:///etc/passwd', { fetchImpl: boom }), /no permitida/);
    await assert.rejects(() => fetchCover('http://img/x.jpg', { fetchImpl: boom }), /no permitida/);
  });
});

describe('services/covers: extensionForContentType / coverFileName', () => {
  it('mapea content-types conocidos', () => {
    assert.equal(extensionForContentType('image/png'), 'png');
    assert.equal(extensionForContentType('image/webp'), 'webp');
    assert.equal(extensionForContentType('application/json'), null);
  });

  it('rechaza ids y extensiones inválidas', () => {
    assert.equal(coverFileName(12, 'jpg'), '12.jpg');
    assert.throws(() => coverFileName('../../etc/passwd', 'jpg'));
    assert.throws(() => coverFileName(12, 'exe'));
  });
});

describe('services/covers: saveCoverFile / removeCoverFile', () => {
  it('escribe y borra la portada en el directorio de cache', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mc-covers-'));
    try {
      const name = await saveCoverFile(dir, 7, Buffer.from('img'), 'png');
      assert.equal(name, '7.png');
      const written = await readFile(path.join(dir, '7.png'));
      assert.equal(written.toString(), 'img');
      assert.equal(await removeCoverFile(dir, name), true);
      assert.equal(await removeCoverFile(dir, name), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('services/covers: ramas de normalización y búsqueda', () => {
  it('normalizeTitle tolera null/undefined', () => {
    assert.equal(normalizeTitle(null), '');
    assert.equal(normalizeTitle(undefined), '');
  });

  it('pickAutoMatch devuelve null con entradas inválidas y usa altTitles', () => {
    assert.equal(pickAutoMatch('', [{ id: 1, title: 'x' }]), null);
    assert.equal(pickAutoMatch('x', null), null);
    assert.equal(pickAutoMatch('Berserk', [{ id: 7, title: 'Otro', altTitles: ['Berserk'] }]).id, 7);
    // candidato sin altTitles definido: no rompe.
    assert.equal(pickAutoMatch('Berserk', [{ id: 8, title: 'Berserk' }]).id, 8);
  });

  it('searchMangaOnce usa fallbacks de título/puerto y tolera data ausente', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          Page: {
            media: [
              { id: 1, title: {}, coverImage: { medium: 'https://i/medium.png' } },
              { id: 2, title: { english: 'Inglés' }, coverImage: {} },
              { id: 3, title: { native: 'ネイティブ' } },
            ],
          },
        },
      }),
    });
    const out = await searchMangaOnce(undefined, { fetchImpl });
    assert.equal(out[0].title, '');
    assert.equal(out[0].coverUrl, 'https://i/medium.png');
    assert.equal(out[0].format, null);
    assert.equal(out[0].volumes, null);
    assert.equal(out[0].year, null);
    assert.equal(out[1].title, 'Inglés');
    assert.equal(out[1].coverUrl, null);
    assert.equal(out[2].title, 'ネイティブ');

    const empty = await searchMangaOnce('x', {
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }),
    });
    assert.deepEqual(empty, []);
  });

  it('searchManga reintenta con el sleep por defecto (Retry-After 0)', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 429, headers: { get: () => '0' } };
      return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
    };
    assert.deepEqual(await searchManga('x', { fetchImpl, fallbackToMangaDex: false }), []);
    assert.equal(calls, 2);
  });

  it('searchMangaOnce dispara el abort por timeout', async () => {
    const fetchImpl = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
    };
    assert.deepEqual(await searchMangaOnce('x', { fetchImpl, timeoutMs: 1 }), []);
  });

  it('searchMangaOnce lanza con status no-ok (no 429)', async () => {
    await assert.rejects(
      () =>
        searchMangaOnce('x', {
          fetchImpl: async () => ({ ok: false, status: 500, headers: { get: () => null } }),
        }),
      /AniList 500/
    );
  });

  it('rateLimitError sin Retry-After usa el default y capa los valores altos', async () => {
    const noHeaders = async () => ({ ok: false, status: 429 });
    await assert.rejects(
      () => searchManga('x', { fetchImpl: noHeaders, retries: 0 }),
      (err) => err.code === 'RATE_LIMIT' && err.retryAfterMs === 30000
    );
    const nonNumeric = async () => ({ ok: false, status: 429, headers: { get: () => 'abc' } });
    await assert.rejects(
      () => searchManga('x', { fetchImpl: nonNumeric, retries: 0 }),
      (err) => err.retryAfterMs === 30000
    );
    const huge = async () => ({ ok: false, status: 429, headers: { get: () => '9999' } });
    await assert.rejects(
      () => searchManga('x', { fetchImpl: huge, retries: 0 }),
      (err) => err.retryAfterMs === 120000
    );
  });

  it('extensionForContentType tolera null, gif/jpg y desconocidos', () => {
    assert.equal(extensionForContentType(null), null);
    assert.equal(extensionForContentType(undefined), null);
    assert.equal(extensionForContentType('IMAGE/GIF'), 'gif');
    assert.equal(extensionForContentType('image/jpg'), 'jpg');
    assert.equal(extensionForContentType('application/octet-stream'), null);
  });

  it('isAllowedCoverUrl rechaza URLs inválidas y esquemas no https', () => {
    assert.equal(isAllowedCoverUrl('no-es-una-url'), false);
    assert.equal(isAllowedCoverUrl('http://img/x.png'), false);
    assert.equal(isAllowedCoverUrl('https://img/x.png'), true);
  });

  it('fetchCover rechaza status no-ok, vacío y demasiado grande', async () => {
    await assert.rejects(
      () => fetchCover('https://x/y.png', { fetchImpl: async () => ({ ok: false, status: 404 }) }),
      /cover 404/
    );
    await assert.rejects(
      () =>
        fetchCover('https://x/y.png', {
          fetchImpl: async () => ({
            ok: true,
            status: 200,
            headers: { get: () => 'image/png' },
            arrayBuffer: async () => new ArrayBuffer(0),
          }),
        }),
      /empty image/
    );
    await assert.rejects(
      () =>
        fetchCover('https://x/y.png', {
          fetchImpl: async () => imageResponse('image/png', new Array(10).fill(1)),
          maxBytes: 5,
        }),
      /too large/
    );
    // Sin headers: content-type vacío -> no es imagen.
    await assert.rejects(
      () =>
        fetchCover('https://x/y.png', {
          fetchImpl: async () => ({
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1]).buffer,
          }),
        }),
      /not an image/
    );
  });

  it('fetchCover dispara el abort por timeout', async () => {
    const fetchImpl = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return imageResponse('image/png');
    };
    const res = await fetchCover('https://x/y.png', { fetchImpl, timeoutMs: 1 });
    assert.equal(res.ext, 'png');
  });
});

describe('services/covers: linkCover / refreshCover / unlink / status / coverMap', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-covers-link-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('linkCover valida mangaId, candidato y portada', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await assert.rejects(
      () => linkCover(db, dir, { mangaId: 'abc', candidate: { id: 1, coverUrl: 'https://x/y.png' } }),
      /mangaId inválido/
    );
    await assert.rejects(() => linkCover(db, dir, { mangaId: manga.id }), /candidato inválido/);
    await assert.rejects(
      () => linkCover(db, dir, { mangaId: manga.id, candidate: { id: 1 } }),
      /no tiene portada/
    );
  });

  it('linkCover guarda, reemplaza la portada previa y alimenta coverMap/status', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    const first = await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 10, coverUrl: 'https://x/a.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(first.coverUrl, `mangacount://covers/${manga.id}.png`);

    // Mismo ext -> mismo nombre: no borra nada (rama false de la comparación).
    const same = await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 11, coverUrl: 'https://x/b.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(same.coverUrl, first.coverUrl);

    // Otro ext -> reemplaza y borra el archivo previo.
    const second = await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 12, coverUrl: 'https://x/c.webp' },
      fetchImpl: async () => imageResponse('image/webp'),
    });
    assert.match(second.coverUrl, /\.webp$/);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.webp`)), true);

    assert.equal(coverMap(db)[manga.id].url, second.coverUrl);
    assert.equal(coverMap(db)[manga.id].isAdult, false);
    assert.equal(statusCover(db, manga.id).externalId, '12');
  });

  it('linkCover promueve Manga.IsAdult con candidato +18 y nunca lo apaga', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 1, coverUrl: 'https://x/a.png', isAdult: true },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(getMangaById(db, manga.id).isAdult, true);
    assert.equal(coverMap(db)[manga.id].isAdult, true);

    // Vincular un candidato no adulto (otro ext) no apaga el flag.
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 2, coverUrl: 'https://x/b.jpg', isAdult: false },
      fetchImpl: async () => imageResponse('image/jpeg'),
    });
    assert.equal(getMangaById(db, manga.id).isAdult, true);
    assert.equal(coverMap(db)[manga.id].isAdult, true);
  });

  it('guarda la procedencia MangaDex del candidato', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    const out = await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: {
        id: 'uuid-1',
        provider: 'mangadex',
        coverUrl: 'https://uploads.mangadex.org/covers/uuid-1/c.jpg',
      },
      fetchImpl: async () => imageResponse('image/jpeg'),
    });
    assert.equal(out.ref.provider, 'mangadex');
    assert.equal(statusCover(db, manga.id).externalId, 'uuid-1');
    assert.equal(coverMap(db)[manga.id].url, out.coverUrl);
  });

  it('coverMap toma isAdult de la entidad manga (no del vínculo)', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 1, coverUrl: 'https://x/a.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(coverMap(db)[manga.id].isAdult, false);

    setMangaIsAdult(db, manga.id, true);
    assert.equal(coverMap(db)[manga.id].isAdult, true);
  });

  it('refreshCover valida mangaId, vínculo y url; luego actualiza', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await assert.rejects(
      () => refreshCover(db, dir, { mangaId: 0, coverUrl: 'https://x/y.png' }),
      /mangaId inválido/
    );
    await assert.rejects(
      () => refreshCover(db, dir, { mangaId: manga.id, coverUrl: 'https://x/y.png' }),
      /sin vínculo/
    );
    upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId: 1 });
    await assert.rejects(
      () => refreshCover(db, dir, { mangaId: manga.id }),
      /coverUrl requerido/
    );

    const refreshed = await refreshCover(db, dir, {
      mangaId: manga.id,
      coverUrl: 'https://x/y.jpg',
      fetchImpl: async () => imageResponse('image/jpeg'),
    });
    assert.equal(refreshed.coverUrl, `mangacount://covers/${manga.id}.jpg`);
  });

  it('unlinkCover y statusCover sin vínculo, y unlink sin archivo', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    assert.deepEqual(await unlinkCover(db, dir, manga.id), { ok: false });
    assert.equal(statusCover(db, manga.id), null);
    await assert.rejects(() => unlinkCover(db, dir, 'abc'), /mangaId inválido/);
    assert.throws(() => statusCover(db, 'abc'), /mangaId inválido/);

    // Vínculo sin archivo: no intenta borrar nada y status devuelve coverUrl null.
    upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId: 2 });
    assert.equal(statusCover(db, manga.id).coverUrl, null);
    assert.deepEqual(await unlinkCover(db, dir, manga.id), { ok: true });

    // Vínculo con archivo: lo borra del disco.
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 3, coverUrl: 'https://x/y.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), true);
    assert.deepEqual(await unlinkCover(db, dir, manga.id), { ok: true });
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
  });

  it('autoMatchCover devuelve null sin match o sin portada', async () => {
    const manga = createManga(db, { name: 'Zzz', volumes: 1 });
    // Sin manga (id inexistente): ni consulta la red.
    assert.equal(
      await autoMatchCover(db, dir, 999, {
        fetchImpl: async () => {
          throw new Error('no debería consultar');
        },
      }),
      null
    );
    const other = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { Page: { media: [{ id: 1, title: { romaji: 'Otro' } }] } } }),
    });
    assert.equal(await autoMatchCover(db, dir, manga.id, { fetchImpl: other }), null);
    const noCover = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { Page: { media: [{ id: 2, title: { romaji: 'Zzz' } }] } } }),
    });
    assert.equal(await autoMatchCover(db, dir, manga.id, { fetchImpl: noCover }), null);
  });
});

describe('services/covers: removeCoverFile sin archivo', () => {
  it('devuelve false si no hay nombre', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mc-covers-rm-'));
    try {
      assert.equal(await removeCoverFile(dir, null), false);
      assert.equal(await removeCoverFile(dir, ''), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('services/covers: autoMatchCover', () => {
  it('cae a MangaDex cuando AniList no tiene match y vincula con esa procedencia', async () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-automd-'));
    const db = openDb(dir);
    try {
      const manga = createManga(db, { name: 'Solo MD', volumes: 3 });
      const fetchImpl = async (url, opts = {}) => {
        if (opts.method === 'POST') {
          return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [] } } }) };
        }
        if (String(url).startsWith(`${MANGA_URL}?`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: 'md-uuid',
                  attributes: { title: { en: 'Solo MD' }, contentRating: 'safe' },
                  relationships: [{ type: 'cover_art', attributes: { fileName: 'c.jpg' } }],
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'image/jpeg' },
          arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
        };
      };

      const url = await autoMatchCover(db, dir, manga.id, { fetchImpl });
      assert.equal(url, `mangacount://covers/${manga.id}.jpg`);
      assert.equal(statusCover(db, manga.id).provider, 'mangadex');
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('vincula con match único y no re-busca si ya está vinculado', async () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-autocover-'));
    const db = openDb(dir);
    try {
      const manga = createManga(db, { name: 'Berserk', volumes: 41 });
      const fetchImpl = async (_url, opts = {}) => {
        if (opts.method === 'POST') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                Page: {
                  media: [
                    {
                      id: 30013,
                      title: { romaji: 'Berserk' },
                      coverImage: { large: 'https://img/b.png' },
                      format: 'MANGA',
                      volumes: 41,
                      startDate: { year: 1989 },
                    },
                  ],
                },
              },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'image/png' },
          arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
        };
      };

      const url = await autoMatchCover(db, dir, manga.id, { fetchImpl });
      assert.equal(url, `mangacount://covers/${manga.id}.png`);

      // Ya vinculado: no vuelve a consultar la red.
      const again = await autoMatchCover(db, dir, manga.id, {
        fetchImpl: () => {
          throw new Error('no debería consultar la red');
        },
      });
      assert.equal(again, url);
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('services/covers: filtro +18 en la búsqueda', () => {
  const captureQuery = () => {
    let sent = null;
    const fetchImpl = async (_url, opts) => {
      sent = JSON.parse(opts.body).query;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              media: [
                { id: 1, title: { romaji: 'X' }, coverImage: { large: 'u' }, isAdult: true },
                { id: 2, title: { romaji: 'Y' }, coverImage: { large: 'v' } },
              ],
            },
          },
        }),
      };
    };
    return { fetchImpl, query: () => sent };
  };

  it('por defecto filtra +18 (isAdult: false) y mapea isAdult', async () => {
    const { fetchImpl, query } = captureQuery();
    const results = await searchManga('x', { fetchImpl });
    assert.match(query(), /isAdult:\s*false/);
    assert.equal(results[0].isAdult, true);
    assert.equal(results[1].isAdult, false); // ausente => false
  });

  it('includeAdult: true consulta sin el filtro', async () => {
    const { fetchImpl, query } = captureQuery();
    await searchManga('x', { fetchImpl, includeAdult: true });
    assert.doesNotMatch(query(), /isAdult:\s*false/);
  });
});

// --- Portadas locales ---

const PREFIXES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpg: [0xff, 0xd8, 0xff],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};
const imageBuffer = (kind, extra = '') =>
  Buffer.concat([Buffer.from(PREFIXES[kind]), Buffer.from(extra)]);

describe('services/covers: sniffImageExt (magic bytes)', () => {
  it('detecta PNG/JPEG/GIF/WEBP por contenido', () => {
    assert.equal(sniffImageExt(imageBuffer('png')), 'png');
    assert.equal(sniffImageExt(imageBuffer('jpg')), 'jpg');
    assert.equal(sniffImageExt(imageBuffer('gif')), 'gif');
    assert.equal(sniffImageExt(imageBuffer('webp')), 'webp');
  });

  it('gana el contenido (aun con otra extensión declarada)', () => {
    assert.equal(sniffImageExt(imageBuffer('png', 'resto')), 'png');
    assert.equal(sniffImageExt(imageBuffer('webp', 'resto')), 'webp');
  });

  it('rechaza SVG, texto, binario, buffers cortos y null', () => {
    assert.equal(sniffImageExt(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
    assert.equal(sniffImageExt(Buffer.from('esto no es una imagen')), null);
    assert.equal(sniffImageExt(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
    assert.equal(sniffImageExt(Buffer.from([0x89, 0x50])), null); // PNG truncado
    assert.equal(sniffImageExt(Buffer.from('RIFF')), null); // RIFF sin 'WEBP'
    assert.equal(sniffImageExt(Buffer.from('RIFF0000XXXX')), null); // RIFF con tag ajeno
    assert.equal(sniffImageExt(null), null);
    assert.equal(sniffImageExt(undefined), null);
  });

  it('acepta Uint8Array (no solo Buffer)', () => {
    assert.equal(sniffImageExt(new Uint8Array(PREFIXES.png)), 'png');
  });
});

describe('services/covers: linkLocalCover', () => {
  let dir;
  let db;

  const writeSource = (name, buffer) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, buffer);
    return p;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-covers-local-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('valida mangaId y sourcePath', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: 'abc', sourcePath: 'x' }),
      /mangaId inválido/
    );
    await assert.rejects(() => linkLocalCover(db, dir, { mangaId: manga.id }), /sourcePath inválido/);
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: 123 }),
      /sourcePath inválido/
    );
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: '   ' }),
      /sourcePath inválido/
    );
  });

  it('rechaza inexistente, directorio y archivo demasiado grande (sin escribir)', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await assert.rejects(() =>
      linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: path.join(dir, 'nope.png') })
    );
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: dir }),
      /no es un archivo/
    );

    const big = writeSource('big.png', Buffer.alloc(MAX_COVER_BYTES + 1));
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: big }),
      /demasiado grande/
    );
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
  });

  it('rechaza contenido no soportado sin escribir', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    const svg = writeSource('a.svg', Buffer.from('<svg></svg>'));
    await assert.rejects(
      () => linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: svg }),
      /formato no soportado/
    );
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.svg`)), false);
  });

  it('vincula la imagen local y reemplaza la anterior al re-vincular', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    const png = writeSource('uno.png', imageBuffer('png', 'datos'));
    const res = await linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: png });
    assert.equal(res.ref.provider, 'local');
    assert.equal(res.ref.externalId, '');
    assert.equal(res.coverUrl, `mangacount://covers/${manga.id}.png`);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), true);

    // Otra extensión -> reemplaza y borra la imagen anterior.
    const jpg = writeSource('dos.jpg', imageBuffer('jpg', 'datos'));
    const again = await linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: jpg });
    assert.match(again.coverUrl, /\.jpg$/);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.jpg`)), true);
  });

  it('re-vincular con la misma extensión no borra el archivo', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('a.png', imageBuffer('png', 'a')),
    });
    const res = await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('b.png', imageBuffer('png', 'bb')),
    });
    assert.equal(res.coverUrl, `mangacount://covers/${manga.id}.png`);
    assert.ok(
      fs.readFileSync(path.join(dir, 'covers', `${manga.id}.png`)).toString().endsWith('bb')
    );
  });
});

describe('services/covers: un solo cover activo (procedencia)', () => {
  let dir;
  let db;

  const writeSource = (name, buffer) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, buffer);
    return p;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-covers-active-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('linkLocalCover borra el vínculo y el archivo de AniList', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 10, coverUrl: 'https://x/a.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(getRef(db, manga.id, 'anilist')?.coverFile, `${manga.id}.png`);

    await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('l.webp', imageBuffer('webp')),
    });

    assert.equal(getRef(db, manga.id, 'anilist'), null);
    assert.equal(listRefsByManga(db, manga.id).length, 1);
    assert.equal(statusCover(db, manga.id).provider, 'local');
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.webp`)), true);
  });

  it('linkCover borra el vínculo y el archivo local', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('l.png', imageBuffer('png')),
    });
    assert.equal(getRef(db, manga.id, 'local')?.coverFile, `${manga.id}.png`);

    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 20, coverUrl: 'https://x/b.webp' },
      fetchImpl: async () => imageResponse('image/webp'),
    });
    assert.equal(getRef(db, manga.id, 'local'), null);
    assert.equal(listRefsByManga(db, manga.id).length, 1);
    assert.equal(getRef(db, manga.id, 'anilist')?.coverFile, `${manga.id}.webp`);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
  });

  it('borra refs ajenos sin archivo al vincular local', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    upsertRef(db, { mangaId: manga.id, provider: 'anilist', externalId: 1 });
    await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('l.png', imageBuffer('png')),
    });
    assert.equal(getRef(db, manga.id, 'anilist'), null);
    assert.equal(listRefsByManga(db, manga.id).length, 1);
  });

  it('statusCover, unlinkCover y coverMap son provider-agnósticos', async () => {
    const manga = createManga(db, { name: 'x', volumes: 1 });
    const linked = await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('l.gif', imageBuffer('gif')),
    });

    const status = statusCover(db, manga.id);
    assert.equal(status.provider, 'local');
    assert.equal(status.externalId, '');
    assert.equal(status.coverUrl, linked.coverUrl);
    assert.equal(coverMap(db)[manga.id].url, linked.coverUrl);
    assert.equal(coverMap(db)[manga.id].isAdult, false); // local: nunca adulto

    assert.deepEqual(await unlinkCover(db, dir, manga.id), { ok: true });
    assert.equal(statusCover(db, manga.id), null);
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.gif`)), false);
  });

  it('autoMatchCover no pisa una portada local', async () => {
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    const linked = await linkLocalCover(db, dir, {
      mangaId: manga.id,
      sourcePath: writeSource('l.png', imageBuffer('png')),
    });

    const out = await autoMatchCover(db, dir, manga.id, {
      fetchImpl: () => {
        throw new Error('no debería consultar la red');
      },
    });
    assert.equal(out, linked.coverUrl);
    assert.equal(statusCover(db, manga.id).provider, 'local');
  });
});

describe('services/covers: indicador +18 persistido', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(tmpdir(), 'mc-covers-adult-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('linkCover persiste isAdult del candidato (true y false)', async () => {
    const adult = createManga(db, { name: 'Adult', volumes: 1 });
    const safe = createManga(db, { name: 'Safe', volumes: 1 });

    await linkCover(db, dir, {
      mangaId: adult.id,
      candidate: { id: 1, coverUrl: 'https://x/a.png', isAdult: true },
      fetchImpl: async () => imageResponse('image/png'),
    });
    await linkCover(db, dir, {
      mangaId: safe.id,
      candidate: { id: 2, coverUrl: 'https://x/b.png', isAdult: false },
      fetchImpl: async () => imageResponse('image/png'),
    });

    assert.equal(getRef(db, adult.id, 'anilist').isAdult, true);
    assert.equal(getRef(db, safe.id, 'anilist').isAdult, false);

    const map = coverMap(db);
    assert.deepEqual(map[adult.id], { url: `mangacount://covers/${adult.id}.png`, isAdult: true });
    assert.deepEqual(map[safe.id], { url: `mangacount://covers/${safe.id}.png`, isAdult: false });
  });

  it('linkCover sin isAdult (undefined) lo guarda como falso', async () => {
    const manga = createManga(db, { name: 'NoFlag', volumes: 1 });
    await linkCover(db, dir, {
      mangaId: manga.id,
      candidate: { id: 3, coverUrl: 'https://x/c.png' },
      fetchImpl: async () => imageResponse('image/png'),
    });
    assert.equal(getRef(db, manga.id, 'anilist').isAdult, false);
    assert.equal(coverMap(db)[manga.id].isAdult, false);
  });

  it('linkLocalCover guarda isAdult en false', async () => {
    const manga = createManga(db, { name: 'Local', volumes: 1 });
    const src = path.join(dir, 'l.png');
    fs.writeFileSync(src, imageBuffer('png'));
    await linkLocalCover(db, dir, { mangaId: manga.id, sourcePath: src });

    assert.equal(getRef(db, manga.id, 'local').isAdult, false);
    assert.equal(coverMap(db)[manga.id].isAdult, false);
  });
});
