# Tasks: Bot de Discord — escritura, `/pendientes` detallado, recomendaciones robustas y visual de series sin total

## Fase 1 — Fix de `/recomendar`, sesión de perfil y escritura base

- [x] `await getRecommendations(...)` en `/recomendar` del bot (hoy sin `await`: la `Promise` hacía que
      siempre respondiera el mensaje de "sin confianza") + test de regresión
- [x] `resolveSessionProfile(session, db)` en `discord-bot.js`: si `session.profileId` no existe en la
      base → error claro "Volvé a elegir un perfil con /perfil"; si no hay perfil y hay **uno solo**,
      auto-seleccionarlo
- [x] Aplicar `resolveSessionProfile` a **todos** los comandos (lectura y escritura)
- [x] `applyWrite(db, action)` reusando `handlers['entry:upsert']` / `handlers['manga:upsert']`
      (`setQuantity`, `setPending`, `togglePriority`, `createMangaEntry`)
- [x] Tests: perfil inexistente → pide `/perfil`; auto-selección con un único perfil; `applyWrite` por acción

## Fase 2 — `/pendientes` detallado

- [x] Incluir `pending`, formato y editorial en cada línea; mantener prioridad y `cantidad/total (faltan N)`
- [x] Acotar la salida (límite de líneas / paginado) para respetar los 2000 chars de Discord
- [x] Tests del formato (con y sin `pending`/formato/editorial; muchas series → recorta)

## Fase 3 — Recomendaciones robustas

- [x] `services/recommendations.js`: `toResponse` propaga `inference` (breakdown) y `blockedByImportCount`
- [x] Bot: cuando `!isConfident`, responder con el **breakdown** (países con series/volúmenes y series
      sin país) y qué cargar
- [x] Engrosar `shared/recommendations/publisher-countries.json`: aliases (`ovni` → Argentina, etc.) y
      editoriales faltantes (Yen On, Viz Media, Glenat, …); decidir `Unknown` (queda fuera)
- [x] Tests: breakdown presente/ausente; mapa matchea aliases; `blockedByImportCount` en el mensaje

## Fase 4 — Comandos de escritura

- [x] Registro de comandos: `/tomo`, `/actualizar`, `/pending`, `/prioridad`, `/nuevo`, `/ayuda`
- [x] Resolución de título: 0 matches → sugerencias (`search.js`); >1 → lista y no adivina
- [x] `/nuevo`: crea **Manga** (`total` opcional, formato/editorial vía `getOrCreate`) **y** **Entry**
      con `quantity` 0 (o `cantidad` si se pasa); no duplica el Manga existente
- [x] Confirmación: respuesta efímera con resumen + botones **Confirmar**/**Cancelar**; `pending` en sesión
      (token + timeout); sin confirmar no escribe
- [x] Autorización de escritura (misma allowlist); loguear cada escritura en `ctx.logger`
- [x] Tests del despacho, de `createMangaEntry`, de la desambiguación y del flujo confirmar/cancelar
      (con interactions mockeadas, sin conexión real a Discord)

## Fase 5 — Visual de series sin total (`owned / ??`)

- [x] `CollectionView.jsx` (tabla, compacta, cards): sufijo `entry.manga.volumes > 0 ? ' / N' : ' / ??'`
- [x] Barra y botón `+1` solo con `entry.manga.volumes > 0`; porcentaje solo con `completionPercent !== null`
- [x] `AddEntryModal.jsx`: mismos guards booleanos (evitar el `0` de `volumes && …`)
- [x] Tests `vitest`: entry con `volumes === 0` → `owned / ??` y sin `0` suelto ni `0%` incorrecto;
      porcentaje `0` legítimo → `0%`

## Fase 6 — Documentación y cierre

- [x] `README.md` (sección Bot): comandos de lectura y **escritura**, permisos y confirmación
- [x] `CHANGELOG.md`
- [x] `npm run release:sync` no aplica (no hay release en este change); verificar `npm test` y `vitest`
- [x] Verificación cruzada contra proposal (qué), design (cómo) y delta specs de este change
