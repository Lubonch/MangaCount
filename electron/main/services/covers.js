// Portadas vía AniList + cache en disco.
//
// AniList GraphQL es anónimo (sin API key) pero tiene rate limit (30 req/min).
// Aislado del runtime para poder testearlo con un `fetch` inyectado.
// El vínculo guarda solo el ExternalId + nombre de archivo; el nombre local del
// manga NO se toca.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  getRef,
  upsertRef,
  setCoverFile,
  removeRef,
  listRefs,
} from '../db/repositories/manga-external-refs.js';
import { getMangaById } from '../db/repositories/mangas.js';

export const ANILIST_URL = 'https://graphql.anilist.co';
export const PROVIDER = 'anilist';
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        volumes
        startDate { year }
      }
    }
  }
`;

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

export async function searchMangaOnce(query, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
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
      body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: String(query ?? '') } }),
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
    }));
  } finally {
    clearTimeout(timer);
  }
}

// Busca reintentando una vez ante 429 (respeta Retry-After). La espera es
// inyectable para testearla sin demoras reales.
export async function searchManga(
  query,
  { fetchImpl = fetch, timeoutMs = 8000, retries = 1, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}
) {
  let attempt = 0;
  for (;;) {
    try {
      return await searchMangaOnce(query, { fetchImpl, timeoutMs });
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
  if (previous?.coverFile && previous.coverFile !== fileName) {
    await removeCoverFile(dir, previous.coverFile);
  }
  return { ref, coverUrl: coverUrl(fileName) };
}

// Re-descarga/actualiza la portada de un manga ya vinculado.
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
  const ref = getRef(db, id, PROVIDER);
  if (!ref) return { ok: false };
  if (ref.coverFile) await removeCoverFile(coversDir(dataDir), ref.coverFile);
  removeRef(db, id, PROVIDER);
  return { ok: true };
}

export function statusCover(db, mangaId) {
  const ref = getRef(db, requireMangaId(mangaId), PROVIDER);
  if (!ref) return null;
  return {
    provider: ref.provider,
    externalId: ref.externalId,
    coverUrl: ref.coverFile ? coverUrl(ref.coverFile) : null,
  };
}

// Mapa { mangaId: url } para pintar las cards sin una llamada por manga.
export function coverMap(db) {
  const map = {};
  for (const ref of listRefs(db)) {
    if (ref.coverFile) map[ref.mangaId] = coverUrl(ref.coverFile);
  }
  return map;
}

// Auto-match best-effort al agregar un manga: busca por el título local y
// vincula SOLO si hay un único candidato idéntico (normalizado). Si es ambiguo
// o no hay match, no hace nada. Nunca pisa un vínculo existente.
export async function autoMatchCover(db, dataDir, mangaId, { fetchImpl } = {}) {
  const id = requireMangaId(mangaId);
  const existing = getRef(db, id, PROVIDER);
  if (existing?.coverFile) return coverUrl(existing.coverFile);
  const manga = getMangaById(db, id);
  if (!manga?.name) return null;
  const candidates = await searchManga(manga.name, { fetchImpl });
  const match = pickAutoMatch(manga.name, candidates);
  if (!match?.coverUrl) return null;
  const linked = await linkCover(db, dataDir, { mangaId: id, candidate: match, fetchImpl });
  return linked.coverUrl;
}
