// Covers via AniList + disk cache.
//
// AniList GraphQL is anonymous (no API key) but rate limited (30 req/min).
// Isolated from the runtime so it can be tested with an injected `fetch`.
// The link stores only the ExternalId + file name; the local manga name is
// NOT touched.

import { mkdir, writeFile, rm, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getRef,
  upsertRef,
  setCoverFile,
  removeRef,
  listRefs,
  listRefsByManga,
} from '../db/repositories/manga-external-refs.js';
import { getMangaById, setMangaIsAdult } from '../db/repositories/mangas.js';

export const ANILIST_URL = 'https://graphql.anilist.co';
export const PROVIDER = 'anilist';
export const LOCAL_PROVIDER = 'local';
export const MANGA_PROVIDER = 'mangadex';
export const MANGA_URL = 'https://api.mangadex.org/manga';
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

// Single size cap. Applied twice in the local flow: on the `stat` and on the
// real buffer length, to not trust the previous stat (TOCTOU).
export function assertCoverSize(bytes) {
  if (bytes > MAX_COVER_BYTES) throw new Error('imagen demasiado grande');
}

// Common fields. `isAdult` travels so +18 candidates can be flagged in the UI.
const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large medium }
  format
  volumes
  startDate { year }
  isAdult
`;

// Two query variants: with `isAdult: false` (hides +18; default) and without the
// argument (returns everything). Avoids depending on the semantics of `isAdult: null`.
const SEARCH_QUERY_SAFE = `query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FIELDS} }
  }
}`;
const SEARCH_QUERY_ALL = `query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
  }
}`;

export function normalizeTitle(title) {
  return String(title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Auto-match: only links if there is a single candidate whose title (or alt) is identical
// to the normalized local title. If ambiguous or no match, returns null.
export function pickAutoMatch(title, candidates) {
  const target = normalizeTitle(title);
  if (!target || !Array.isArray(candidates)) return null;
  const exact = candidates.filter((candidate) =>
    [candidate.title, ...(candidate.altTitles ?? [])].some((t) => normalizeTitle(t) === target)
  );
  return exact.length === 1 ? exact[0] : null;
}

function rateLimitError(res) {
  const parsed = Number.parseInt(res.headers?.get?.('Retry-After') ?? '', 10);
  const error = new Error('AniList rate limit');
  error.code = 'RATE_LIMIT';
  error.retryAfterMs = Number.isNaN(parsed) ? 30000 : Math.min(parsed * 1000, 120000);
  return error;
}

export async function searchMangaOnce(query, { fetchImpl = fetch, timeoutMs = 8000, includeAdult = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'MangaCount',
      },
      body: JSON.stringify({
        query: includeAdult ? SEARCH_QUERY_ALL : SEARCH_QUERY_SAFE,
        variables: { search: String(query ?? '') },
      }),
      signal: controller.signal,
    });
    if (res.status === 429) throw rateLimitError(res);
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const data = await res.json();
    const media = data?.data?.Page?.media ?? [];
    return media.map((m) => ({
      id: m.id,
      title: m.title?.romaji || m.title?.english || m.title?.native || '',
      altTitles: [m.title?.english, m.title?.native].filter(Boolean),
      coverUrl: m.coverImage?.large || m.coverImage?.medium || null,
      format: m.format ?? null,
      volumes: m.volumes ?? null,
      year: m.startDate?.year ?? null,
      isAdult: m.isAdult === true,
      source: PROVIDER,
      provider: PROVIDER,
    }));
  } finally {
    clearTimeout(timer);
  }
}

// Search on MangaDex (public REST, no key). Used as a **fallback** for
// AniList. Adult content comes from `contentRating`.
const MD_RATINGS_SAFE = ['safe', 'suggestive'];
const MD_RATINGS_ALL = ['safe', 'suggestive', 'erotica', 'pornographic'];

export async function searchMangaDexOnce(
  query,
  { fetchImpl = fetch, timeoutMs = 8000, includeAdult = false, limit = 10 } = {}
) {
  const params = new URLSearchParams();
  params.set('title', String(query ?? ''));
  params.set('limit', String(limit));
  params.append('includes[]', 'cover_art');
  for (const rating of includeAdult ? MD_RATINGS_ALL : MD_RATINGS_SAFE) {
    params.append('contentRating[]', rating);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${MANGA_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'MangaCount' },
      signal: controller.signal,
    });
    if (res.status === 429) throw rateLimitError(res);
    if (!res.ok) throw new Error(`MangaDex ${res.status}`);
    const data = await res.json();
    return (data?.data ?? []).map((m) => {
      const attrs = m.attributes ?? {};
      const titles = attrs.title ?? {};
      const altTitles = [titles.en, titles['ja-ro'], titles.ja].filter(Boolean);
      for (const alt of attrs.altTitles ?? []) {
        const value = Object.values(alt ?? {})[0];
        if (value && !altTitles.includes(value)) altTitles.push(value);
      }
      const coverRel = (m.relationships ?? []).find((r) => r.type === 'cover_art');
      const fileName = coverRel?.attributes?.fileName ?? null;
      const rating = attrs.contentRating;
      return {
        id: m.id,
        title: titles.en || titles['ja-ro'] || titles.ja || Object.values(titles)[0] || '',
        altTitles,
        coverUrl: fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}` : null,
        format: null,
        volumes: attrs.lastVolume ? Number.parseInt(attrs.lastVolume, 10) || null : null,
        year: attrs.year ?? null,
        isAdult: rating === 'erotica' || rating === 'pornographic',
        source: MANGA_PROVIDER,
        provider: MANGA_PROVIDER,
      };
    });
  } finally {
    clearTimeout(timer);
  }
}

// Searches retrying once on 429 (honors Retry-After). The wait is
// injectable to test it without real delays. If AniList returns nothing,
// falls back to MangaDex (best-effort: if the fallback fails, returns empty).
export async function searchManga(
  query,
  {
    fetchImpl = fetch,
    timeoutMs = 8000,
    retries = 1,
    includeAdult = false,
    fallbackToMangaDex = true,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}
) {
  let attempt = 0;
  let anilist;
  for (;;) {
    try {
      anilist = await searchMangaOnce(query, { fetchImpl, timeoutMs, includeAdult });
      break;
    } catch (err) {
      if (err?.code === 'RATE_LIMIT' && attempt < retries) {
        attempt += 1;
        await sleep(err.retryAfterMs);
        continue;
      }
      throw err;
    }
  }
  if (anilist.length > 0 || !fallbackToMangaDex) return anilist;
  try {
    return await searchMangaDexOnce(query, { fetchImpl, timeoutMs, includeAdult });
  } catch {
    return [];
  }
}

export function extensionForContentType(contentType) {
  const ct = String(contentType ?? '').toLowerCase();
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  return null;
}

// Signature of each supported format. The extension is decided by the CONTENT
// (magic bytes), never by the file's declared extension.
const MAGIC_SIGNATURES = [
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // 'GIF8'
];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // 'RIFF'
const WEBP_TAG = Buffer.from([0x57, 0x45, 0x42, 0x50]); // 'WEBP'

function startsWith(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);
}

// Detects PNG/JPEG/GIF/WEBP by magic bytes. Returns the real extension
// (`png`/`jpg`/`gif`/`webp`) or `null` for any other content (SVG, text,
// binary), which must be rejected.
export function sniffImageExt(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? []);
  for (const sig of MAGIC_SIGNATURES) {
    if (startsWith(bytes, sig.bytes)) return sig.ext;
  }
  // WEBP: 'RIFF' + size (4 bytes) + 'WEBP'.
  if (startsWith(bytes, WEBP_RIFF) && bytes.length >= 12 && bytes.subarray(8, 12).equals(WEBP_TAG)) {
    return 'webp';
  }
  return null;
}

// https only: prevents the renderer from making the main process read file:///etc/... or other
// schemes (the candidate URL is provided by the renderer).
export function isAllowedCoverUrl(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Downloads and validates it is a real image (content-type + size). Rejects
// anything else (error HTML, etc.).
export async function fetchCover(url, { fetchImpl = fetch, timeoutMs = 12000, maxBytes = MAX_COVER_BYTES } = {}) {
  if (!isAllowedCoverUrl(url)) throw new Error('cover url no permitida');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': 'MangaCount', Accept: 'image/*' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`cover ${res.status}`);
    const contentType = res.headers?.get?.('content-type') ?? '';
    const ext = extensionForContentType(contentType);
    if (!ext) throw new Error(`not an image: ${contentType || 'unknown'}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) throw new Error('empty image');
    if (buffer.length > maxBytes) throw new Error('image too large');
    return { buffer, contentType, ext };
  } finally {
    clearTimeout(timer);
  }
}

export function coverFileName(mangaId, ext) {
  const id = Number.parseInt(mangaId, 10);
  if (!Number.isInteger(id) || id <= 0) throw new Error('invalid mangaId');
  if (!/^(jpg|png|webp|gif)$/.test(ext)) throw new Error('invalid cover extension');
  return `${id}.${ext}`;
}

// Writes `<userData>/covers/<mangaId>.<ext>` (generated name: no path traversal).
export async function saveCoverFile(coversDir, mangaId, buffer, ext) {
  const name = coverFileName(mangaId, ext);
  await mkdir(coversDir, { recursive: true });
  await writeFile(path.join(coversDir, path.basename(name)), buffer);
  return name;
}

export async function removeCoverFile(coversDir, coverFile) {
  if (!coverFile) return false;
  const name = path.basename(coverFile);
  try {
    await rm(path.join(coversDir, name));
    return true;
  } catch {
    return false;
  }
}

export const coversDir = (dataDir) => path.join(dataDir, 'covers');
export const coverUrl = (fileName) => `mangacount://covers/${fileName}`;

function requireMangaId(mangaId) {
  const id = Number.parseInt(mangaId, 10);
  if (!Number.isInteger(id) || id <= 0) throw new Error('mangaId inválido');
  return id;
}

// The active link of a manga. The "single active cover" invariant guarantees
// a single ref per manga (without pinning provider), so the first one suffices.
function getActiveRef(db, mangaId) {
  return listRefsByManga(db, mangaId)[0] ?? null;
}

// Deletes the manga's refs whose provider ≠ `keepProvider`, along with their
// files. On linking (AniList or local) a single active cover remains.
async function clearOtherRefs(db, dir, mangaId, keepProvider) {
  for (const ref of listRefsByManga(db, mangaId)) {
    if (ref.provider === keepProvider) continue;
    if (ref.coverFile) await removeCoverFile(dir, ref.coverFile);
    removeRef(db, mangaId, ref.provider);
  }
}

// Downloads the candidate's cover, saves it and leaves the link (AniList).
export async function linkCover(db, dataDir, { mangaId, candidate, fetchImpl } = {}) {
  const id = requireMangaId(mangaId);
  if (!candidate?.id) throw new Error('candidato inválido');
  if (!candidate.coverUrl) throw new Error('el candidato no tiene portada');

  const dir = coversDir(dataDir);
  const { buffer, ext } = await fetchCover(candidate.coverUrl, { fetchImpl });
  const provider = candidate.provider ?? PROVIDER;
  const previous = getRef(db, id, provider);
  const fileName = await saveCoverFile(dir, id, buffer, ext);
  const ref = upsertRef(db, {
    mangaId: id,
    provider,
    externalId: candidate.id,
    coverFile: fileName,
    isAdult: candidate.isAdult === true,
  });
  await clearOtherRefs(db, dir, id, provider);
  if (previous?.coverFile && previous.coverFile !== fileName) {
    await removeCoverFile(dir, previous.coverFile);
  }
  // The +18 flag lives in the manga entity: an adult candidate promotes it, but
  // never clears it (clearing it is a manual user action).
  if (candidate.isAdult === true) setMangaIsAdult(db, id, true);
  return { ref, coverUrl: coverUrl(fileName) };
}

// Links a cover from a local user file: validates the size
// (without reading if it exceeds the cap), detects the format by magic bytes, copies it to the
// managed cache (`<mangaId>.<ext>`) and leaves the local link.
export async function linkLocalCover(db, dataDir, { mangaId, sourcePath } = {}) {
  const id = requireMangaId(mangaId);
  if (typeof sourcePath !== 'string' || sourcePath.trim() === '') {
    throw new Error('sourcePath inválido');
  }
  const info = await stat(sourcePath);
  if (!info.isFile()) throw new Error('sourcePath no es un archivo');
  assertCoverSize(info.size);

  const buffer = await readFile(sourcePath);
  assertCoverSize(buffer.length);
  const ext = sniffImageExt(buffer);
  if (!ext) throw new Error('formato no soportado');

  const dir = coversDir(dataDir);
  const previous = getRef(db, id, LOCAL_PROVIDER);
  const fileName = await saveCoverFile(dir, id, buffer, ext);
  const ref = upsertRef(db, {
    mangaId: id,
    provider: LOCAL_PROVIDER,
    externalId: '',
    coverFile: fileName,
    isAdult: false,
  });
  await clearOtherRefs(db, dir, id, LOCAL_PROVIDER);
  if (previous?.coverFile && previous.coverFile !== fileName) {
    await removeCoverFile(dir, previous.coverFile);
  }
  return { ref, coverUrl: coverUrl(fileName) };
}

// Re-downloads/refreshes the cover of an already linked manga. Only applies to
// links with a remote URL (AniList): a local cover is not re-downloaded.
export async function refreshCover(db, dataDir, { mangaId, coverUrl: url, fetchImpl } = {}) {
  const id = requireMangaId(mangaId);
  if (!getRef(db, id, PROVIDER)) throw new Error('sin vínculo para ese manga');
  if (!url) throw new Error('coverUrl requerido');
  const dir = coversDir(dataDir);
  const { buffer, ext } = await fetchCover(url, { fetchImpl });
  const fileName = await saveCoverFile(dir, id, buffer, ext);
  setCoverFile(db, id, PROVIDER, fileName);
  return { ref: getRef(db, id, PROVIDER), coverUrl: coverUrl(fileName) };
}

export async function unlinkCover(db, dataDir, mangaId) {
  const id = requireMangaId(mangaId);
  const ref = getActiveRef(db, id);
  if (!ref) return { ok: false };
  if (ref.coverFile) await removeCoverFile(coversDir(dataDir), ref.coverFile);
  removeRef(db, id, ref.provider);
  return { ok: true };
}

// Current cover status: provider-agnostic (resolves the manga's link
// without pinning a provider) so the UI can show the source (AniList or local).
export function statusCover(db, mangaId) {
  const ref = getActiveRef(db, requireMangaId(mangaId));
  if (!ref) return null;
  return {
    provider: ref.provider,
    externalId: ref.externalId,
    coverUrl: ref.coverFile ? coverUrl(ref.coverFile) : null,
  };
}

// Map { mangaId: { url, isAdult } } to paint the cards without a call per
// manga. Provider-agnostic; the "single ref per manga" invariant gives a single
// entry. The adult-content flag comes from the **manga entity**
// (`Manga.IsAdult`), not from the cover link.
export function coverMap(db) {
  const map = {};
  for (const ref of listRefs(db)) {
    if (ref.coverFile) {
      const manga = getMangaById(db, ref.mangaId);
      map[ref.mangaId] = { url: coverUrl(ref.coverFile), isAdult: manga?.isAdult === true };
    }
  }
  return map;
}

// Best-effort auto-match when adding a manga: searches by the local title and
// links ONLY if there is a single identical candidate (normalized). If ambiguous
// or no match, does nothing. Never overwrites an existing link (any
// source, e.g. a local cover).
export async function autoMatchCover(db, dataDir, mangaId, { fetchImpl, includeAdult = false } = {}) {
  const id = requireMangaId(mangaId);
  const existing = getActiveRef(db, id);
  if (existing?.coverFile) return coverUrl(existing.coverFile);
  const manga = getMangaById(db, id);
  if (!manga?.name) return null;
  const anilist = await searchManga(manga.name, { fetchImpl, includeAdult, fallbackToMangaDex: false });
  let match = pickAutoMatch(manga.name, anilist);
  if (!match) {
    const mangadex = await searchMangaDexOnce(manga.name, { fetchImpl, includeAdult }).catch(() => []);
    match = pickAutoMatch(manga.name, mangadex);
  }
  if (!match?.coverUrl) return null;
  const linked = await linkCover(db, dataDir, { mangaId: id, candidate: match, fetchImpl });
  return linked.coverUrl;
}
