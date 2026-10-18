# Proposal: Actualizar el README (sección del Bot de Discord y recomendaciones)

## Problem

La sección **Bot de Discord (opcional)** del `README.md` quedó desactualizada: no refleja los comandos
nuevos ni las mejoras de UX (autocomplete, paginación, modales, botones, ajustes en Settings). Además,
el issue #127 agrega el recomendador opcional con el servidor local de opencode, que también debe
quedar documentado.

## Proposed change

Actualizar el README **en ambos idiomas** (`README.md` en inglés —default— y `README.es.md` en español,
cross-linkeados) para documentar:

- **Comandos de consulta**: los existentes más `/huecos`, `/a-punto`, `/stats`, `/status`.
- **Edición y administración**: los existentes más `/backup`.
- **UX**: autocomplete de series, paginación con botones en los listados largos, modales precargados de
  `pending` y botones de acción rápida en `/buscar`.
- **Ajustes del bot** en Settings: límite/página, respuestas efímeras, TTL de confirmación y
  recomendaciones por defecto.
- **Recomendaciones (#127)**: la sección de recomendaciones y el **reranking opcional con el servidor
  local de opencode** (`opencode serve`, `http://127.0.0.1:4096`), el toggle y el botón **Probar
  conexión** en Settings, y que sin servidor configurado o ante error se usa el motor local.

**No** se documentan #119 (mergeado en #116) ni #125 (`/eliminar`, `/portada`: desestimado). El
recomendador con opencode (#127) queda como referencia cruzada al change
`2026-10-18-recomendador-opencode`.

## Scope

**In scope**

- `README.md`: sección del bot (comandos, UX y ajustes), sección de recomendaciones con el reranking
  opcional de opencode (#127) y, si aplica, `docs/desktop.md`.
- Referencias cruzadas a los issues/changes correspondientes.

**Out of scope**

- Traducir `docs/desktop.md` y `CHANGELOG.md` (quedan en español).
- Documentar comandos no implementados.

## Risks

- **Documentar algo no implementado**: mitigación → actualizar al final de la release, cuando los
  comandos estén en `main`.
- **Duplicación con `docs/desktop.md`**: mitigación → el README lleva la lista de comandos; `desktop.md`
  el detalle operativo.
- **Divergencia con la i18n**: mitigación → si el change bilingüe entra en la misma release, la sección
  debe actualizarse en `README.md` (EN) y `README.es.md` (ES).
- **Documentar el recomendador opencode (#127) antes de que exista**: mitigación → documentarlo recién
  cuando el change `2026-10-18-recomendador-opencode` esté en la release; hasta entonces, dejarlo como
  referencia cruzada.
