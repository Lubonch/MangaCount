# Proposal: Actualizar la sección del Bot de Discord en el README

## Problem

La sección **Bot de Discord (opcional)** del `README.md` quedó desactualizada: no refleja los comandos
nuevos ni las mejoras de UX (autocomplete, paginación, modales, botones, ajustes en Settings).

## Proposed change

Actualizar `README.md` (y `docs/desktop.md` si corresponde) para documentar:

- **Comandos de consulta**: los existentes más `/huecos`, `/a-punto`, `/stats`, `/status`.
- **Edición y administración**: los existentes más `/backup`.
- **UX**: autocomplete de series, paginación con botones en los listados largos, modales precargados de
  `pending` y botones de acción rápida en `/buscar`.
- **Ajustes del bot** en Settings: límite/página, respuestas efímeras, TTL de confirmación y
  recomendaciones por defecto.

**No** se documentan #119 (mergeado en #116) ni #125 (`/eliminar`, `/portada`: desestimado).

## Scope

**In scope**

- `README.md`: sección del bot (comandos, UX y ajustes) y, si aplica, `docs/desktop.md`.
- Referencias cruzadas a los issues/changes correspondientes.

**Out of scope**

- Traducción del README (va en `2026-10-17-app-bilingue-es-en`).
- Documentar comandos no implementados.

## Risks

- **Documentar algo no implementado**: mitigación → actualizar al final de la release, cuando los
  comandos estén en `main`.
- **Duplicación con `docs/desktop.md`**: mitigación → el README lleva la lista de comandos; `desktop.md`
  el detalle operativo.
- **Divergencia con la i18n**: mitigación → si el change bilingüe entra en la misma release, la sección
  debe actualizarse en `README.md` (EN) y `README.es.md` (ES).
