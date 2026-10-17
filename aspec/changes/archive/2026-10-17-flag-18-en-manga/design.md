# Design: Flag +18 en la entidad manga

## Approach

`Manga.IsAdult` pasa a ser la **única fuente de verdad** del indicador para la UI. El vínculo de
portada deja de decidir el blur (aunque `MangaExternalRef.IsAdult` se conserva como dato del vínculo).

1. **Esquema (v4 → v5)**:

   - `schema.sqlite.sql`: `IsAdult INTEGER NOT NULL DEFAULT 0` en `CREATE TABLE Manga` (bases nuevas).
   - `client.js`: `SCHEMA_VERSION = 5`; `ensureColumn(db, 'Manga', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0')`
     y backfill:
     ```sql
     UPDATE Manga SET IsAdult = 1
     WHERE Id IN (SELECT MangaId FROM MangaExternalRef WHERE IsAdult = 1)
     ```
     Idempotente: el `UPDATE` re-aplicado no cambia nada.

2. **Repositorio / servicio**:

   - `mangas.js`: `SELECT … IsAdult AS isAdult`; `createManga`/`updateManga` escriben `isAdult ? 1 : 0`.
   - `catalog-base.saveOrUpdateManga`: propaga `isAdult` (default `false`).

3. **Vínculo de portada (`covers.js`)**:

   - `linkCover` (usado por `cover:link` y auto-match): además de guardar el ref como hoy, si
     `candidate.isAdult === true` **promueve** `Manga.IsAdult = true`. No lo apaga nunca.
   - `linkLocalCover`: no toca `Manga.IsAdult` (lo controla el usuario).
   - `coverMap(db)`: sigue devolviendo `{ url, isAdult }`, pero `isAdult` sale de `Manga.IsAdult`
     (JOIN con Manga) y no del ref.

4. **Renderer**:

   - `AddMangaModal`: checkbox **“Contenido +18”** en alta y edición; prellena desde `editManga.isAdult`
     y lo envía en el payload de `manga:upsert`.
   - `CollectionView`: sin cambios; sigue leyendo `coverMap[mangaId].isAdult`.

## Architecture

```
AddMangaModal (checkbox +18)
   └─ manga:upsert { isAdult } ──► saveOrUpdateManga ──► Manga.IsAdult (SQLite)
                                                            │
cover:link / auto-match ──► linkCover ──► promueve IsAdult ─┘
                                                            │
coverMap(db) ──► { url, isAdult: Manga.IsAdult } ──► CollectionView (blur + badge)
```

Archivos:

- **Modificar**: `electron/main/db/schema.sqlite.sql`, `electron/main/db/client.js`,
  `electron/main/db/repositories/mangas.js`, `electron/main/services/catalog-base.js`,
  `electron/main/services/covers.js`, `mangacount.client/src/components/AddMangaModal.jsx`.
- **Tests**: `electron/main/db/client.test.js` (o equivalente de migración),
  `electron/main/db/repositories/repositories.test.js`, `electron/main/services/covers.test.js`,
  `electron/main/services/catalog-base` (si existe su test),
  `mangacount.client/src/test/components/AddMangaModal.test.jsx`.
- **Sin cambios**: `CollectionView.jsx` (la forma del mapa no cambia), `MangaExternalRef` (columna
  legacy), TSV.

## Validation

- **Migración**: base v4 con un manga cuyo ref tiene `IsAdult = 1` → al abrir queda `Manga.IsAdult = 1`;
  un manga sin ref +18 queda en 0; re-ejecutar la migración no falla.
- **DTO**: `listMangas`/`getMangaById` incluyen `isAdult`; `createManga`/`updateManga` lo persisten.
- **Automático**: vincular un candidato `isAdult: true` deja `Manga.IsAdult = true`; vincular uno no
  adulto no lo apaga.
- **Manual**: el checkbox del modal viaja en `manga:upsert` y se refleja al reabrir la edición.
- **UI**: una entry cuya portada no es adulta pero cuyo manga está marcado +18 se difumina con badge.
- **Gates**: `npm test`, `npm run test:coverage` (main ≥90%), `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
