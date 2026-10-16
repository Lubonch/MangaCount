# Design: Bot de Discord — escritura, `/pendientes` detallado, recomendaciones robustas y visual de series sin total

## Approach

Extender el bot (que ya reutiliza la conexión `db` y los handlers puros) con **escritura**, corregir
el **perfil de sesión**, mejorar las **respuestas** de lectura y arreglar un bug de render en la UI.
Sin infraestructura nueva: se reusan `manga:upsert` / `entry:upsert` y `shared/recommendations`.

1. **Fix de `/recomendar` + sesión de perfil válida.** El handler de `/recomendar` llama a
   `getRecommendations(...)` —que es **`async`**— **sin `await`**: `response` queda como `Promise`,
   `response.isConfident` es `undefined` y el bot responde **siempre** el mensaje de "sin confianza".
   Se agrega `await` y un test de regresión. Además, el bot guarda el perfil activo por usuario en
   memoria; se agrega `resolveSessionProfile(session, db)` que, antes de operar, confirma que el
   `profileId` siga existiendo; si no, responde pidiendo `/perfil` (o auto-selecciona si hay uno solo).
   Se aplica a **todos** los comandos (lectura y escritura). Cierra el caso “perfil viejo tras Nuclear
   Option / restore”.
2. **`/pendientes` detallado.** Cada línea agrega `pending` (tomos no consecutivos), formato y
   editorial, y marca prioridad; se acota la salida (límite de líneas) para respetar los 2000 chars
   de Discord.
3. **Recomendaciones robustas.** `services/recommendations.js` ya recibe `inference` (con breakdown)
   del motor pero lo descarta en `toResponse`: se propaga `inference` y `blockedByImportCount`. El bot
   usa el breakdown para explicar el fallo. Además se **engrosa** `publisher-countries.json` (aliases
   y editoriales faltantes) para que la inferencia no cuelgue de una sola editorial.
4. **Comandos de escritura.** Se agrega un registro de escritura que reusa los handlers existentes;
   las operaciones destructivas se **confirman** con botones (Confirmar/Cancelar), la resolución de
   título es **explícita** (si hay más de un match, no adivina) y cada escritura se **loguea**.
5. **Visual de series sin total.** En `CollectionView.jsx` (tabla/compact/cards) y `AddEntryModal.jsx`
   se reemplazan los flags numéricos como condición de render: las series sin total muestran
   `owned / ??` y se elimina el `0` suelto que React dibujaba.

## Architecture (bot)

```text
discord-bot.js
├── createCommands({ db })
│   ├── /perfil · /buscar · /pendientes · /recomendar      (lectura, existentes)
│   ├── /tomo        → propone { action:'setQuantity', quantity: q+1 }
│   ├── /actualizar  → propone { action:'setQuantity', quantity: n }
│   ├── /pending     → propone { action:'setPending', pending: "5,7" }
│   ├── /prioridad   → propone { action:'togglePriority' }
│   ├── /nuevo       → propone { action:'createMangaEntry', total, cantidad, formato, editorial }
│   └── /ayuda       → texto
├── resolveSessionProfile(session, db)  ← NUEVO: valida/auto-selecciona el perfil
├── applyWrite(db, action)              ← NUEVO: ejecuta la acción sobre handlers (entry:upsert / manga:upsert)
└── interacción:
      comando de lectura → reply(texto)
      comando de escritura → reply efímero con resumen + botones [Confirmar|Cancelar]
                              (customId = token del pending en la sesión)
                              on button → isAuthorized → applyWrite → reply "hecho: <cambio>"
```

### Resolución de la entry objetivo

```text
título ──▶ entradas del perfil activo ──▶ match case-insensitive por nombre
   ├── 0 matches  → "no encontré X" (+ sugerencias, reusa search.js)
   ├── 1 match    → continúa
   └── >1 matches → "encontré varias: … / usá /perfil o el título exacto"  (NO adivina)
```

`/nuevo` es la excepción: crea el Manga (o reusa el existente por nombre) y un Entry.

### Escritura (reuso de handlers)

```text
applyWrite(db, action):
  setQuantity      → entry:upsert({ id, ...entry, quantity })
  setPending       → entry:upsert({ id, ...entry, pending })
  togglePriority   → entry:upsert({ id, ...entry, priority: !entry.priority })
  createMangaEntry → manga:upsert({ name, volumes: total ?? 0, formatId, publisherId })
                     + entry:upsert({ mangaId, profileId, quantity: cantidad ?? 0 })
```

- **Formato/editorial**: `getOrCreate` sobre `format:list`/`format:create` y `publisher:list`/
  `publisher:create`; ausente → `Unknown` (mismo criterio que el import).
- **Perfil inválido**: `entry:upsert` ya valida (`requireProfileExists`); el bot valida antes igual.

### Confirmación

Cada escritura responde **efímero** con el resumen (`*Berserk*: 40 → 41`) y botones
**Confirmar**/**Cancelar**. El `pending` (acción + args + un token) vive en la sesión del usuario y
se descarta al confirmar/cancelar o por timeout. Sin confirmar, no se escribe nada.

### Recomendaciones (breakdown)

`toResponse` agrega:

```jsonc
{ "provider", "inferredCountry", "isConfident", "availableCount", "items", "limit",
  "blockedByImportCount": 12,
  "inference": { "country", "isConfident", "breakdown": [ { "country", "volumeCount", "seriesCount", "publishers" } ] } }
```

El bot, cuando `!isConfident`, responde con el **breakdown**: países detectados (series/volúmenes),
cuántas series sin país (`Unknown`/no mapeadas) y qué cargar. `blockedByImportCount` sigue en el
mensaje de éxito.

### Visual (`owned / ??`)

```text
serie con total:  Owned: 1 / 26   [====----] 4%
serie sin total:  Owned: 9 / ??              (sin barra ni %)
```

Guards: `entry.manga.volumes > 0` para total/barra/`+1`; `completionPercent !== null` para el `%`.
Reemplaza `entry.manga.volumes && …` (que con `0` devuelve `0` y React lo dibuja).

## Reuse map

| Capacidad | Fuente |
|---|---|
| Listar entries del perfil | `listEntries(db, profileId)` / `handlers['entry:list']` |
| Escribir entry | `handlers['entry:upsert']` (`upsertEntry`/`updateEntry`) |
| Crear/actualizar manga | `handlers['manga:upsert']` (`saveOrUpdateManga`) |
| Catálogos format/editorial | `handlers['format:*']` / `handlers['publisher:*']` |
| Búsqueda/sugerencias | `services/search.js` (`searchResult`) |
| Recomendaciones + breakdown | `getRecommendations(db, profileId, limit)` (propagar `inference`) |
| Mapa editorial→país | `shared/recommendations/publisher-countries.json` |
| Logging | `services/logger.js` (ctx.logger) |

## Validation

- **Sesión**: con un `profileId` que ya no existe, cualquier comando pide `/perfil`; con un solo
  perfil, se auto-selecciona.
- **`/recomendar`**: espera (`await`) el resultado y devuelve las recomendaciones cuando el mercado es
  confiable (test de regresión contra el `await` faltante).
- **`/pendientes`**: muestra `pending`/formato/editorial; no supera el límite de caracteres.
- **`/recomendar`** sin confianza: muestra el breakdown (países + series sin país).
- **`/nuevo`**: crea Manga + Entry (quantity 0 por defecto); no duplica el Manga si ya existe;
  editoriales vacías → `Unknown`.
- **`/tomo`**: +1 sobre el match único; con 0 o >1 matches no escribe y explica.
- **Confirmación**: sin confirmar no hay escritura; cancelar/timeout descarta el `pending`.
- **Autorización**: guild/user fuera de la allowlist no recibe respuesta (ni lee ni escribe).
- **Visual**: entry con `manga.volumes === 0` muestra `owned / ??` y **ningún** `0` suelto ni `0%`
  incorrecto en tabla/compact/cards.
- **Tests**: `node --test` (despacho, resolución de título, `applyWrite`, sesión, breakdown,
  mapa de editoriales) sin conexión real a Discord; `vitest` para las 3 vistas con `volumes` 0 y para
  el porcentaje `0`.
