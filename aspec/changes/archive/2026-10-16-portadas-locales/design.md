# Design: Portadas locales (Opción A — un solo cover activo con procedencia)

## Approach

**Opción A**: **un solo cover activo por manga**; `MangaExternalRef.Provider` registra la **procedencia**
(`'anilist'` o `'local'`). Al vincular (AniList **o** local) se borran los otros refs del manga y sus
archivos. Sin cambio de esquema: la tabla ya es aditiva y `saveCoverFile`/`coverFileName` ya generan un
nombre seguro (`<mangaId>.<ext>`), que reutilizamos.

La lectura de archivo local se **valida antes de confiar**: cap de tamaño con `fs.stat` y sniff de
**magic bytes** (no la extensión) para decidir la extensión real con la que se guarda — el protocolo sirve
por extensión, así que guardar la correcta evita servir como imagen algo que no lo es.

### Flujo — vincular portada local

```
renderer                       main
  │ pickFile([{Imágenes: png/jpg/jpeg/webp/gif}]) ─► dialog:pick-file ─► sourcePath | null
  │ coverLocal(mangaId, sourcePath) ─► cover:local ─► linkLocalCover(db, dataDir, {mangaId, sourcePath})
  │                                                     │ fs.stat → cap (MAX_COVER_BYTES=8MB)
  │                                                     │ readFile → sniffMagicBytes → ext | null
  │                                                     │ saveCoverFile(coversDir, mangaId, buffer, ext)
  │                                                     │ limpiar OTROS refs del manga + sus archivos
  │                                                     │ upsertRef({provider:'local', externalId:'', coverFile})
  │                                                     │ borrar imagen anterior si cambió
  │ ◄──── { ref, coverUrl } ◄───────────────────────────┘
  └─ onLinked(mangaId, coverUrl); onClose()
```

### Sniff de magic bytes (extensión real, no declarada)

| Formato | Firma (hex)                                   |
|---------|-----------------------------------------------|
| PNG     | `89 50 4E 47 0D 0A 1A 0A`                      |
| JPEG    | `FF D8 FF`                                     |
| GIF     | `47 49 46 38` (`GIF8`)                          |
| WEBP    | `52 49 46 46 … … … … 57 45 42 50` (`RIFF….WEBP`)|

Cualquier otro contenido (incluido **SVG**, texto/HTML) se rechaza. Si la extensión declarada no coincide
con el contenido real, **gana el contenido** (se guarda con la extensión detectada).

## Architecture

Solo servicios main + IPC + renderer; ningún cambio de esquema ni de repositorio SQL salvo consultas
provider-agnósticas.

```
LinkCoverModal.jsx/.css
  ├─ pickFile(filtros)      (dialog:pick-file, ya existente)
  └─ coverLocal(mangaId, path)  ── localAdapter ──► IPC 'cover:local'
                                                        │
                     handlers.js: 'cover:local' ────────┘
                                                        │
                     covers.js: linkLocalCover(db, dataDir, {mangaId, sourcePath})
                        ├─ stat/readFile + sniff (magic bytes) + cap
                        ├─ saveCoverFile  (reutilizado)
                        ├─ limpieza de OTROS refs (helper compartido con linkCover)
                        └─ upsertRef(provider:'local', externalId:'', coverFile)

                     Provider-agnósticos:
                        statusCover / unlinkCover / coverMap / guarda de autoMatchCover
                        (buscan el ref del manga sin fijar provider)
```

Archivos:

- **Modificar**: `electron/main/services/covers.js` — `linkLocalCover`, `sniffImageExt`, limpieza de
  refs previos, lookups provider-agnósticos.
- **Modificar**: `electron/main/ipc/handlers.js` — canal `cover:local`.
- **Modificar**: `electron/preload.cjs` — `cover:local` en la lista de canales.
- **Modificar**: `mangacount.client/src/api/localAdapter.js` — `coverLocal(mangaId, sourcePath)`.
- **Modificar**: `mangacount.client/src/components/LinkCoverModal.jsx` + `LinkCoverModal.css`.
- **Modificar**: tests (`covers.test.js`, `handlers.test.js`, `LinkCoverModal.test.jsx`).
- **NO tocar**: el protocolo `mangacount://covers/` (ya sirve cualquier archivo del cache), el esquema de
  base de datos, `manga-external-refs.js` salvo reutilización de `listRefsByManga`/`removeRef`.

### Cambios de servicio (detalle)

- **`linkLocalCover(db, dataDir, { mangaId, sourcePath })`**:
  - `requireMangaId`; `sourcePath` string no vacío.
  - `fs.stat(sourcePath)`: debe ser archivo; `size > MAX_COVER_BYTES` → error (sin leer).
  - `readFile` → `sniffImageExt(buffer)`; `null` → error (`formato no soportado`).
  - `saveCoverFile` → `upsertRef({ provider:'local', externalId:'', coverFile })`.
  - **Limpiar otros refs** del manga (todos los providers ≠ `'local'`) y sus archivos; borrar la imagen
    anterior del propio `'local'` si cambia.
  - Devuelve `{ ref, coverUrl }`.
- **`linkCover` (AniList)**: tras el `upsertRef`, **limpiar otros refs** del manga (p. ej. el local) y
  sus archivos. Extraer un helper `clearOtherRefs(db, dir, mangaId, keepProvider)` compartido.
- **`statusCover(db, mangaId)`**: provider-agnóstico → usa `listRefsByManga(db, id)[0]` (o helper
  `getActiveRef`). Devuelve `provider`, `externalId`, `coverUrl` para que la UI muestre la procedencia.
- **`unlinkCover(db, dataDir, mangaId)`**: provider-agnóstico → toma el ref del manga (cualquier
  provider), borra su archivo y el ref. Como hay un solo ref, no hace falta iterar.
- **`coverMap(db)`**: ya itera `listRefs()` sin fijar provider; se mantiene provider-agnóstico y el
  invariante “un solo ref por manga” garantiza una sola URL por `mangaId`.
- **`autoMatchCover`**: el guarda `existing` deja de fijar `PROVIDER`; si el manga ya tiene **cualquier**
  portada (p. ej. local), **no** se pisa (se mantiene “nunca pisa un vínculo existente”). Si la fuente
  activa es local, el auto-match no actúa.
- **`refreshCover`**: se apoya en el ref activo; si la procedencia es `local` no hay URL remota que
  re-descargar → se documenta como no aplicable (la UI de refresh no aplica a portadas locales).

## Validation

- **Main (`node --test` sobre `covers.test.js`)**:
  - Sniff: PNG/JPEG/WEBP/GIF válidos → extensión detectada correcta (aun si el nombre declara otra);
    SVG/texto/binario → rechazado; archivo inexistente → error claro.
  - Cap: archivo mayor a `MAX_COVER_BYTES` → rechazado sin escribir en el cache.
  - Limpieza/reemplazo: vincular local sobre un ref AniList borra el ref y el archivo AniList; vincular
    AniList sobre un ref local borra el ref y el archivo local; re-vincular local reemplaza y borra la
    imagen anterior.
  - Provider-agnóstico: `statusCover` devuelve `provider:'local'` tras un vínculo local; `unlinkCover`
    borra el ref local y su archivo; `coverMap` incluye la URL local; `autoMatchCover` no pisa una
    portada local.
  - Canal: `channelNames()` incluye `cover:local`; `handlers['cover:local']` invoca `linkLocalCover`.
- **Render (`LinkCoverModal.test.jsx`)**:
  - El botón “Buscar en mi PC…” llama a `pickFile` con los filtros de imagen, luego a `coverLocal` y
    notifica `onLinked`/`onClose`.
  - `pickFile` cancelado (null) → no se llama a `coverLocal`.
  - Error de `coverLocal` → mensaje visible.
  - Procedencia: con `status.provider === 'local'` muestra “Portada local”; con AniList, su etiqueta.
  - Thumbnail: con `status.coverUrl` se renderiza una imagen de la portada actual.
- **Gates**: `npm run test:coverage` (main, ≥90%) y `npm run test:renderer:coverage` (≥90%); `npm run
  lint:renderer`; `npm run build:renderer`.
- **Reconciliación de specs**: al archivar, actualizar los requirements de `mangas` (“Portada del manga
  con fallback”, “Referencia externa…”) para reflejar la procedencia y la fuente local; `frontend-web`
  para el botón/estado del modal.
- **Seguridad (`ancleto-security` + revisión manual)**: cap de tamaño, sniff de magic bytes, nombre de
  archivo generado y path de origen acotado al archivo elegido por el usuario.

## Risks

- **Lectura de archivo local disparada por el renderer**: mismo modelo de confianza que `dialog:pick-file`
  (renderer propio, sin contenido remoto); se neutraliza con cap + sniff + nombre generado. `sourcePath`
  solo se **copia** al cache gestionado; nunca se sirve ni se escribe fuera de `<userData>/covers/`.
- **Contenido raro con magic bytes válidos** (p. ej. políglota): el protocolo sirve por extensión; se
  acepta el mismo riesgo que la descarga AniList (que valida por content-type).
- **auto-match vs. portada local**: sin el guarda provider-agnóstico, un auto-match posterior pisaría la
  portada local; por eso `autoMatchCover` entra en el alcance.
- **Compatibilidad**: refs AniList existentes siguen resolviéndose (provider-agnóstico); sin migración.
