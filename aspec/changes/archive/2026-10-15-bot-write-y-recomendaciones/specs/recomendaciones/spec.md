## MODIFIED Requirements

### Requirement: Motor local de recomendaciones con fallback obligatorio

The system SHALL construir primero la lista local de candidatas: excluir títulos owned tras
normalización (`normalize.js`), inferir mercado del usuario por país de editorial (`countryInference.js`
+ `publisher-countries.json`), excluir candidatas fuera de mercado (`recommendationEngine.js` +
`catalog.json`), y permitir menos de 10 resultados si el mercado local no alcanza; en desktop el motor
corre en el proceso main de Electron (canal IPC `recommendation:get`, clamp de `limit` 1–10)
reutilizando `shared/recommendations` en JS, sin portar `LocalRecommendationEngine.cs`. La respuesta de
`recommendation:get` SHALL incluir, además de `items`, `blockedByImportCount` y el objeto `inference`
con el `breakdown` por país (series, volúmenes y editoriales), para poder explicar un resultado sin
confianza.

#### Scenario: Recomendar solo mercado local en desktop

- **WHEN** se solicita recomendación para un perfil con colección owned
- **THEN** el proceso main ejecuta `shared/recommendations` en JS (sin portar `LocalRecommendationEngine.cs`) y devuelve solo no-owned del mercado inferido, permitiendo menos de 10 resultados si el mercado local no alcanza

#### Scenario: Recomendación vía IPC local con fallback

- **WHEN** el renderer o el bot invoca el canal IPC de recomendación con `profileId` válido y `limit`
- **THEN** el proceso main devuelve la lista local, con `limit` clampeado a 1–10, sin backend .NET ni error si no hay resultados

#### Scenario: Respuesta con desglose de mercado

- **WHEN** la inferencia de mercado no es confiable
- **THEN** la respuesta incluye `inference.breakdown` (país → series/volúmenes/editoriales) y `blockedByImportCount`, para que el consumidor pueda explicar el motivo

## ADDED Requirements

### Requirement: Mapa de editoriales por país ampliado con aliases

The system SHALL mantener `shared/recommendations/publisher-countries.json` con las editoriales y sus
**aliases** relevantes, de modo que una variante de nombre resuelva al mismo país que su forma canónica
(por ejemplo, `ovni` → `Argentina`, igual que `ovni press`); las editoriales desconocidas (`Unknown`)
NO SHALL contar para ningún país.

#### Scenario: Alias de editorial resuelve al país

- **WHEN** una entry tiene editorial `ovni` (variante de `ovni press`)
- **THEN** cuenta para el país `Argentina` en la inferencia de mercado

#### Scenario: Editorial desconocida no cuenta

- **WHEN** una entry tiene editorial `Unknown`
- **THEN** no suma a ningún país en la inferencia de mercado
