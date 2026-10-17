# Design: Blur y badge de portadas +18

> Sin seed técnico de `technical-discovery`; derivado de una delegación con rutas citadas del repo.

## Approach

Tres piezas con un límite claro: **main persiste y sirve el dato**, **renderer lo pinta y revela**.

1. **Persistencia (`IsAdult`)** en `MangaExternalRef`, con migración de esquema **v3 → v4**.
2. **`coverMap`** pasa de `string` a `{ url, isAdult }` para llevar el indicador a las cards sin una
   llamada por manga.
3. **Blur + reveal** en el renderer: el blur es **siempre**; la preferencia `showAdultCovers` decide
   **cómo** se revela (hover vs click).

## Migración v4 (primer `ALTER` no aditivo del proyecto)

Hasta ahora el esquema evolucionó solo por **adición de tablas** (`CREATE TABLE IF NOT EXISTS`, sin
`ALTER`) y `user_version` se usaba como sello. Cambiar la **forma** de una tabla existente obliga al
primer paso no aditivo. Se resuelve en **dos lugares** para que ambos caminos converjan:

- **Base nueva**: el `CREATE TABLE IF NOT EXISTS MangaExternalRef` de `schema.sqlite.sql` incluye la
  columna.
- **Base existente**: al abrir con `user_version < 4`, `client.js` aplica un helper idempotente:

```
function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
```

Flujo en `openDb`:

```
if (version < SCHEMA_VERSION) {          // SCHEMA_VERSION = 4
  db.exec(schema);                       // idempotente: crea lo que falte
  ensureColumn(db, 'MangaExternalRef', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0');
  db.pragma('user_version = 4');
}
```

**Por qué es seguro**: (i) el `CREATE TABLE IF NOT EXISTS` no toca filas existentes; (ii) `ensureColumn`
verifica `PRAGMA table_info` y **no** re-ejecuta el `ALTER` si la columna ya existe (idempotente, aunque
`user_version` se hubiera quedado atrás); (iii) `DEFAULT 0` con `NOT NULL` completa las filas existentes
sin nulos y sin pérdida de dato; (iv) no hay `DROP`/rename. Las portadas ya vinculadas quedan en `0`
(no adulto) → **sin backfill** (no se re-consulta AniList).

## `coverMap`: de string a `{ url, isAdult }`

```
antes:  { [mangaId]: 'mangacount://covers/<file>' }
después:{ [mangaId]: { url: 'mangacount://covers/<file>', isAdult: boolean } }
```

`coverMap(db)` sigue iterando `listRefs()` sin fijar provider (provider-agnóstico, ya resuelto por
`2026-10-16-portadas-locales`); el invariante “un solo ref por manga” da una sola entrada por `mangaId`.
El indicador se toma del `ref.isAdult` del vínculo activo.

Consumidores a actualizar:

- **CollectionView** (cards): `coverMap[id]` → `coverMap[id]?.url` (render) y `coverMap[id]?.isAdult`
  (blur). `handleCoverLinked` recibe ahora el objeto (`{ url, isAdult }`) o `null` al desvincular.
- **SettingsModal** (bulk “Traer portadas faltantes”): `!covers[manga.id]` → `!covers[manga.id]?.url`
  (la URL sigue funcionando como *truthy*, pero se explicita para no depender de la forma).
- **Tests**: `covers.test.js` (`coverMap(db)[id]` → `.url`).

## Blur + reveal (renderer)

Blur **siempre** para +18 (independiente del toggle de búsqueda). El toggle solo cambia el **modo** de
revelado:

| Preferencia `showAdultCovers` | Reveal                                                  |
|-------------------------------|---------------------------------------------------------|
| ON                            | **hover** (momentáneo: revela al entrar, difumina al salir) |
| OFF                           | **click** (revela y **queda** revelado hasta deshacer / cambiar de vista) |

CSS (sobre tokens, sin valores de color hardcodeados):

- Card: `.card-cover--adult .card-cover-img { filter: blur(12px); }`; revelado con
  `.card-cover--revealed .card-cover-img { filter: none; }` y, en modo hover,
  `.card-cover--reveal-hover:hover .card-cover-img { filter: none; }`.
- Candidato: mismo criterio sobre `.cover-candidate--adult img` / `--revealed`.
- Badge `+18` reutiliza el estilo existente de `.cover-candidate-adult` (candidatos) y una variante para
  la card. Respetar `prefers-reduced-motion` para cualquier transición del blur.

**Interacción**: la card es clickeable (abre/edita) → el click de reveal debe convivir con eso: el reveal
por click consume el evento para el toggle (p. ej. `stopPropagation` + estado `revealed`), mientras que
las acciones reales siguen accesibles.

## Plomería de la preferencia

`App` es el dueño del pref (ya llama `appConfigGet` para `updateCheck`):

```
App  ── appConfigGet() ─► showAdultCovers (state)
  ├─► CollectionView  prop showAdultCovers   (cards: reveal hover/click)
  └─► Sidebar         prop showAdultCovers   (► LinkCoverModal: reveal de candidatos)
SettingsModal.onClose ─► App recarga appConfigGet() y actualiza el state
```

Así el modo de revelado se refresca al cerrar Settings **sin recargar la app**. `LinkCoverModal` se
renderiza dentro de `Sidebar`, por lo que el pref baja por ahí (o el modal lo lee directamente si se
prefiere acotar el acople; se documenta la opción elegida en la implementación).

## Archivos

- **Main — modificar**: `electron/main/db/schema.sqlite.sql` (columna en `CREATE TABLE`),
  `electron/main/db/client.js` (`ensureColumn` + `SCHEMA_VERSION = 4` + migración),
  `electron/main/db/repositories/manga-external-refs.js` (`SELECT` DTO + `upsertRef`),
  `electron/main/services/covers.js` (`linkCover`/`linkLocalCover` guardan `isAdult`; `coverMap` nueva
  forma).
- **Renderer — modificar**: `mangacount.client/src/App.jsx` (pref + fresh al cerrar Settings),
  `mangacount.client/src/components/CollectionView.jsx` + `CollectionView.css`,
  `mangacount.client/src/components/LinkCoverModal.jsx` + `LinkCoverModal.css`,
  `mangacount.client/src/components/Sidebar.jsx` (pasa el pref al modal).
- **Tests — modificar/agregar**: `electron/main/db` (migración v3→v4 y base nueva),
  `electron/main/services/covers.test.js`, `mangacount.client/src/test/components/CollectionView.test.jsx`,
  `.../LinkCoverModal.test.jsx`, `.../App.test.jsx`/`Sidebar.test.jsx` (prop).
- **NO tocar**: `table`/`compact`; el bulk (sigue auto-match); la búsqueda/filtro `isAdult`; el protocolo
  `mangacount://covers/`.

## Validation

- **Main (`node --test`)**:
  - Migración: abrir una base **v3** (sin `IsAdult`) → la columna se agrega, `user_version` = 4, las filas
    existentes quedan en `0`; reabrir (idempotencia) no falla. Base **nueva** → la tabla ya trae la
    columna.
  - Ref/DTO: `upsertRef` guarda y devuelve `isAdult`; `linkCover` persiste `candidate.isAdult`
    (true y false); `linkLocalCover` persiste `false`.
  - `coverMap`: devuelve `{ url, isAdult }` por manga, con el indicador del vínculo activo.
- **Render**:
  - CollectionView: card con `coverMap[id].isAdult` true → clase de blur + badge `+18`; false → sin blur
    ni badge; reveal por hover con pref ON, por click con pref OFF.
  - LinkCoverModal: candidato `isAdult` → miniatura difuminada con badge, con el pref ON **y** OFF.
  - App/Sidebar: el pref se lee al montar y se refresca al cerrar Settings.
- **Gates**: `npm run test:coverage` (main, ≥90%) y `npm run test:renderer:coverage` (≥90%);
  `npm run lint:renderer`; `npm run build:renderer`.

## Risks

- Ver riesgos en `proposal.md`. El más relevante es la **migración v4** (mitigada por idempotencia +
  `DEFAULT 0`) y el **cambio de forma de `coverMap`** (mitigado actualizando los tres consumidores y sus
  tests en el mismo change).
