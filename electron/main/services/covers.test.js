import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createManga } from '../db/repositories/mangas.js';
import {
  ANILIST_URL,
  normalizeTitle,
  pickAutoMatch,
  searchManga,
  fetchCover,
  extensionForContentType,
  coverFileName,
  saveCoverFile,
  removeCoverFile,
  autoMatchCover,
} from './covers.js';

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
    const results = await searchManga('x', { fetchImpl, sleep: (ms) => slept.push(ms) });
    assert.deepEqual(results, []);
    assert.equal(calls, 2);
    assert.deepEqual(slept, [2000]);
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

describe('services/covers: autoMatchCover', () => {
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
