# Tasks: Recomendaciones dinámicas con AniList y feedback del usuario

## Fase 1 — Esquema y repositorios

- [x] 1.1 Agregar `RecommendationDismissal` y `RecommendationSeen` (con `ON DELETE CASCADE` e índices)
      a `electron/main/db/schema.sqlite.sql`.
- [x] 1.2 Crear `electron/main/db/repositories/recommendation-feedback.js` con
      `dismiss`, `listDismissed`, `clearDismissal`, `markSeen`, `listSeen(profileId, sinceIso)`,
      `pruneSeen(profileId, beforeIso)`.
- [x] 1.3 Tests del repo: dismiss/list/clear, markSeen/listSeen con `since`, pruneSeen y cascade al
      borrar el perfil.

## Fase 2 — Provider AniList

- [x] 2.1 Crear `electron/main/services/anilist-recommendations.js` con
      `getAnilistRecommendations(db, profileId, { limit, seenTtlDays, includeAdult, fetchImpl, timeoutMs, now })`.
- [x] 2.2 Semillas: entries del perfil con `MangaExternalRef(provider='anilist')`; resolver las que no
      tienen vínculo con `searchManga` de `covers.js` (tope de semillas, p. ej. 12).
- [x] 2.3 Grafo: `Media.recommendations` por semilla con concurrencia acotada y `timeout`; una semilla
      que falla no aborta el resto; todas fallan → `null`.
- [x] 2.4 Agregar por `mediaRecommendation.id` (`ratingTotal`, `seedCount`, semillas, unión de
      genres/tags).
- [x] 2.5 Score = `log1p(ratingTotal)` + similitud coseno de tags/géneros contra
      `buildUserTasteProfile` (reutilizado) + bonus por `seedCount`; `reason` = semilla con mayor rating.
- [x] 2.6 Filtros: descartados, ya en la colección (por `MangaExternalRef` o título normalizado),
      vistos dentro del TTL, +18 según preferencia.
- [x] 2.7 Buffer (`limit * 3`), devolver `limit`, marcar las devueltas como vistas, `exhausted` si no
      alcanza.
- [x] 2.8 Tests con `fetchImpl` falso (agregado multi-semilla, filtros, TTL vencido, fallo total,
      fallo parcial, buffer insuficiente).

## Fase 3 — Cableado IPC

- [x] 3.1 `'recommendation:get'`: AniList si `enabled`, si no o si devuelve `null` → motor local.
- [x] 3.2 `'recommendation:dismiss'` → registra el descarte.
- [x] 3.3 `'recommendation:own'` → vincula (`mangaId`) o crea manga + entry + ref (`title`).
- [x] 3.4 `'recommendation:config-get'` / `'recommendation:config-set'` con validación de `limit`
      (1–25) y `seenTtlDays` (1–365).
- [x] 3.5 Tests de handlers (AniList OK / caído, dismiss excluye en la próxima `get`, `own` vincula y
      crea, validaciones de config).

## Fase 4 — UI e i18n

- [x] 4.1 Wrappers en `mangacount.client/src/api/localAdapter.js` y entradas en el shim de fetch.
- [x] 4.2 `RecommendationModal.jsx`: acciones "Ya lo tengo" / "No viable" por tarjeta, botón ↻,
      relleno tras descartar (`recommendation:get({ limit: 1 })`), estado `exhausted`.
- [x] 4.3 Picker de "Ya lo tengo" reusando `manga:list` (y opción de crear el manga con el nombre del
      usuario).
- [x] 4.4 Claves `rec.*` (modal) y `settings.rec.*` (Settings) en `en.js` y `es.js` (paridad).
- [x] 4.5 Sección de config en `SettingsModal.jsx` (`enabled`, `limit`, `seenTtlDays`).
- [x] 4.6 Tests de `RecommendationModal` (descartar rellena, ↻ pide batch nuevo, picker, `exhausted`) y
      de `SettingsModal`.

## Fase 5 — Verificación

- [x] 5.1 `npm test`
- [x] 5.2 `npm run test:renderer:coverage`
- [x] 5.3 `npm run lint:renderer`
- [x] 5.4 `npm run build:renderer`
- [ ] 5.5 Prueba funcional: con red → recomendaciones AniList con "Porque tenés X"; descartar una y ver
      que entra otra (siguen 10); ↻ trae 10 nuevas sin repetir; "Ya lo tengo" vincula y no vuelve; sin
      red → fallback local sin error visible.
