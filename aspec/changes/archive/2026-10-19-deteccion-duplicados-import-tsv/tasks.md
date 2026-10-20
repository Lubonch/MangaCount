# Tasks: Detección y revisión de duplicados al importar TSV

## Fase 1 — Detector de duplicados

- [x] 1.1 Crear `electron/main/services/duplicate-detection.js` con `normalizeTitle`, `titleTokens` y
      `titleSimilarity` (exacta, contención de tokens, Levenshtein ≥ 0.86, guarda de tokens numéricos).
- [x] 1.2 Implementar `findBestCandidate` y `detectDuplicateCandidates(rows, mangas, entriesByManga)`:
      comparar contra mangas existentes y contra filas anteriores del lote, devolviendo un candidato por
      fila con `rowIndex`, `source`, `candidate`, `score` y `reason`.
- [x] 1.3 Tests unitarios del detector: acentos/puntuación, `Kuuga`/`Kamen Rider Kuuga`, typo, guarda
      numérica (`Parte 1`/`Parte 2`, `Another`/`Another 0`, `Battle Royale`/`Battle Royale 2`) y títulos
      no relacionados.

## Fase 2 — Servicio de import y preview

- [x] 2.1 Agregar `previewTsvImport(db, text, profileId)` en `electron/main/services/entries.js` usando
      `parseTsv`, `listMangas`, `listEntries` y el detector; no debe escribir.
- [x] 2.2 Extender `importTsv(db, text, profileId, decisions = null)`:
      - modo legacy con `decisions === null`;
      - modo revisión con validación de decisiones completas;
      - resolución `same` a manga existente o a fila anterior del lote;
      - `same: false` crea manga nuevo;
      - devolver `{ imported, merged, created }` dentro de una transacción.
- [x] 2.3 Tests del servicio: preview sin escritura, `same` existente, `same: false`, `same` con
      candidato del lote, decisión faltante sin escritura y legacy intacto.

## Fase 3 — IPC y adaptador

- [x] 3.1 Agregar `'entry:import-preview'` en `electron/main/ipc/handlers.js` con las validaciones de
      perfil/TSV y registrar el canal en `channelNames`/`electron/preload.cjs`.
- [x] 3.2 Extender `'entry:import'` para aceptar `decisions` y pasarlas a `importTsv`.
- [x] 3.3 Agregar `entryImportPreview` y `entryImportCommit` en
      `mangacount.client/src/api/localAdapter.js`, con las rutas
      `/api/entry/import/preview/:profileId` y `/api/entry/import/commit/:profileId` antes de la ruta
      genérica de import.
- [x] 3.4 Tests de handlers y del adaptador: preview válido, perfil inválido, TSV vacío, commit con
      decisiones y ruta legacy.

## Fase 4 — Pantalla de revisión

- [x] 4.1 Crear `mangacount.client/src/components/ImportDuplicatesModal.jsx` con un card por candidato,
      metadatos de la fila y del manga/entry candidato, botones “Son lo mismo”/“No son lo mismo” y
      progreso de resolución.
- [x] 4.2 Integrar el flujo en `SettingsModal.jsx`: preview al elegir archivo, commit directo si no hay
      duplicados, apertura del modal si los hay, commit con decisiones, cancelación sin escritura y
      resumen final con `imported`/`merged`/`created`.
- [x] 4.3 Estilos del modal y de los cards en `SettingsModal.css` (o CSS propio del componente) usando
      design tokens y sin romper el layout del modal de Settings.
- [x] 4.4 Tests de `ImportDuplicatesModal` (selección, confirmación deshabilitada hasta resolver todo,
      cancelar) y de `SettingsModal` (preview con/sin duplicados, commit con decisiones y cancelación).

## Fase 5 — i18n y verificación

- [x] 5.1 Agregar todas las claves nuevas en `shared/i18n/es.js` y `en.js` (título, intro, origen,
      botones, progreso, cancelación, resumen y errores).
- [x] 5.2 Verificar paridad ES/EN (`shared/i18n/i18n.test.js`).
- [x] 5.3 `npm test`
- [x] 5.4 `npm run test:renderer:coverage`
- [x] 5.5 `npm run lint:renderer`
- [x] 5.6 `npm run build:renderer`
