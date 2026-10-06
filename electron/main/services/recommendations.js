// Port de RecommendationService.cs a Node, usando shared/recommendations en JS
// (NO se porta LocalRecommendationEngine.cs: el JS es la implementación de referencia).
// Semántica conservada: clamp de limit 1-10, fallback local garantizado, reranking
// remoto opcional con try/catch (sin providers configurados por defecto -> local).
// Hook: futuros providers implementan `rerank(context)` y se listan en `providers`.

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

// Punto de extensión para reranking remoto (Fase 0: sin fricción -> ninguno
// configurado; el fallback local siempre responde). Cada provider: async
// ({entries, baseItems, inferredCountry, limit}) -> items[] | null.
const providers = [];

export function clampLimit(limit) {
  return Math.min(10, Math.max(1, Number.isInteger(limit) ? limit : 10));
}

export async function getRecommendations(db, profileId, limit = 10) {
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
      // Fallback local (igual que el catch del C#).
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
    items: local.items,
    limit,
  };
}
