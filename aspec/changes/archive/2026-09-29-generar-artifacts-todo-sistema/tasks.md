# Tasks: Generar artifacts de todo el sistema MangaCount

## Fase 1 — Base backend (línea base especificada)

- [x] Relevar `ProfileController` + `ProfileService` + `ProfileRepository` y escribir `specs/perfiles/spec.md`
- [x] Relevar `MangaController` + `MangaService` + `MangaRepository` y escribir `specs/mangas/spec.md`
- [x] Relevar `EntryController` + `EntryService` + `EntryRepository` y escribir `specs/entries/spec.md`
- [x] Relevar `FormatController` + `PublisherController` y servicios/repositorios y escribir `specs/catalogos/spec.md`
- [x] Relevar `ImportController` (import/export TSV) y escribir `specs/import-export/spec.md`

## Fase 2 — Recomendaciones y superficies web

- [x] Relevar `RecommendationController` + `RecommendationService` + `LocalRecommendationEngine` + providers y escribir `specs/recomendaciones/spec.md`
- [x] Relevar `shared/recommendations` (`normalize.js`, `countryInference.js`, `recommendationEngine.js`, `catalog.json`) y cubrirlo en `specs/recomendaciones/spec.md`
- [x] Relevar `mangacount.client/src` (multi-perfil, CRUD, filtros, themes) y escribir `specs/frontend-web/spec.md`
- [x] Relevar `Pages/src` (demo estática sin backend) y escribir `specs/pages-demo/spec.md`

## Fase 3 — Bot y transversal

- [x] Relevar `WhatsappBot/src` (router, commands, authorization, api, session, browser) y escribir `specs/whatsapp-bot/spec.md`
- [x] Relevar logging (`Logging/`, `logger.js`, `logs/backend.txt`, `logs/bot.txt`), config (`appsettings*.json`, env vars) y deploy (`deployment/`) y escribir `specs/transversal/spec.md`
- [x] Verificar que cada spec existe en disco y que cada Requirement tiene Scenario WHEN/THEN trazable a archivo real
- [x] Verificación final cruzada contra proposal (qué) y design (cómo): sin código cambiado, solo artifacts
