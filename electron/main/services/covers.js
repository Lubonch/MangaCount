// Portadas vía AniList + cache en disco.
//
// AniList GraphQL es anónimo (sin API key) pero tiene rate limit (30 req/min).
// Aislado del runtime para poder testearlo con un `fetch` inyectado.
// El vínculo guarda solo el ExternalId + nombre de archivo; el nombre local del
// manga NO se toca.

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
import { getMangaById } from '../db/repositories/mangas.js';

export const ANILIST_URL = 'https://graphql.anilist.co';
export const PROVIDER = 'anilist';
export const LOCAL_PROVIDER = 'local';
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

// Campos comunes. `isAdult` viaja para poder marcar candidatos +18 en la UI.
const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large medium }
  format
  volumes
  startDate { year }
  isAdult
`;

// Dos variantes de query: con `isAdult: false` (oculta +18; default) y sin el
// argumento (devuelve todo). Evita depender de la semántica de `isAdult: null`.
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

// Auto-match: solo vincula si hay un único candidato con título (o alt) idéntico
// al título local normalizado. Si es ambiguo o no hay match, devuelve null.
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
    }));
  } finally {
    clearTimeout(timer);
  }
}

// Busca reintentando una vez ante 429 (respeta Retry-After). La espera es
// inyectable para testearla sin demoras reales.
export async function searchManga(
  query,
  {
    fetchImpl = fetch,
    timeoutMs = 8000,
    retries = 1,
    includeAdult = false,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}
) {
  let attempt = 0;
  for (;;) {
    try {
      return await searchMangaOnce(query, { fetchImpl, timeoutMs, includeAdult });
    } catch (err) {
      if (err?.code === 'RATE_LIMIT' && attempt < retries) {
        attempt += 1;
        await sleep(err.retryAfterMs);
        continue;
      }
      throw err;
    }
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

// Firma de cada formato soportado. La extensión se decide por el CONTENIDO
// (magic bytes), nunca por la extensión declarada del archivo.
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

// Detecta PNG/JPEG/GIF/WEBP por magic bytes. Devuelve la extensión real
// (`png`/`jpg`/`gif`/`webp`) o `null` para cualquier otro contenido (SVG, texto,
// binario), que debe rechazarse.
export function sniffImageExt(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? []);
  for (const sig of MAGIC_SIGNATURES) {
    if (startsWith(bytes, sig.bytes)) return sig.ext;
  }
  // WEBP: 'RIFF' + tamaño (4 bytes) + 'WEBP'.
  if (startsWith(bytes, WEBP_RIFF) && bytes.length >= 12 && bytes.subarray(8, 12).equals(WEBP_TAG)) {
    return 'webp';
  }
  return null;
}

// Solo https: evita que el renderer haga que el main lea file:///etc/... u otros
// esquemas (la URL del candidato la provee el renderer).
export function isAllowedCoverUrl(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Descarga y valida que sea una imagen real (content-type + tamaño). Rechaza
// cualquier otra cosa (HTML de error, etc.).
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

// Escribe `<userData>/covers/<mangaId>.<ext>` (nombre generado: sin path traversal).
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

// --- Orquestación (vínculo + cache) ---

export const coversDir = (dataDir) => path.join(dataDir, 'covers');
export const coverUrl = (fileName) => `mangacount://covers/${fileName}`;

function requireMangaId(mangaId) {
  const id = Number.parseInt(mangaId, 10);
  if (!Number.isInteger(id) || id <= 0) throw new Error('mangaId inválido');
  return id;
}

// El vínculo activo de un manga. El invariante "un solo cover activo" garantiza
// un único ref por manga (sin fijar provider), por lo que alcanza el primero.
function getActiveRef(db, mangaId) {
  return listRefsByManga(db, mangaId)[0] ?? null;
}

// Borra los refs del manga cuyo provider ≠ `keepProvider`, junto con sus
// archivos. Al vincular (AniList o local) queda un solo cover activo.
async function clearOtherRefs(db, dir, mangaId, keepProvider) {
  for (const ref of listRefsByManga(db, mangaId)) {
    if (ref.provider === keepProvider) continue;
    if (ref.coverFile) await removeCoverFile(dir, ref.coverFile);
    removeRef(db, mangaId, ref.provider);
  }
}

// Descarga la portada del candidato, la guarda y deja el vínculo (AniList).
export async function linkCover(db, dataDir, { mangaId, candidate, fetchImpl } = {}) {
  const id = requireMangaId(mangaId);
  if (!candidate?.id) throw new Error('candidato inválido');
  if (!candidate.coverUrl) throw new Error('el candidato no tiene portada');

  const dir = coversDir(dataDir);
  const { buffer, ext } = await fetchCover(candidate.coverUrl, { fetchImpl });
  const previous = getRef(db, id, PROVIDER);
  const fileName = await saveCoverFile(dir, id, buffer, ext);
  const ref = upsertRef(db, {
    mangaId: id,
    provider: PROVIDER,
    externalId: candidate.id,
    coverFile: fileName,
  });
  await clearOtherRefs(db, dir, id, PROVIDER);
  if (previous?.coverFile && previous.coverFile !== fileName) {
    await removeCoverFile(dir, previous.coverFile);
  }
  return { ref, coverUrl: coverUrl(fileName) };
}

// Vincula una portada desde un archivo local del usuario: valida el tamaño
// (sin leer si excede el cap), detecta el formato por magic bytes, la copia al
// cache gestionado (`<mangaId>.<ext>`) y deja el vínculo local.
export async function linkLocalCover(db, dataDir, { mangaId, sourcePath } = {}) {
  const id = requireMangaId(mangaId);
  if (typeof sourcePath !== 'string' || sourcePath.trim() === '') {
    throw new Error('sourcePath inválido');
  }
  const info = await stat(sourcePath);
  if (!info.isFile()) throw new Error('sourcePath no es un archivo');
  if (info.size > MAX_COVER_BYTES) throw new Error('imagen demasiado grande');

  const buffer = await readFile(sourcePath);
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
  });
  await clearOtherRefs(db, dir, id, LOCAL_PROVIDER);
  if (previous?.coverFile && previous.coverFile !== fileName) {
    await removeCoverFile(dir, previous.coverFile);
  }
  return { ref, coverUrl: coverUrl(fileName) };
}

// Re-descarga/actualiza la portada de un manga ya vinculado. Solo aplica a
// vínculos con URL remota (AniList): una portada local no se re-descarga.
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

// Estado del portada vigente: provider-agnóstico (resuelve el vínculo del manga
// sin fijar proveedor) para que la UI muestre la procedencia (AniList o local).
export function statusCover(db, mangaId) {
  const ref = getActiveRef(db, requireMangaId(mangaId));
  if (!ref) return null;
  return {
    provider: ref.provider,
    externalId: ref.externalId,
    coverUrl: ref.coverFile ? coverUrl(ref.coverFile) : null,
  };
}

// Mapa { mangaId: url } para pintar las cards sin una llamada por manga.
// Provider-agnóstico; el invariante "un solo ref por manga" da una sola URL.
export function coverMap(db) {
  const map = {};
  for (const ref of listRefs(db)) {
    if (ref.coverFile) map[ref.mangaId] = coverUrl(ref.coverFile);
  }
  return map;
}

// Auto-match best-effort al agregar un manga: busca por el título local y
// vincula SOLO si hay un único candidato idéntico (normalizado). Si es ambiguo
// o no hay match, no hace nada. Nunca pisa un vínculo existente (cualquier
// procedencia, p. ej. una portada local).
export async function autoMatchCover(db, dataDir, mangaId, { fetchImpl, includeAdult = false } = {}) {
  const id = requireMangaId(mangaId);
  const existing = getActiveRef(db, id);
  if (existing?.coverFile) return coverUrl(existing.coverFile);
  const manga = getMangaById(db, id);
  if (!manga?.name) return null;
  const candidates = await searchManga(manga.name, { fetchImpl, includeAdult });
  const match = pickAutoMatch(manga.name, candidates);
  if (!match?.coverUrl) return null;
  const linked = await linkCover(db, dataDir, { mangaId: id, candidate: match, fetchImpl });
  return linked.coverUrl;
}
