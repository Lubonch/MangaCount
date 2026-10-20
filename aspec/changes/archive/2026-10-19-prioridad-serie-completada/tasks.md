# Tasks: Prioridad solo en series incompletas

## Fase 1 — Invariante en la capa de datos

- [x] 1.1 En `electron/main/db/repositories/entries.js` agregar el helper de completitud
      (`volumes > 0 && quantity >= volumes`) y usarlo en `mapRow` para exponer `priority: false` en
      series completas.
- [x] 1.2 Agregar `effectivePriority(db, { mangaId, quantity, priority })` y aplicarlo en
      `upsertEntry` y `updateEntry` para persistir `IsPriority = 0` cuando la entry queda completa.
- [x] 1.3 Exportar `clearCompletedPriority(db, mangaId, volumes)` y llamarlo desde `updateManga`
      (`electron/main/db/repositories/mangas.js`) con el `TotalVolumes` ya normalizado.
- [x] 1.4 Tests de repositorio: completar con prioridad → `priority === false` en respuesta y en la fila;
      incompleta/sin total conservan prioridad; cambiar `TotalVolumes` limpia solo las completas.

## Fase 2 — Migración de datos existentes

- [x] 2.1 Subir `SCHEMA_VERSION` a `7` en `electron/main/db/client.js` con el comentario de la migración.
- [x] 2.2 Agregar el `UPDATE Entry SET IsPriority = 0 ... EXISTS (...)` idempotente dentro del bloque de
      migración, sin tocar entries incompletas ni series con `TotalVolumes = 0`.
- [x] 2.3 Test de migración: una DB `v6` con una entry completa prioritaria y otra incompleta prioritaria
      deja la primera en `false`, la segunda intacta y `user_version = 7`.

## Fase 3 — Renderer

- [x] 3.1 En `CollectionView.jsx` agregar `isCompleteEntry`/`isPriorityEntry`, usarlos en
      `getEntryStatus`, en el filtro `priority` y en el orden por prioridad.
- [x] 3.2 Reemplazar los renders de `entry.priority` por `isPriorityEntry(entry)` en tabla, compact,
      portada (⭐) y badge de prioridad.
- [x] 3.3 En `AddEntryModal.jsx` derivar la completitud de la selección, deshabilitar y mostrar sin
      marcar el checkbox cuando la serie esté completa, y enviar `priority: false` en ese caso.
- [x] 3.4 Agregar `addEntry.priorityComplete` en `shared/i18n/es.js` y `en.js`.
- [x] 3.5 Tests de `CollectionView`: entry completa con `priority: true` no muestra badges ni aparece en
      el filtro `priority`, y no gana el orden por prioridad.
- [x] 3.6 Tests de `AddEntryModal`: cantidad que completa la serie deshabilita el checkbox y envía
      `priority: false`; cantidad incompleta lo mantiene operativo.

## Fase 4 — Bot de Discord

- [x] 4.1 En `formatEntryLine`, omitir el prefijo ⭐ cuando la serie está completa.
- [x] 4.2 En `commands.prioridad`, responder `bot.priorityComplete` y no proponer escritura si la serie
      está completa.
- [x] 4.3 En `applyWrite`/`togglePriority`, no escribir y devolver el summary de "no aplica" para series
      completas.
- [x] 4.4 Agregar `bot.priorityComplete` en `shared/i18n/es.js` y `en.js`.
- [x] 4.5 Actualizar el test existente que esperaba ⭐ en una serie completa y agregar tests de
      `/prioridad`, botón y `applyWrite` sin escritura.

## Fase 5 — Verificación

- [x] 5.1 `npm test`
- [x] 5.2 `npm run test:renderer:coverage`
- [x] 5.3 `npm run lint:renderer`
- [x] 5.4 `npm run build:renderer`
