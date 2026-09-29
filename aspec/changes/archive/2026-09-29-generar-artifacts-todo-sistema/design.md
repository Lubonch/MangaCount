# Design: Generar artifacts de todo el sistema MangaCount

## Approach

Relevamiento bottom-up sin tocar código: leer Controllers/Services/Repositories del backend, componentes del frontend, comandos del bot, motor en `shared/recommendations` y scripts de `deployment/`, y volcar cada comportamiento verificado como delta spec por capacidad dentro de este mismo change. Cada spec usa solo `ADDED Requirements` (línea base inicial, no hay specs previas que modificar) con escenarios `WHEN`/`THEN`. Si una capacidad no tiene comportamiento especificable, se omite su spec con justificación en tasks.

## Architecture

Mapa del sistema a especificar (estado real verificado):

- Backend `MangaCount.Server` (.NET 8, ASP.NET Core): capas Controllers → Services → Repositories con Dapper sobre PostgreSQL 16. Controladores: Profile, Manga, Entry, Format, Publisher, Import, Recommendation, Database, LoadBearing. DTOs con AutoMapper, Swagger, CORS dev, hosting estático del frontend.
- Frontend `mangacount.client` (React 19 + Vite + CSS Modules): multi-perfil con localStorage, CRUD con modales, filtros básicos, themes claro/oscuro, proxy API a backend en `https://localhost:63920`.
- Demo `Pages`: app estática que consume `shared/recommendations` directamente sin backend.
- Motor compartido `shared/recommendations`: `catalog.json`, `normalize.js`, `countryInference.js`, `recommendationEngine.js`; reglas: excluir owned normalizado, inferir mercado por país de editorial, excluir fuera de mercado, permitir <10 resultados.
- Recomendación backend: `RecommendationService` + `LocalRecommendationEngine` obligatorio como fallback, reranking opcional vía `GitHubModelsRankingProvider` / `OpenRouterRankingProvider` por env vars; endpoint `GET /api/recommendation?profileId={id}&limit=10`.
- Import/export TSV con campos `Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial` vía `ImportController`.
- Bot `WhatsappBot` (Node 20, whatsapp-web.js + Chromium): whitelist `WHATSAPP_ALLOWED_NUMBERS`, router de comandos (`ping, buscar, recomendar, pendientes, actualizar, perfil`), cliente API (`MANGA_API_URL`), logs diarios.
- Transversal: logs diarios `logs/backend.txt` y `logs/bot.txt` con rotación `*.YYYY-MM-DD`, config por `appsettings*.json` + env vars (sin secretos en frontend), deploy con `deployment/deploy.sh` y `deploy-bot.sh`, schema `deployment/database-schema.sql`.

## Validation

- Cada artifact existe en disco (`proposal.md`, `design.md`, `tasks.md`, `specs/<capacidad>/spec.md`).
- Cada spec contiene al menos un `Requirement` con `SHALL` y un `Scenario` con `WHEN`/`THEN` trazable a archivo real citado en el Requirement.
- Verificación cruzada: endpoints citados existen en `Controllers/`, comandos citados existen en `WhatsappBot/src/commands`, reglas de recomendación coinciden con `README.md` y `recommendationEngine.js`.
- `tasks.md` marca completitud por capacidad de forma independientemente verificable.
