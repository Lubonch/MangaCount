# Proposal: Blur y badge de portadas +18

> Contexto: change brownfield derivado de una delegación con **rutas citadas del repo**. **Sin seed
> técnico** de `technical-discovery`; el alcance se limita a lo aquí descrito. Depende de
> `2026-10-16-filtrar-portadas-18` (archivado: toggle `showAdultCovers` + badge `+18` en candidatos) y
> se aplica **después** de `2026-10-16-portadas-locales` (provider-agnóstico + `linkLocalCover`), con
> quien comparte `covers.js` y la forma de `coverMap`.

## Problem

El toggle `showAdultCovers` y el **badge `+18`** ya funcionan, pero el **blur** de las miniaturas +18
nunca se implementó (quedó *Out of scope* en `2026-10-16-filtrar-portadas-18`). Hoy el contenido adulto
se ve **nítido** en:

1. los **candidatos** del modal de portada (`LinkCoverModal`), y
2. la **portada de la entry** (`card` de la colección, `CollectionView`).

Para (2) falta además el dato: **no se persiste si la portada vinculada es adulta**.
`MangaExternalRef(Id, MangaId, Provider, ExternalId, CoverFile, UpdatedAt)` **no** tiene `IsAdult`, así
que la colección no puede decidir que debe difuminar la card.

## Proposed change

**A — Persistir el indicador adulto (main).**

- Agregar la columna `IsAdult INTEGER NOT NULL DEFAULT 0` a `MangaExternalRef` en **dos lugares**:
  1. el `CREATE TABLE` de `schema.sqlite.sql` (bases **nuevas**), y
  2. una **migración guardada** en `client.js` (`PRAGMA table_info` → si falta la columna,
     `ALTER TABLE … ADD COLUMN`), subiendo `SCHEMA_VERSION` **3 → 4** (bases **existentes**).
- `IsAdult` viaja en el DTO y en `upsertRef`; `linkCover` guarda `candidate.isAdult` (**true/false**) y
  `linkLocalCover` guarda `false`. Las portadas ya vinculadas quedan en `0` (**sin backfill**: no se
  re-consulta AniList).

**B — Forma de `coverMap` (main).**

- `coverMap(db)` pasa de `{ [mangaId]: 'url' }` a `{ [mangaId]: { url, isAdult } }`, manteniéndose
  provider-agnóstico. Actualizar sus consumidores: **CollectionView** (cards), el **bulk** de
  **SettingsModal** (`covers[manga.id]` → `covers[manga.id]?.url`) y los tests.

**C — UX de blur + reveal (renderer).**

- **Blur +18 siempre**, independiente del toggle de búsqueda: en los **candidatos** de
  `LinkCoverModal` y en la **card-cover** de la colección.
- **Reveal**: **hover** (momentáneo) cuando `showAdultCovers` está **ON**; **click** (revela y queda)
  cuando está **OFF**. El renderer lee el pref por IPC (`app:config-get`) y lo refresca al cerrar
  Settings.

## Scope

**In scope**

- `electron/main/db/schema.sqlite.sql`, `electron/main/db/client.js` (migración v4),
  `electron/main/db/repositories/manga-external-refs.js` (DTO/`upsertRef`), `electron/main/services/covers.js`
  (`linkCover`/`linkLocalCover`/`coverMap`), tests main.
- `mangacount.client/src/components/CollectionView.jsx` (+ `.css`: `.card-cover--adult` con
  `filter: blur(...)` y variantes hover/click), `LinkCoverModal.jsx` (+ `.css`), la plomería del pref y
  tests del renderer.
- Capabilities: delta en **`mangas`** (persistencia + forma de `coverMap`) y en **`frontend-web`**
  (blur/reveal + uso del pref).
- Gate de cobertura ≥90% (main y renderer) y lint.

**Out of scope**

- `table`/`compact` (no muestran portada); **bulk** (sigue auto-match); **backfill** de portadas viejas;
  drag & drop; cambios en la búsqueda/filtro (el `isAdult` de AniList ya se resuelve).

## Risks

- **Primer `ALTER`/migración no aditiva del proyecto**: hasta ahora el esquema fue “aditivo, sin
  `ALTER`”. Mitigado: la migración es **idempotente** (`PRAGMA table_info` antes del `ALTER`) y agrega
  la columna con **default `0`**, por lo que ningún registro queda nulo y no se pierde dato.
- **Portadas viejas quedan “no adultas”**: al no re-consultar AniList, una portada +18 vinculada antes
  de este change no se difumina hasta re-vincularse. Limitación aceptada (sin backfill).
- **Cambio de forma de `coverMap`**: rompe silenciosamente a cualquier consumidor que trate el valor como
  string (p. ej. el bulk de SettingsModal usa la URL como *truthy*). Mitigado: actualizar los tres
  consumidores y sus tests en el mismo change.
- **Interacción con `2026-10-16-portadas-locales`**: ambos tocan `covers.js`/`coverMap`; este change va
  **después** para no reescribir su delta. Aplicar sobre el estado con esa change ya integrada.
- **Pref desactualizado en el renderer**: si no se refresca al cerrar Settings, el modo de reveal queda
  viejo hasta recargar. Mitigado: `App` recarga la preferencia al cerrar Settings.
- **Gate de cobertura ≥90%**: la migración, el nuevo DTO y las ramas de reveal deben quedar cubiertos.
