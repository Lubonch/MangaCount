# Design: Detección y revisión de duplicados al importar TSV

## Approach

La importación pasa a ser **en dos fases**:

1. **Preview** (`entry:import-preview`): parsea el TSV, detecta candidatos comparando títulos contra los
   mangas existentes y contra las filas anteriores del lote. **No escribe nada**.
2. **Commit** (`entry:import` con `decisions`): vuelve a parsear y detectar, valida que todas las filas
   candidatas tengan una decisión y aplica el import en **una sola transacción**.

La detección es offline y determinista, basada en el título y en tokens numéricos; no depende de AniList.
El usuario resuelve cada candidato con **“Son lo mismo”** o **“No son lo mismo”**. Sin confirmación no
hay escritura.

## Architecture

### Servicio de detección — `electron/main/services/duplicate-detection.js` (nuevo)

Módulo puro, sin acceso a SQLite:

```js
export function normalizeTitle(title)      // NFD, sin acentos, minúsculas, & → and, sin puntuación
export function titleTokens(title)         // tokens significativos (sin stop words)
export function titleSimilarity(a, b)      // { score, reason } | null
export function findBestCandidate(title, candidates)
export function detectDuplicateCandidates(rows, mangas, entriesByManga)
```

Reglas de coincidencia:

- **Exacta normalizada** (score `1`, `reason: 'exact'`): mismo título tras normalizar acentos,
  mayúsculas, puntuación y espacios.
- **Contención de tokens** (score `0.9`, `reason: 'containment'`): todos los tokens significativos del
  título más corto están en el más largo y el corto tiene al menos 4 caracteres. Ejemplo:
  `Kuuga` ⊂ `Kamen Rider Kuuga`.
- **Difusa** (score ≥ `0.86`, `reason: 'fuzzy'`): distancia de Levenshtein normalizada para typos.
- **Guarda numérica**: si los conjuntos de tokens numéricos de ambos títulos difieren, el par **no** es
  candidato. Evita `Parte 1` vs `Parte 2`, `Another` vs `Another 0`, `Battle Royale` vs
  `Battle Royale 2` y `Chainsaw Man` vs `Chainsaw Man 14 Alt`.
- Se devuelve **el mejor candidato por fila** (score, luego diferencia de longitud, luego id). Los
  candidatos de puntaje bajo no se muestran.

Los stop words (`the`, `a`, `el`, `la`, `de`, `of`, `and`, `y`, etc.) se ignoran para la contención y la
similitud, pero el título original se conserva para mostrar en la UI.

### Servicio de import — `electron/main/services/entries.js`

- `parseTsv` se mantiene igual.
- Nueva `previewTsvImport(db, text, profileId)`:

```js
const rows = parseTsv(text, profileId);
const mangas = listMangas(db);
const entries = listEntries(db, profileId);
return { totalRows: rows.length, duplicates: detectDuplicateCandidates(rows, mangas, entries) };
```

- `importTsv(db, text, profileId, decisions = null)`:
  - `decisions === null`: comportamiento actual (match exacto case-insensitive o alta), sin cambios.
  - `decisions` es un arreglo: modo revisión. Se vuelve a detectar; si alguna fila candidata no tiene
    decisión, lanza `err.importDecisionsMissing`; si una decisión es inválida, lanza
    `err.importDecisionInvalid`.
  - Para cada fila, en orden:
    - `same: true` + candidato `existing`: reutiliza `candidate.mangaId`; actualiza formato/editorial si
      difieren (igual que el import actual) y hace `upsertEntry`.
    - `same: true` + candidato `batch`: reutiliza el manga resuelto para la fila candidata (mapa
      `rowIndex → mangaId`), que por construcción es una fila anterior.
    - `same: false`: crea un manga nuevo aunque el título normalizado coincida.
    - Sin decisión (fila sin candidato): `findMangaByName` exacto o alta, como hoy.
  - Devuelve `{ imported, merged, created }`.
  - Todo dentro de `db.transaction`.

### IPC — `electron/main/ipc/handlers.js`

- Nuevo `'entry:import-preview'`: mismas validaciones que `entry:import` (perfil válido, TSV no vacío) y
  devuelve el preview.
- `'entry:import'` acepta `{ profileId, tsv, decisions }`. Si `decisions` es un arreglo se pasa a
  `importTsv`; si no viene, se conserva el comportamiento legacy.
- `channelNames`/`preload.cjs` se actualizan con el canal nuevo.

### Adaptador — `mangacount.client/src/api/localAdapter.js`

```js
export const entryImportPreview = (profileId, tsv) =>
  apiCall('entry:import-preview', `/api/entry/import/preview/${profileId}`, undefined, { profileId, tsv });

export const entryImportCommit = (profileId, tsv, decisions) =>
  apiCall('entry:import', `/api/entry/import/commit/${profileId}`, undefined, { profileId, tsv, decisions });
```

Rutas del shim, antes de la ruta genérica de import:

- `POST /^\/api\/entry\/import\/preview\/(\d+)$/` → `entry:import-preview`
- `POST /^\/api\/entry\/import\/commit\/(\d+)$/` → `entry:import` con `decisions`
- La ruta existente `/api/entry/import/:profileId` sigue disponible para el import directo.

### UI — `SettingsModal.jsx` + `ImportDuplicatesModal.jsx` (nuevo)

- `handleImport` lee el archivo como texto y llama `entryImportPreview`.
  - Sin duplicados: llama `entryImportCommit(..., [])`, muestra el resumen y refresca.
  - Con duplicados: guarda `{ tsv, duplicates }` en estado y abre `ImportDuplicatesModal`.
- `ImportDuplicatesModal` recibe `duplicates`, `onConfirm(decisions)`, `onCancel` y `isCommitting`.
  - Un card por candidato:
    - **En el archivo**: título, comprados/total, formato, editorial, pendiente.
    - **En tu colección**: título, tomos, formato, editorial y entry del perfil si existe (cantidad y
      pendiente).
    - Si el candidato es del lote: “Otra fila del archivo” con su número de fila.
    - Botones mutuamente excluyentes `Son lo mismo` / `No son lo mismo`.
  - Progreso `X de N resueltos`; el botón `Importar` se habilita solo cuando todas las filas tienen
    decisión.
  - `Cancelar` cierra sin escribir y muestra `settings.importCancelled`.
- Al confirmar: `entryImportCommit(profileId, tsv, decisions)`; si falla, se mantiene el modal y se
  muestra el error; si funciona, se cierra y se muestra el resumen
  (`imported`, `merged`, `created`).
- Mientras se previsualiza o se commitea, `isImporting` bloquea el input de archivo.

### i18n — `shared/i18n/es.js` y `en.js`

Claves nuevas bajo `settings.*` (título, intro, origen archivo/colección/lote, botones, progreso,
cancelación, resumen, error) y `err.importDecisionsMissing` / `err.importDecisionInvalid`. Paridad ES/EN
obligatoria (`shared/i18n/i18n.test.js`).

## Validation

- **Detector**: normalización de acentos/puntuación; `Kuuga` vs `Kamen Rider Kuuga` → candidato;
  typo → candidato; `Parte 1` vs `Parte 2`, `Another` vs `Another 0`, `Battle Royale` vs
  `Battle Royale 2` → sin candidato; títulos no relacionados → sin candidato.
- **Preview**: no modifica la base; devuelve `totalRows` y candidatos con `rowIndex`, `source`,
  `candidate` y `reason`.
- **Commit**:
  - `same` con manga existente reutiliza el `MangaId` y no crea otro manga; la entry del perfil se
    actualiza.
  - `same: false` crea un manga nuevo aunque el título normalizado coincida.
  - `same` con candidato del lote reutiliza el manga creado para la fila anterior.
  - Faltar una decisión lanza y no escribe nada (transacción).
  - Sin `decisions`, el import legacy sigue funcionando igual.
- **Renderer**: preview con duplicados muestra el modal; sin duplicados commitea directo; `Importar`
  deshabilitado hasta resolver todo; cancelar no llama al commit; el resumen muestra los conteos.
- **Gates**: `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer` y
  `npm run build:renderer`.
