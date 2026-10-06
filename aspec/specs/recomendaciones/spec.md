
### Requirement: Motor local de recomendaciones con fallback obligatorio

The system SHALL construir primero la lista local de candidatas: excluir títulos owned tras normalización (`normalize.js`), inferir mercado del usuario por país de editorial (`countryInference.js` + `publisher-countries.json`), excluir candidatas fuera de mercado (`recommendationEngine.js` + `catalog.json`), y permitir menos de 10 resultados si el mercado local no alcanza; en desktop el motor corre en el proceso main de Electron (canal IPC `recommendation:get`, clamp de `limit` 1–10) reutilizando `shared/recommendations` en JS, sin portar `LocalRecommendationEngine.cs`.

#### Scenario: Recomendar solo mercado local en desktop

- **WHEN** se solicita recomendación para un perfil con colección owned
- **THEN** el proceso main ejecuta `shared/recommendations` en JS (sin portar `LocalRecommendationEngine.cs`) y devuelve solo no-owned del mercado inferido, permitiendo menos de 10 resultados si el mercado local no alcanza

#### Scenario: Recomendación vía IPC local con fallback

- **WHEN** el renderer invoca el canal IPC de recomendación con `profileId` válido y `limit`
- **THEN** el proceso main devuelve la lista local, con `limit` clampeado a 1–10, sin backend .NET ni error si no hay resultados
