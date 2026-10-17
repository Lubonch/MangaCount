# Tasks: Portadas locales (elegir imagen desde el equipo)

## Fase 1 — Servicio de portadas (main)

- [x] `covers.js`: agregar `sniffImageExt(buffer)` que detecte PNG/JPEG/WEBP/GIF por **magic bytes** y
      devuelva la extensión real (`png`/`jpg`/`webp`/`gif`) o `null`; nada de confiar en la extensión.
- [x] `covers.js`: agregar helper `clearOtherRefs(db, dir, mangaId, keepProvider)` que borre los refs del
      manga cuyo provider ≠ `keepProvider` y sus archivos (reutiliza `listRefsByManga` + `removeRef` +
      `removeCoverFile`).
- [x] `covers.js`: agregar `linkLocalCover(db, dataDir, { mangaId, sourcePath })`: validar `mangaId` y
      `sourcePath`; `fs.stat` con cap (`MAX_COVER_BYTES`, 8 MB, archivo regular) **antes de leer**;
      `readFile`; `sniffImageExt` (rechaza no soportados, incluido SVG); `saveCoverFile`; limpiar otros
      refs; `upsertRef({ provider:'local', externalId:'', coverFile })`; borrar la imagen anterior si
      cambió; devolver `{ ref, coverUrl }`.
- [x] `covers.js`: en `linkCover` (AniList), tras el `upsertRef`, llamar a `clearOtherRefs` para borrar
      los otros refs (p. ej. el local) y sus archivos → un solo cover activo.
- [x] `covers.js`: volver **provider-agnósticos** `statusCover`, `unlinkCover` y el guarda `existing` de
      `autoMatchCover` (buscar el ref del manga sin fijar `PROVIDER`); mantener `coverMap` sin proveedor
      fijo y documentar que el invariante de un solo ref da una sola URL por manga.
- [x] `covers.js`: documentar en `refreshCover` que no aplica a portadas locales (sin URL remota).

## Fase 2 — Canal IPC y adapter

- [x] `handlers.js`: agregar `'cover:local': ({ db, dataDir }, { mangaId, sourcePath } = {}) =>
      linkLocalCover(db, dataDir, { mangaId, sourcePath })` (importar `linkLocalCover`).
- [x] `preload.cjs`: agregar `'cover:local'` a la lista de `channels`.
- [x] `localAdapter.js`: agregar `export const coverLocal = (mangaId, sourcePath) =>
      apiCall('cover:local', '/api/cover/local', json({ mangaId, sourcePath }), { mangaId, sourcePath })`.

## Fase 3 — UI del modal (renderer)

- [x] `LinkCoverModal.jsx`: agregar el botón **“Buscar en mi PC…”** junto a la búsqueda; al pulsarlo
      llamar a `pickFile([{ name: 'Imágenes', extensions: ['png','jpg','jpeg','webp','gif'] }])`; si
      devuelve un path, llamar a `coverLocal(manga.id, path)` y luego `onLinked`/`onClose`.
- [x] `LinkCoverModal.jsx`: manejar cancelación (`null`) sin llamar a `coverLocal`, y mostrar un error
      visible si `coverLocal` falla; deshabilitar el botón mientras está ocupado.
- [x] `LinkCoverModal.jsx`: mostrar la **procedencia** desde `status.provider` (“Portada local” vs AniList)
      y un **thumbnail** de `status.coverUrl` si existe.
- [x] `LinkCoverModal.css`: estilos para el botón local y el bloque de procedencia/thumbnail sobre los
      design tokens (sin valores hardcodeados).

## Fase 4 — Tests main

- [x] `covers.test.js`: sniff de magic bytes (PNG/JPEG/WEBP/GIF válidos con extensión real; SVG/texto/
      binario rechazados).
- [x] `covers.test.js`: cap de tamaño (archivo > `MAX_COVER_BYTES` rechazado sin escribir) y archivo
      inexistente / `sourcePath` inválido.
- [x] `covers.test.js`: `linkLocalCover` feliz (ref `provider:'local'`, `externalId:''`, `coverUrl`) y
      borra la imagen anterior al re-vincular.
- [x] `covers.test.js`: reemplazo cruzado — `linkLocalCover` sobre AniList borra el ref/archivo AniList;
      `linkCover` sobre local borra el ref/archivo local.
- [x] `covers.test.js`: provider-agnóstico — `statusCover` reporta `provider:'local'`; `unlinkCover` borra
      el ref local y su archivo; `coverMap` incluye la URL local; `autoMatchCover` no pisa una portada
      local.
- [x] `handlers.test.js`: `channelNames()` incluye `cover:local` y el handler delega en `linkLocalCover`.

## Fase 5 — Tests renderer

- [x] `LinkCoverModal.test.jsx`: el botón “Buscar en mi PC…” llama a `pickFile` con los filtros y luego a
      `coverLocal`; notifica `onLinked`/`onClose`.
- [x] `LinkCoverModal.test.jsx`: `pickFile` cancelado no llama a `coverLocal`; error de `coverLocal`
      muestra mensaje.
- [x] `LinkCoverModal.test.jsx`: procedencia “Portada local” cuando `status.provider === 'local'` y
      thumbnail renderizado cuando hay `status.coverUrl`.
- [x] `LinkCoverModal.test.jsx`: actualizar los mocks del módulo (`pickFile`, `coverLocal`) y no romper
      los tests existentes de búsqueda/vínculo/desvínculo.

## Fase 6 — Gates y verificación

- [x] `npm run lint:renderer` sin errores (mirar la línea resumen completa de ESLint).
- [x] `npm run test:coverage` (main) en verde (≥90% stmts/branches/funcs/lines).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run build:renderer` sin errores.
- [x] Verificación manual: en un manga sin match en AniList, “Buscar en mi PC…” copia la imagen, la
      muestra en la colección y en el thumbnail del modal; el estado refleja “Portada local”.
- [x] `ancleto-security` + verificación cruzada contra proposal/design/specs.
- [x] Al archivar, reconciliar los specs `mangas`/`frontend-web` afectados (procedencia y fuente local).
