
### Requirement: Motor local de recomendaciones con fallback obligatorio

The system SHALL construir primero la lista local de candidatas: excluir títulos owned tras normalización (`normalize.js`), inferir mercado del usuario por país de editorial (`countryInference.js` + `publisher-countries.json`), excluir candidatas fuera de mercado (`recommendationEngine.js` + `catalog.json`), y permitir menos de 10 resultados si el mercado local no alcanza.

#### Scenario: Recomendar solo mercado local

- **WHEN** se solicita recomendación para un perfil con colección owned
- **THEN** el sistema devuelve solo no-owned del mercado inferido, nunca owned ni fuera de mercado

### Requirement: Endpoint backend con reranking opcional

The system SHALL exponer `GET /api/recommendation?profileId={id}&limit=10` vía `RecommendationController` + `RecommendationService` + `LocalRecommendationEngine`, con reranking opcional posterior (`GitHubModelsRankingProvider`, `OpenRouterRankingProvider` por env vars) y fallback local siempre disponible.

#### Scenario: Reranking remoto con fallback local

- **WHEN** el reranking remoto está configurado y responde
- **THEN** el sistema devuelve la lista rerankeada; WHEN el proveedor falla o no está configurado THEN devuelve la lista local sin error
