// Port of RecommendationService.cs to Node, using shared/recommendations in JS
// (LocalRecommendationEngine.cs is NOT ported: the JS is the reference implementation).
// Preserved semantics: limit clamp 1-10, guaranteed local fallback, optional
// remote reranking with try/catch (no providers configured by default -> local).
// Hook: future providers implement `rerank(context)` and are listed in `providers`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recommendManga } from '../../../shared/recommendations/recommendationEngine.js';
import { listEntries } from '../db/repositories/entries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = path.resolve(__dirname, '../../../shared/recommendations');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(SHARED_DIR, name), 'utf8'));
}

let cache = null;
function sharedData() {
  cache ??= {
    catalog: loadJson('catalog.json'),
    publisherCountries: loadJson('publisher-countries.json'),
  };
  return cache;
}

// Extension point for remote reranking: each provider is
// `{ name, rerank({entries, baseItems, inferredCountry, limit}) => items[]|null }`.
// By default there is none (the local fallback always responds); they can be
// injected by parameter (tests or another phase).

export function clampLimit(limit) {
  return Math.min(10, Math.max(1, Number.isInteger(limit) ? limit : 10));
}

export async function getRecommendations(db, profileId, limit = 10, { providers = [] } = {}) {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error('profileId inválido');
  }
  const safeLimit = clampLimit(limit);
  const entries = listEntries(db, profileId);
  const { catalog, publisherCountries } = sharedData();
  const local = recommendManga({ entries, catalog, publisherCountries, limit: safeLimit });

  if (!local.isConfident || !local.inferredCountry || local.items.length === 0) {
    return toResponse(local, safeLimit);
  }

  for (const provider of providers) {
    try {
      const reranked = await provider.rerank({
        entries,
        baseItems: local.items,
        inferredCountry: local.inferredCountry,
        limit: safeLimit,
      });
      if (Array.isArray(reranked) && reranked.length > 0) {
        return toResponse({ ...local, provider: provider.name, items: reranked.slice(0, safeLimit) }, safeLimit);
      }
    } catch {
      // Local fallback (same as the C# catch).
    }
  }
  return toResponse(local, safeLimit);
}

function toResponse(local, limit) {
  return {
    provider: local.provider,
    inferredCountry: local.inferredCountry,
    isConfident: local.isConfident,
    availableCount: local.items.length,
    blockedByImportCount: local.blockedByImportCount ?? 0,
    items: local.items,
    limit,
    inference: local.inference ?? null,
  };
}
