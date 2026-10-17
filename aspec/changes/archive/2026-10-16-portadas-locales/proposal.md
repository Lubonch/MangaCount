# Proposal: Portadas locales (elegir imagen desde el equipo)

> Contexto: derivado de una delegación con rutas citadas del repo (brownfield). Sin seed técnico de
> technical-discovery; el alcance se limita a lo aquí descrito.

## Problem

Al descargar portadas desde AniList hay mangas que **no existen** en AniList, por lo que nunca obtienen
portada. El usuario necesita una forma de **elegir una imagen de su propio equipo** y usarla como portada
del manga.

La infraestructura de portadas ya sirve cualquier archivo del cache `<userData>/covers/` por el protocolo
propio (`mangacount://covers/<file>`), y `saveCoverFile` es genérico (nombre generado `<mangaId>.<ext>`,
sin path traversal). El vínculo externo hoy está fijo a `PROVIDER='anilist'`: `statusCover`, `unlinkCover`
y los guardas de `autoMatchCover` consultan **solo** AniList, y `coverMap` asume un ref por manga.

El nudo: agregar `provider='local'` como **fila adicional** dejaría 2 refs por manga (ambigüedad sobre
cuál es la portada activa). La decisión aprobada (**Opción A**) es **un solo cover activo por manga**,
donde `Provider` registra la **procedencia** (AniList o local). Al vincular (AniList **o** local) se
**borran los otros refs** del manga y sus archivos.

## Proposed change

**A — Portada desde archivo local.**

- Nuevo canal IPC **`cover:local`** (`handlers.js`, `preload.cjs`, adapter `coverLocal(mangaId, sourcePath)`).
- Nuevo `linkLocalCover(db, dataDir, { mangaId, sourcePath })` en `covers.js`:
  - `fs.stat` con **cap de tamaño** (`MAX_COVER_BYTES` = 8 MB) antes de leer.
  - **Sniff de magic bytes** (PNG/JPEG/WEBP/GIF) — **no** confiar en la extensión; guardar la real.
    Rechazar el resto (incluido **SVG**).
  - `saveCoverFile` + upsert del ref `{ provider: 'local', externalId: '', coverFile }`.
  - Borrar la imagen anterior si cambia (igual que `linkCover`).
- **Un solo cover activo**: `linkCover` (AniList) y `linkLocalCover` **borran los otros refs** del manga
  y sus archivos al vincular.
- **Provider-agnósticos**: `statusCover`, `unlinkCover` y `coverMap` dejan de fijar `PROVIDER`; el guarda
  de `autoMatchCover` también (para no pisar una portada local). Sin cambio de esquema.

**B — UI del modal.**

- Botón **“Buscar en mi PC…”** en `LinkCoverModal.jsx` (arriba/junto a la búsqueda), que llama a
  `pickFile([{ name: 'Imágenes', extensions: ['png','jpg','jpeg','webp','gif'] }])` y luego a `coverLocal`.
- El modal refleja la **procedencia** (“Portada local” vs AniList) y muestra un **thumbnail** de la
  portada actual si existe.

## Scope

**In scope**

- `electron/main/ipc/handlers.js`: canal `cover:local`.
- `electron/preload.cjs`: registrar `cover:local` en la lista de canales.
- `mangacount.client/src/api/localAdapter.js`: `coverLocal(mangaId, sourcePath)`.
- `electron/main/services/covers.js`: `linkLocalCover`, sniff de magic bytes, cap de tamaño, limpieza de
  refs previos, lookups provider-agnósticos (`statusCover`, `unlinkCover`, `coverMap`, guarda de
  `autoMatchCover`).
- `mangacount.client/src/components/LinkCoverModal.jsx` + `LinkCoverModal.css`: botón “Buscar en mi PC…”,
  procedencia y thumbnail.
- Tests y gate de cobertura ≥90% (main y renderer).

**Out of scope**

- **Drag & drop** de archivos sobre el modal (mencionado como mejora futura).
- **Bulk**: la carga masiva de portadas faltantes sigue siendo auto-match por AniList.
- **Cambios de esquema** de base de datos (la tabla `MangaExternalRef` es aditiva y se reutiliza).
- Edición/recorte de la imagen elegida (se copia tal cual, validada).

## Risks

- **Nuevo primitivo de lectura de archivo local** disparado por el renderer: mitigado con cap de tamaño,
  sniff de magic bytes y nombre de archivo generado (`<mangaId>.<ext>`); mismo nivel de confianza que el
  canal existente `dialog:pick-file` (renderer propio, sin contenido remoto). No se acepta un path
  arbitrario del cache; el archivo se copia al cache gestionado.
- **Ambigüedad de portada activa**: resuelta con el invariante “un solo cover activo” y limpieza de refs
  previos en cada vínculo.
- **Coexistencia con datos previos**: refs AniList ya existentes siguen funcionando (provider-agnóstico);
  el esquema no cambia, sin migración.
- **Gate de cobertura ≥90%**: el cambio toca lógica de servicio (validación, reemplazo) y render
  (botón/estado); los tests deben cubrir sniff, cap, limpieza y provider-agnóstico.
- **Reconciliación de specs**: la spec `mangas` describe la portada como dependiente del vínculo AniList;
  este change la vuelve provider-agnóstica y agrega la fuente local (delta `MODIFIED`/`ADDED` al archivar).
