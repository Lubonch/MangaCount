# Design: Prioridad solo en series incompletas

## Approach

La prioridad pasa de ser un flag independiente a estar **subordinada a la completitud**. La
completitud sigue derivándose de `manga.volumes` y `entry.quantity` (sin usar `Entry.IsComplete`).

La regla se aplica en la **capa de datos**, que es el único punto por el que pasan el renderer, el bot y
la importación TSV:

1. **Lectura**: `mapRow` devuelve `priority: false` cuando `volumes > 0 && quantity >= volumes`.
2. **Escritura**: `upsertEntry`/`updateEntry` persisten `IsPriority = 0` cuando la entry queda completa.
3. **Cambio de total del manga**: `updateManga` limpia las prioridades de las entries que pasaron a
   estar completas.
4. **Datos existentes**: migración `v7` limpia las prioridades ya persistidas de series completas.

Renderer y bot mantienen un guard local como defensa (una entry completa nunca se pinta ni se propone
como prioridad), pero no son la fuente de verdad.

## Architecture

### Repositorio de entries — `electron/main/db/repositories/entries.js`

- Helper único de completitud:

```js
const isComplete = (quantity, volumes) => volumes > 0 && quantity >= volumes;
```

- `mapRow(r)`: `priority: !!r.priority && !isComplete(r.quantity, r.manga_volumes)`.
- `effectivePriority(db, { mangaId, quantity, priority })`: si `priority` es falso devuelve `false`; si
  es verdadero consulta `Manga.TotalVolumes` y devuelve `!isComplete(quantity, volumes)`. Una serie sin
  total (`volumes === 0`) conserva la prioridad.
- `upsertEntry` y `updateEntry` usan `effectivePriority` antes de escribir `IsPriority`.
- Nueva función exportada:

```js
export function clearCompletedPriority(db, mangaId, volumes) {
  if (!(volumes > 0)) return;
  db.prepare(
    `UPDATE Entry SET IsPriority = 0
     WHERE MangaId = ? AND IsPriority = 1 AND PurchasedVolumes >= ?`
  ).run(mangaId, volumes);
}
```

### Repositorio de mangas — `electron/main/db/repositories/mangas.js`

`updateManga` calcula `const total = safeVolumes(volumes)`, actualiza el manga y llama
`clearCompletedPriority(db, id, total)`. No se toca `createManga` (todavía no hay entries).

### Migración — `electron/main/db/client.js`

- `SCHEMA_VERSION = 7` con comentario del cambio.
- Dentro de `if (version < SCHEMA_VERSION)`, después de los `ensureColumn`/backfill existentes y de forma
  idempotente:

```sql
UPDATE Entry SET IsPriority = 0
WHERE IsPriority = 1
  AND EXISTS (
    SELECT 1 FROM Manga m
    WHERE m.Id = Entry.MangaId
      AND m.TotalVolumes > 0
      AND Entry.PurchasedVolumes >= m.TotalVolumes
  )
```

Solo afecta entries completas con prioridad; no toca cantidades, pendientes ni series sin total.

### Renderer — `CollectionView.jsx`

- Helpers locales `isCompleteEntry(entry)` y `isPriorityEntry(entry) = entry.priority && !isCompleteEntry(entry)`.
- `getEntryStatus` usa `isCompleteEntry`.
- Filtro `case 'priority'`: `return isPriorityEntry(entry)`.
- Orden `case 'priority'`: `Number(isPriorityEntry(b)) - Number(isPriorityEntry(a))`.
- Reemplazar los cuatro renders de `entry.priority` (tabla, compact, cover y badge) por
  `isPriorityEntry(entry)`.
- `getStatusCounts` ya cuenta `priority-incomplete`, así que no cambia.

### Renderer — `AddEntryModal.jsx`

- Derivar el manga seleccionado (`mangas.find(...)` en creación, `editEntry.manga` en edición) y su
  `volumes`.
- `isCompleteSelection = volumes > 0 && parseInt(quantity) >= volumes`.
- Checkbox de prioridad: `disabled={isCompleteSelection}`, `checked={formData.priority && !isCompleteSelection}`
  y texto de ayuda con la clave `addEntry.priorityComplete`.
- En el submit, `priority: isCompleteSelection ? false : formData.priority` (además de la garantía del
  backend).

### Bot — `electron/main/services/discord-bot.js`

- `formatEntryLine`: el prefijo ⭐ solo se agrega si `entry.priority && !entryStatus(entry).complete`.
- `commands.prioridad`: si `entryStatus(e).complete`, responde `bot.priorityComplete` con el nombre y no
  arma propuesta de escritura.
- `applyWrite` / `togglePriority`: si la entry está completa, devuelve un summary con
  `bot.priorityComplete` y **no** llama a `entry:upsert`.
- El botón `[⭐ Prioridad]` de `/buscar` sigue existiendo, pero en una serie completa responde que no
  aplica y no escribe.

### i18n — `shared/i18n/es.js` y `en.js`

- `addEntry.priorityComplete`: "Serie completa: la prioridad no aplica." / "Complete series: priority does
  not apply."
- `bot.priorityComplete`: "Serie completa: la prioridad no aplica." / "Complete series: priority does not
  apply."
- Paridad ES/EN obligatoria (`shared/i18n/i18n.test.js`).

## Validation

- **Repositorio**: completar con prioridad deja `priority === false` en la respuesta y en la fila;
  serie incompleta conserva prioridad; serie sin total conserva prioridad.
- **Migración**: una DB `v6` con una entry completa prioritaria y otra incompleta prioritaria queda con
  la primera en `false` y la segunda intacta; `user_version` pasa a `7`.
- **Manga**: subir `TotalVolumes` hasta completar una entry con prioridad la deja sin prioridad; bajarlo
  o dejarlo en `0` no la restaura.
- **Entry status/export**: `entry:list` y el TSV exportan `False` para series completas.
- **Renderer**: una entry completa con `priority: true` no muestra badges, no aparece en el filtro
  "Priority Only", no encabeza el orden por prioridad y el modal deshabilita el checkbox.
- **Bot**: `/buscar` no muestra ⭐ en una serie completa; `/prioridad` y el botón responden que no
  aplica; `applyWrite` no escribe.
- **Gates**: `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer` y
  `npm run build:renderer`.
