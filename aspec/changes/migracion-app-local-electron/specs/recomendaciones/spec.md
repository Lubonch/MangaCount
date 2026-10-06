## MODIFIED Requirements

### Requirement: Motor local de recomendaciones con fallback obligatorio

The system SHALL construir primero la lista local de candidatas: excluir títulos owned tras normalización (`normalize.js`), inferir mercado del usuario por país de editorial (`countryInference.js` + `publisher-countries.json`), excluir candidatas fuera de mercado (`recommendationEngine.js` + `catalog.json`), y permitir menos de 10 resultados si el mercado local no alcanza; en desktop el motor corre en el proceso main de Electron (canal IPC `recommendation:get`, clamp de `limit` 1–10) reutilizando `shared/recommendations` en JS, sin portar `LocalRecommendationEngine.cs`.

#### Scenario: Recomendar solo mercado local en desktop

- **WHEN** se solicita recomendación para un perfil con colección owned
- **THEN** el proceso main ejecuta `shared/recommendations` en JS (sin portar `LocalRecommendationEngine.cs`) y devuelve solo no-owned del mercado inferido, permitiendo menos de 10 resultados si el mercado local no alcanza

#### Scenario: Recomendación vía IPC local con fallback

- **WHEN** el renderer invoca el canal IPC de recomendación con `profileId` válido y `limit`
- **THEN** el proceso main devuelve la lista local, con `limit` clampeado a 1–10, sin backend .NET ni error si no hay resultados

## REMOVED Requirements

### Requirement: Endpoint backend con reranking opcional

**Reason:** decisión de scope (revisión 2026-10-06): en desktop ya no hay endpoint HTTP `GET /api/recommendation` ni `RecommendationController`/`RecommendationService`, y no se portan los providers remotos (`OpenRouterRankingProvider`, `GitHubModelsRankingProvider`). `electron/main/services/recommendations.js` deja `providers = []` como punto de extensión, pero el reranking remoto no forma parte de este change; solo se conserva el motor local obligatorio.

**Migration:** el renderer consume la recomendación por el canal IPC `recommendation:get`, que devuelve solo la lista local. No hay config por env vars de providers en desktop; si en el futuro se readopta, se reactiva el punto de extensión `providers` de `recommendations.js`.
