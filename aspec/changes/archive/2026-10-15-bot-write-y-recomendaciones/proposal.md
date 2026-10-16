# Proposal: Bot de Discord — escritura de colección, `/pendientes` detallado y recomendaciones robustas

> Incluye, además, un **ajuste visual** en la UI de colección para las series sin total de tomos
> (no relacionado con el bot, agregado a pedido para hacerlo en un solo change).

## Problem

Probando el bot de Discord (solo consulta) aparecieron tres cosas:

- **`/recomendar` siempre dice *"No pude inferir tu mercado local con suficiente confianza"***, aunque la
  colección tenga muchas series cargadas. Con la base real (123 entries, 25 de ellas de `ivrea`) el
  motor **sí** infiere `Argentina` y devuelve items, así que no es la data: es un bug del bot. El
  handler llama a `getRecommendations(...)` (que es **`async`**) **sin `await`**, así que `response` es
  una `Promise`; `!response?.isConfident` da `true` (`undefined`) y el bot SIEMPRE responde el mensaje
  de "sin confianza". Confirmado en `electron/main/services/discord-bot.js` (`recomendar`, sin `await`).
- Aparte (bug latente, no la causa de lo anterior): el bot recuerda el **perfil activo por usuario en
  memoria** (`session.profileId`) y ese id puede quedar **viejo** tras una Nuclear Option / restore
  (los perfiles se re-siembran con ids nuevos) → el bot leería una colección vacía. Es la misma clase
  de bug que ya se corrigió para el import (`requireProfileExists`), pero el bot no lo valida.
- La inferencia de mercado es **frágil por la data**: `shared/recommendations/publisher-countries.json`
  tiene **9 claves** y no matchea nombres reales (`"ovni"` ≠ `"ovni press"`; `Yen On`, `Viz Media`,
  `Glenat`, `Abduccion` y 92 `Unknown` quedan sin país). Hoy toda la confianza cuelga de `ivrea`.
- **`/pendientes` no muestra los detalles importantes**: la UI muestra `Pending` (`entry.pending`, los
  tomos no consecutivos), prioridad, formato y editorial; el bot solo da `título: cantidad/total (faltan N)`.
- **No hay forma de escribir desde Discord.** El objetivo original dejaba `/actualizar` diferido, pero
  el seam ya existe (`registro nombre → función`) y la app ya hace el caso “+1 volumen” vía
  `entry:upsert` (`CollectionView.jsx` → `POST /api/entry`).

## Proposed change

### 1. `/recomendar` (await) y sesión de perfil válida

- **Fix del `await`**: el handler de `/recomendar` SHALL `await` `getRecommendations(...)` antes de
  leer `isConfident`/`inferredCountry`/`items`. Se agrega un test que lo cubra (hoy la suite no testea
  `/recomendar`).
- **Sesión válida**: al usar un comando, el bot SHALL validar que el **perfil de sesión** exista; si no
  existe (base re-sembrada), SHALL responder pidiendo elegir el perfil con `/perfil` (o auto-seleccionar
  si hay uno solo). Mismo criterio que `requireProfileExists` del import.

### 2. `/pendientes` detallado

Cada línea SHALL incluir lo que hoy falta: prioridad, `cantidad/total`, cuántos faltan, el campo
**`pending`** (tomos no consecutivos, p. ej. `5,7`), formato y editorial cuando existan. Con muchas
series, SHALL acotar/paginar la salida (límite de líneas de Discord).

### 3. Recomendaciones robustas

- **Engrosar `publisher-countries.json`** con aliases y editoriales faltantes (mínimo: `ovni`,
  `yen on`, `viz media`, `glenat`, `abduccion`, `ivrea`, panini, etc.), y decidir explícitamente qué
  hace `Unknown` (hoy no suma a ningún país).
- Cuando **no** hay confianza, el bot SHALL mostrar el **breakdown** (país → nº de series/volúmenes y
  cuántas sin país) para que el usuario sepa qué cargar y por qué falló.
- (Opcional, si se aprueba) **override manual del mercado** en Settings (forzar país), para no depender
  de las editoriales.

### 4. Comandos de escritura (`nuevo`, `tomo`, `actualizar`, `pending`, `prioridad`)

Se agrega escritura reusando los handlers existentes (`manga:upsert`, `entry:upsert`) sobre la misma
conexión, con **confirmación** y **desambiguación** de títulos.

**Modelo de `/nuevo` (decisión):** crea el **Manga** (con `totalVolumes`, formato y editorial) **y** el
**Entry** con `quantity` 0 por defecto; luego el avance se hace con `/tomo` (+1) o `/actualizar`
(fijar cantidad). Opcionalmente acepta `cantidad` en el mismo paso para no obligar a dos comandos.

Propuesta de firma:

```
/nuevo     titulo:<str> [total:<n>] [cantidad:<m>] [formato:<str>] [editorial:<str>]
/tomo      titulo:<str>                    → +1 volumen (como el botón "+1" de la UI)
/actualizar titulo:<str> cantidad:<n>      → fija la cantidad
/pending   titulo:<str> tomos:<str>        → setea el campo pending (p. ej. "5,7")
/prioridad titulo:<str>                    → toggle de prioridad
/ayuda                                     → lista de comandos
```

### 5. Series sin total de tomos: mostrar `owned / ??` (y arreglar el `0` que dibuja React)

**Comportamiento deseado**:

- Serie **con total** (`manga.volumes > 0`): `owned / total` + barra + `%` (como hoy).
- Serie **sin total** (`manga.volumes` 0/null, típico de series en publicación): `owned / ??`, **sin**
  barra ni porcentaje. El `??` comunica "total desconocido" en vez de ocultarlo o mostrar `0`.

**Causa del bug actual**: los bloques de total/barra/% y el botón `+1` se montan con
`{entry.manga.volumes && (…)}`; con `manga.volumes === 0`, la expresión `0 && (…)` **devuelve `0`** y
**React renderiza ese `0` como texto**, dejando ceros sueltos (`Owned: 9  0` y un `0` antes de
*Edit Entry*). El porcentaje tiene el mismo problema: `{completionPercent && …}` con `0` renderiza `0`
en vez de `0%`.

**Fix**:

- Sufijo del total con ternario: `{entry.manga.volumes > 0 ? ` / ${entry.manga.volumes}` : ' / ??'}`.
- Barra de progreso y botón `+1` solo cuando `entry.manga.volumes > 0`.
- Porcentaje solo cuando `completionPercent !== null` (así un `0` legítimo muestra `0%`).

Lugares: tabla (`CollectionView.jsx:266,268,279,297`), compacta (`:343,345,351,363`), cards
(`:408,431`) y `AddEntryModal.jsx:150,177`.

## Scope

In scope:
- **Fix del `await`** en `/recomendar` del bot (`getRecommendations` es `async`) + test de regresión.
- Validación del `session.profileId` del bot en todos los comandos (perfil inexistente → pedir
  `/perfil`; auto-selección si hay un único perfil).
- `/pendientes` con prioridad, `pending`, formato y editorial; límite/paginado de salida.
- Engrosar `publisher-countries.json` (aliases + editoriales) y regla para `Unknown`.
- Breakdown en la respuesta de `/recomendar` cuando no hay confianza.
- Comandos de escritura `/nuevo`, `/tomo`, `/actualizar`, `/pending`, `/prioridad` y `/ayuda`,
  reusando `manga:upsert` / `entry:upsert` con confirmación y desambiguación.
- Tests del despacho, del `await` de `/recomendar`, de la creación manga+entry, de la desambiguación,
  de la validación de sesión y del formato de `/pendientes`.
- **Ajuste visual** en `CollectionView.jsx` (3 vistas) y `AddEntryModal.jsx`: las series **sin total**
  muestran `owned / ??` (sin barra ni `%`) y se corrige el `0` que React dibuja al usar un flag
  numérico como condición (ver punto 5).
- Tests de render: una entry con `manga.volumes === 0` muestra `owned / ??` y **ningún** `0` suelto ni
  `0` en la columna de porcentaje, en tabla, compacta y cards.
- Documentación (`README.md` sección Bot: comandos de escritura y permisos) y `CHANGELOG`.
Out of scope:

- Escritura **masiva** desde Discord (import TSV por Discord) y borrado de mangas/entries.
- Comando `ping` y comandos de moderación/administración.
- Reranking remoto de recomendaciones (`providers = []` se mantiene).
- Sincronización a la nube / API HTTP (la app sigue local-first).
- Cambiar el motor de recomendaciones (`shared/recommendations`): solo se amplía la **data** del mapa de
  editoriales y se expone el breakdown.
- Override manual de mercado (se propone como opcional; si se aprueba, entra en un change aparte).

## Risks

- **Escritura desde Discord sin confirmación** podría actualizar la entry equivocada. Mitigación:
  pedir confirmación explícita (patrón “¿Confirmás?” del bot de WhatsApp) y/o exigir `confirm`.
- **Desambiguación de títulos**: puede haber varios matches (p. ej. “Berserk” vs “Berserk Max”).
  Mitigación: si hay más de un match, devolver un menú de selección (componentes de Discord) en vez de
  elegir por el usuario.
- **Sesión de perfil vieja** sigue afectando comandos de lectura y escritura. Mitigación: la validación
  del punto 1 se aplica a todos los comandos (lectura y escritura).
- **Permisos**: hoy la allowlist es de lectura; ampliarla a escritura sin decisión. Mitigación: decidir
  si la escritura queda restringida al dueño (ver “Decisiones pendientes”).
- **Crear formatos/editoriales basura** al usar `/nuevo`. Mitigación: reusar `getOrCreate` del import
  (normaliza a `Unknown` cuando falta) y documentar.
- **Mapa de editoriales incompleto**: asignar país a una editorial ambigua puede sesgar el mercado.
  Mitigación: revisar el mapa con el usuario; dejar `null`/`Unknown` fuera (no asumir país).
- **Largo de las respuestas de Discord** (2000 chars). Mitigación: límite/paginado en `/pendientes` y
  `/buscar`.

## Decisiones pendientes

- **¿Quién puede escribir?** Solo el dueño (un `bot.writeAllowedUserIds`, opcional) o cualquiera de la
  allowlist actual. El proposal asume **cualquiera de la allowlist** hasta que se decida lo contrario.
- **¿`/nuevo` exige `total`?** La cantidad total alimenta “faltan” y “completo”. Se propone **opcional**
  (default 0 = total desconocido).
- **¿Override manual de mercado?** Incluirlo aquí o en un change aparte.
- **Normalización de `Unknown`**: excluir del conteo (actual) o mapear a un país cuando la editorial es
  inferible por otras señales.
