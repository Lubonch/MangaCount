// Recomendaciones dinámicas vía el grafo de AniList.
//
// A partir de las obras de la colección del perfil (semillas) se consulta
// `Media.recommendations`, se agrega el `rating` colaborativo y se puntúa la
// similitud de tags/géneros contra el perfil de gustos local. Provee el universo
// de candidatas; el motor local (`getRecommendations`) queda como fallback.
//
// Semántica cerrada (ver aspec/changes/2026-10-18-recomendaciones-dinamicas-anilist):
// - "No viable"  -> RecommendationDismissal (permanente).
// - "Ya lo tengo"-> MangaExternalRef del perfil (permanente).
// - "Ya visto"   -> RecommendationSeen con TTL (`seenTtlDays`).
// Aislado del runtime para poder testearlo con un `fetch` inyectado.

import { ANILIST_URL, PROVIDER, searchManga, pickAutoMatch } from './covers.js';
import { getRef } from '../db/repositories/manga-external-refs.js';
import { listEntries } from '../db/repositories/entries.js';
import { buildUserTasteProfile } from '../../../shared/recommendations/recommendationEngine.js';
import { normalizeTitle, tokenizeText } from '../../../shared/recommendations/normalize.js';
import { listDismissed, listSeen, markSeen, pruneSeen } from '../db/repositories/recommendation-feedback.js';

const MAX_SEEDS = 12; // tope de semillas para acotar requests
const SEED_CONCURRENCY = 3; // concurrencia acotada (rate limit de AniList)
const DAY_MS = 24 * 60 * 60 * 1000;
const TAG_WEIGHT = 2.4;
const COSINE_WEIGHT = 1.5;
const SEED_BONUS = 0.5;

// Query verificada en vivo: `rating` = cuántos usuarios recomendaron la obra.
const GRAPH_QUERY = `query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title { romaji english }
    recommendations(perPage: 25) {
      nodes {
        rating
        mediaRecommendation {
          id
          title { romaji english }
          genres
          tags { name rank }
          volumes
          coverImage { large }
          isAdult
        }
      }
    }
  }
}`;

export function clampAnilistLimit(limit) {
  return Math.min(25, Math.max(1, Number.isInteger(limit) ? limit : 10));
}

function cosineSimilarity(leftWeights, rightWeights) {
  const leftEntries = Object.entries(leftWeights);
  const rightEntries = Object.entries(rightWeights);
  if (leftEntries.length === 0 || rightEntries.length === 0) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const [, weight] of leftEntries) leftMagnitude += weight * weight;
  for (const [token, weight] of rightEntries) {
    rightMagnitude += weight * weight;
    dotProduct += (leftWeights[token] || 0) * weight;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function candidateTokenWeights(media) {
  const weights = {};
  for (const genre of media.genres ?? []) {
    for (const token of tokenizeText(genre)) weights[token] = (weights[token] || 0) + TAG_WEIGHT;
  }
  for (const tag of media.tags ?? []) {
    const weight = 1 + (Number(tag?.rank) || 0) / 100;
    for (const token of tokenizeText(tag?.name)) weights[token] = (weights[token] || 0) + weight;
  }
  return weights;
}

async function fetchSeed(seed, { fetchImpl, timeoutMs }) {
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
      body: JSON.stringify({ query: GRAPH_QUERY, variables: { id: seed.externalId } }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const data = await res.json();
    return data?.data?.Media?.recommendations?.nodes ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// Semillas: mangas del perfil con `MangaExternalRef(anilist)`; los que no tienen
// vínculo se resuelven por búsqueda de título (auto-match estricto). Tope de 12,
// las más recientes (mayor id de entry).
async function resolveSeeds(db, entries, { fetchImpl, timeoutMs, includeAdult }) {
  const seeds = [];
  const recent = [...entries]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, MAX_SEEDS);

  for (const entry of recent) {
    const mangaId = entry.mangaId;
    if (!mangaId) continue;
    const linkedId = Number.parseInt(getRef(db, mangaId, PROVIDER)?.externalId, 10);
    if (Number.isInteger(linkedId) && linkedId > 0) {
      seeds.push({ externalId: linkedId, title: entry.manga?.name || `#${linkedId}` });
      continue;
    }
    const name = entry.manga?.name;
    if (!name) continue;
    try {
      const candidates = await searchManga(name, {
        fetchImpl,
        timeoutMs,
        includeAdult,
        fallbackToMangaDex: false,
      });
      const match = pickAutoMatch(name, candidates);
      if (match?.id) seeds.push({ externalId: match.id, title: name });
    } catch {
      // Semilla sin resolver: se ignora (el resto puede seguir).
    }
  }
  return seeds;
}

// Pool de concurrencia acotada: preserva el orden de entrada en `results`.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Agrega por `mediaRecommendation.id`: suma de `rating`, cuántas semillas la
// trajeron y la unión de semillas (para el `reason`).
function aggregate(seedResults) {
  const byId = new Map();
  for (const { seed, nodes } of seedResults) {
    for (const node of nodes) {
      const media = node?.mediaRecommendation;
      if (!media?.id) continue;
      let entry = byId.get(media.id);
      if (!entry) {
        entry = { media, ratingTotal: 0, seedCount: 0, seeds: [] };
        byId.set(media.id, entry);
      }
      entry.ratingTotal += Number(node.rating) || 0;
      entry.seedCount += 1;
      entry.seeds.push({ title: seed.title, rating: Number(node.rating) || 0 });
    }
  }
  return [...byId.values()];
}

export async function getAnilistRecommendations(
  db,
  profileId,
  {
    limit = 10,
    seenTtlDays = 30,
    includeAdult = false,
    fetchImpl = fetch,
    timeoutMs = 12000,
    now = new Date(),
  } = {}
) {
  const safeLimit = clampAnilistLimit(limit);
  const entries = listEntries(db, profileId);

  const seeds = await resolveSeeds(db, entries, { fetchImpl, timeoutMs, includeAdult });
  if (seeds.length === 0) return null;

  const settled = await mapWithConcurrency(seeds, SEED_CONCURRENCY, async (seed) => {
    try {
      return { seed, nodes: await fetchSeed(seed, { fetchImpl, timeoutMs }), ok: true };
    } catch {
      return { seed, nodes: [], ok: false };
    }
  });

  // Una semilla que falla no aborta el resto; si fallan todas -> fallback local.
  const successful = settled.filter((result) => result.ok);
  if (successful.length === 0) return null;

  const sinceIso = new Date(now.getTime() - seenTtlDays * DAY_MS).toISOString();
  // Poda las vistas vencidas: evita que `RecommendationSeen` crezca sin límite.
  pruneSeen(db, profileId, sinceIso);
  const dismissed = new Set(
    listDismissed(db, profileId)
      .filter((row) => row.provider === PROVIDER)
      .map((row) => String(row.externalId))
  );
  const seen = new Set(
    listSeen(db, profileId, sinceIso)
      .filter((row) => row.provider === PROVIDER)
      .map((row) => String(row.externalId))
  );
  const ownedRefIds = new Set();
  const ownedTitles = new Set();
  for (const entry of entries) {
    const key = normalizeTitle(entry.manga?.name);
    if (key) ownedTitles.add(key);
    const refId = entry.mangaId ? getRef(db, entry.mangaId, PROVIDER)?.externalId : null;
    if (refId) ownedRefIds.add(String(refId));
  }

  const profile = buildUserTasteProfile(entries, []);
  const candidates = [];
  for (const aggregated of aggregate(successful)) {
    const { media } = aggregated;
    const idStr = String(media.id);
    if (dismissed.has(idStr) || seen.has(idStr) || ownedRefIds.has(idStr)) continue;
    const title = media.title?.romaji || media.title?.english || '';
    if (!title) continue;
    if (ownedTitles.has(normalizeTitle(title))) continue;
    if (media.isAdult === true && !includeAdult) continue;

    const similarity = cosineSimilarity(profile.tokenWeights, candidateTokenWeights(media));
    const score =
      Math.log1p(aggregated.ratingTotal) + similarity * COSINE_WEIGHT + aggregated.seedCount * SEED_BONUS;
    // `reason` es la semilla con mayor rating que trajo la candidata; la frase se
    // compone en la UI con i18n (`rec.reason`).
    const bestSeed = aggregated.seeds.reduce((a, b) => (b.rating > a.rating ? b : a), aggregated.seeds[0]);
    candidates.push({
      externalId: String(media.id),
      title,
      coverUrl: media.coverImage?.large ?? null,
      volumes: media.volumes ?? null,
      genres: (media.genres ?? []).slice(),
      score: Number(score.toFixed(4)),
      reason: bestSeed?.title ?? '',
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  // Buffer `limit * 3`: devolvemos `limit` y marcamos solo esas como vistas.
  const buffer = candidates.slice(0, safeLimit * 3);
  const items = buffer.slice(0, safeLimit);
  const seenAt = now.toISOString();
  for (const item of items) markSeen(db, profileId, PROVIDER, item.externalId, seenAt);

  return {
    provider: 'anilist',
    inferredCountry: null,
    isConfident: true,
    availableCount: items.length,
    blockedByImportCount: 0,
    items,
    limit: safeLimit,
    inference: null,
    exhausted: items.length < safeLimit,
  };
}
