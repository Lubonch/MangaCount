# Proposal: Filtros rápidos `/huecos` y `/a-punto`

## Problem

`/pendientes` mezcla todas las series incompletas: las que tienen **huecos** (tomos no consecutivos,
campo `pending`) y las que están **a 1–2 tomos** de completarse. En la comiquería o al decidir qué cerrar
primero no hay una vista rápida de cada caso.

## Proposed change

Dos comandos de consulta sobre los datos actuales (`cantidad`, `total`, `pending`):

1. **`/huecos`**: series del perfil con `pending` **no vacío**; cada línea destaca la nota
   (`Título (cantidad/total) — Nota: <pending>`).
2. **`/a-punto`**: series con `total > 0`, `cantidad < total` y `(total - cantidad) <= 2`.
3. Ambos **paginados** con el sistema del change
   `2026-10-17-bot-pendientes-limitado-y-paginado` (o repartidos en varios mensajes si ese change no
   está).
4. Registrar los comandos y actualizar `/ayuda` (la sección del bot del README se actualiza en
   `2026-10-18-readme-bot-actualizado`, #126).

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: comandos `huecos` y `a-punto` + registro + `/ayuda`.
- Tests de ambos filtros y del paginado.

**Out of scope**

- Cambiar el modelo de `pending`.
- Filtros por editorial/formato (ya cubiertos por `/buscar` y `/pendientes`).

## Risks

- **Dependencia del paginado**: mitigación → si el change de paginación no está, usar el reparto en
  varios mensajes (`splitMessage`) ya disponible.
- **Listas largas**: mitigación → paginación/tope configurable igual que `/pendientes`.
- **Duplicación de lógica de filtros**: mitigación → extraer los filtros a `search.js`
  (`pendingEntries` ya existe) y reusarlos.
