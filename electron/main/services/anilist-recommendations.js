// Dynamic recommendations via the AniList graph.
//
// From the profile's collection works (seeds) it queries
// `Media.recommendations`, adds the collaborative `rating` and scores the
// similarity of tags/genres against the local taste profile. Provides the universe
// of candidates; the local engine (`getRecommendations`) remains as fallback.
//
// Closed semantics (see aspec/changes/2026-10-18-recomendaciones-dinamicas-anilist):
// - "not viable"      -> RecommendationDismissal (permanent).
// - "already have it" -> MangaExternalRef of the profile (permanent).
// - "already seen"    -> RecommendationSeen with TTL (`seenTtlDays`).
// Isolated from the runtime so it can be tested with an injected `fetch`.

import { ANILIST_URL, PROVIDER, searchManga, pickAutoMatch } from './covers.js';
import { getRef } from '../db/repositories/manga-external-refs.js';
import { listEntries } from '../db/repositories/entries.js';
import { buildUserTasteProfile } from '../../../shared/recommendations/recommendationEngine.js';
import { normalizeTitle, tokenizeText } from '../../../shared/recommendations/normalize.js';
import { listDismissed, listSeen, markSeen, pruneSeen } from '../db/repositories/recommendation-feedback.js';

const MAX_SEEDS = 12; // seed cap to bound requests
const SEED_CONCURRENCY = 3; // bounded concurrency (AniList rate limit)
const DAY_MS = 24 * 60 * 60 * 1000;
const TAG_WEIGHT = 2.4;
const COSINE_WEIGHT = 1.5;
const SEED_BONUS = 0.5;
const POOL_TTL_MS = 5 * 60 * 1000;

// Cache of the scored candidate pool, keyed by database and profile. Building it
// costs one AniList request per seed, so the backfill (`limit: 1` after dismissing
// a card) must not rebuild it: it is served from here until it expires or the
// filters drain it. Keyed by the `db` object so a replaced connection (e.g. after
// a restore) starts from an empty cache and tests stay isolated.
const poolCache = new WeakMap(); // db -> Map<profileId, { at: number, candidates }>

function readPool(db, profileId, now) {
  const perProfile = poolCache.get(db);
  const entry = perProfile?.get(profileId);
  if (!entry) return null;
  if (now.getTime() - entry.at >= POOL_TTL_MS) {
    perProfile.delete(profileId);
    return null;
  }
  return entry.candidates;
}

function writePool(db, profileId, now, candidates) {
  let perProfile = poolCache.get(db);
  if (!perProfile) {
    perProfile = new Map();
    poolCache.set(db, perProfile);
  }
  perProfile.set(profileId, { at: now.getTime(), candidates });
}

// Query verified live: `rating` = how many users recommended the work.
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

// Seeds: profile mangas with `MangaExternalRef(anilist)`; those without a link are
// resolved by title search (strict auto-match). Cap of 12, the most recent ones
// (higher entry id).
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
      // Unresolved seed: ignored (the rest can continue).
    }
  }
  return seeds;
}

// Bounded concurrency pool: preserves the input order in `results`.
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

// Aggregates by `mediaRecommendation.id`: sum of `rating`, how many seeds brought
// it and the union of seeds (for the `reason`).
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

// Expensive half: seeds -> AniList graph -> aggregate -> score -> sort. Returns
// `null` when there is nothing to work with (no resolvable seed, or every seed
// request failed), so the caller can fall back to the local engine. The result is
// the full scored pool; the filters are applied per call by `selectRecommendations`.
async function buildCandidatePool(db, entries, { fetchImpl, timeoutMs, includeAdult }) {
  const seeds = await resolveSeeds(db, entries, { fetchImpl, timeoutMs, includeAdult });
  if (seeds.length === 0) return null;

  const settled = await mapWithConcurrency(seeds, SEED_CONCURRENCY, async (seed) => {
    try {
      return { seed, nodes: await fetchSeed(seed, { fetchImpl, timeoutMs }), ok: true };
    } catch {
      return { seed, nodes: [], ok: false };
    }
  });

  // One failing seed does not abort the rest; if all fail -> fallback local.
  const successful = settled.filter((result) => result.ok);
  if (successful.length === 0) return null;

  const profile = buildUserTasteProfile(entries, []);
  const candidates = [];
  for (const aggregated of aggregate(successful)) {
    const { media } = aggregated;
    const title = media.title?.romaji || media.title?.english || '';
    if (!title) continue;

    const similarity = cosineSimilarity(profile.tokenWeights, candidateTokenWeights(media));
    const score =
      Math.log1p(aggregated.ratingTotal) + similarity * COSINE_WEIGHT + aggregated.seedCount * SEED_BONUS;
    // `reason` is the highest-rated seed that brought the candidate; the sentence
    // is composed in the UI with i18n (`rec.reason`).
    const bestSeed = aggregated.seeds.reduce((a, b) => (b.rating > a.rating ? b : a), aggregated.seeds[0]);
    candidates.push({
      externalId: String(media.id),
      title,
      coverUrl: media.coverImage?.large ?? null,
      volumes: media.volumes ?? null,
      genres: (media.genres ?? []).slice(),
      isAdult: media.isAdult === true,
      score: Number(score.toFixed(4)),
      reason: bestSeed?.title ?? '',
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });
  return candidates;
}

// Cheap half: applies the current filters (dismissed / seen within the TTL /
// already owned / adult), takes up to `safeLimit` and marks those as seen.
function selectRecommendations(db, profileId, entries, candidates, { safeLimit, seenTtlDays, includeAdult, now }) {
  const sinceIso = new Date(now.getTime() - seenTtlDays * DAY_MS).toISOString();
  // Prune expired seen rows so `RecommendationSeen` cannot grow without bound.
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

  const items = [];
  for (const candidate of candidates) {
    if (items.length >= safeLimit) break;
    const idStr = candidate.externalId;
    if (dismissed.has(idStr) || seen.has(idStr) || ownedRefIds.has(idStr)) continue;
    if (ownedTitles.has(normalizeTitle(candidate.title))) continue;
    if (candidate.isAdult && !includeAdult) continue;
    items.push({
      externalId: candidate.externalId,
      title: candidate.title,
      coverUrl: candidate.coverUrl,
      volumes: candidate.volumes,
      genres: candidate.genres,
      score: candidate.score,
      reason: candidate.reason,
    });
  }

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

  let candidates = readPool(db, profileId, now);
  if (!candidates) {
    candidates = await buildCandidatePool(db, entries, { fetchImpl, timeoutMs, includeAdult });
    if (!candidates) return null;
    writePool(db, profileId, now, candidates);
  }

  return selectRecommendations(db, profileId, entries, candidates, {
    safeLimit,
    seenTtlDays,
    includeAdult,
    now,
  });
}
