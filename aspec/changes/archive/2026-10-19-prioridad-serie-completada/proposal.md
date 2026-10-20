# Proposal: Prioridad solo en series incompletas

## Problem

La prioridad es un flag persistido por entry (`Entry.IsPriority`) y la completitud se deriva de
`quantity >= manga.volumes`. Al completar una serie, el flag **no se limpia** y varias superficies lo
siguen mostrando como prioridad:

- `CollectionView` pinta los badges ⚡/⭐ y permite filtrar por `priority` sin excluir las series
  completas (`filter === 'priority'` devuelve `entry.priority` a secas) y ordena por prioridad con el
  mismo criterio.
- El modal de edición permite mantener o marcar prioridad en una entry completa.
- El bot de Discord prefija ⭐ en `/buscar`, permite alternar la prioridad y la exporta como `True`.
- La exportación TSV y cualquier consumidor de `entry:list` reciben `priority: true` en una serie
  completa.

El resultado no tiene sentido para el usuario: una serie terminada ya no es una compra prioritaria y
sigue apareciendo como tal, incluso después de reiniciar la aplicación porque el flag está en SQLite.

## Proposed change

- **Invariante de dominio**: una serie **solo** puede estar marcada como prioridad mientras esté
  incompleta. "Completa" es la definición existente: `manga.volumes > 0 && quantity >= volumes`. Una
  serie sin total conocido (`volumes === 0`) sigue siendo incompleta y puede ser prioridad.
- **Cumplimiento en la capa de datos** (no solo visual):
  - Al leer entries, `priority` se expone como `false` si la serie está completa (defensa para datos
    viejos o escrituras externas).
  - Al crear/actualizar una entry, si la serie queda completa la prioridad se persiste en `false`.
  - Al cambiar el total de tomos de un manga, se limpia la prioridad de las entries que quedaron
    completas.
  - Migración de esquema `v7`: limpia `IsPriority` de las entries ya completas en instalaciones
    existentes.
- **Interfaz**: los badges, el filtro "Priority Only", el orden por prioridad y el modal de entry
  ignoran la prioridad de las series completas; el checkbox de prioridad se deshabilita cuando la
  cantidad alcanza el total y las claves i18n lo explican.
- **Bot de Discord**: `/buscar` no muestra ⭐ en series completas, `/prioridad` y el botón de prioridad
  responden que no aplica (sin escribir) y no se ofrece activarla; i18n ES/EN con paridad.

## Scope

**In scope**

- `electron/main/db/repositories/entries.js`: normalización de prioridad en lectura/escritura y limpieza
  por manga.
- `electron/main/db/repositories/mangas.js`: limpieza al cambiar `TotalVolumes`.
- `electron/main/db/client.js`: `SCHEMA_VERSION = 7` y migración de limpieza de datos existentes.
- `mangacount.client/src/components/CollectionView.jsx`: badges, filtro, conteo y orden.
- `mangacount.client/src/components/AddEntryModal.jsx`: control de prioridad deshabilitado en series
  completas.
- `electron/main/services/discord-bot.js`: guardas en `/buscar`, `/prioridad`, botón y `applyWrite`.
- Claves i18n en `shared/i18n/es.js` y `en.js`.
- Tests de repositorio, migración, handlers, bot, renderer e i18n.

**Out of scope**

- Cambiar la definición de "completa" (sigue derivada de `quantity`/`volumes`; `Entry.IsComplete` no se
  usa).
- Eliminar la columna, el filtro, el orden o la exportación de prioridad.
- Recalcular o restaurar prioridades automáticamente si una serie vuelve a quedar incompleta.
- Cambiar el formato del TSV o el modelo de datos.
- Prioridad por perfil distinta de la ya existente.

## Risks

- **Datos existentes**: la migración apaga prioridades de series ya completas; es irreversible y
  intencional. Mitigación: solo toca entries completas con `IsPriority = 1`, el resto no cambia.
- **Serie que se vuelve incompleta**: si luego se sube el total o se baja la cantidad, la prioridad
  limpiada no revive. Mitigación: es el comportamiento pedido ("una vez completada ya no es
  prioridad"); el usuario puede volver a marcarla manualmente.
- **Tests que asumían ⭐ en series completas**: hay expectativas en `discord-bot.test.js` que deben
  actualizarse al nuevo invariante. Mitigación: cubrir explícitamente el caso completo con tests nuevos.
- **Doble fuente de verdad de la completitud**: renderer, bot y base calculan lo mismo. Mitigación:
  centralizar en la capa de datos y mantener guards locales solo como defensa.
