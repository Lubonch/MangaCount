# Proposal: Actualizar el README (sección del Bot de Discord y recomendaciones)

## Problem

La sección **Bot de Discord (opcional)** del `README.md` quedó desactualizada: no refleja los comandos
nuevos (`/huecos`, `/a-punto`, `/stats`, `/status`, `/backup`) ni las mejoras de UX (autocomplete,
paginación con botones, modales precargados, botones de acción en `/buscar`). Tampoco documenta los
ajustes del bot en Settings. Además, el README está **solo en español**, cuando el idioma por defecto
de la app es inglés (#118).

La sección de recomendaciones también quedó vieja: el issue #127 dejó de ser "reranking opcional con el
servidor local de opencode" y pasó a **recomendaciones dinámicas con AniList + feedback del usuario**,
que es lo que hay que documentar.

## Proposed change

Actualizar el README **en ambos idiomas** (`README.md` en inglés —default— y `README.es.md` en español,
cross-linkeados) para documentar:

- **Comandos de consulta**: los existentes más `/huecos`, `/a-punto`, `/stats`, `/status`.
- **Edición y administración**: los existentes más `/backup`.
- **UX**: autocomplete de series, paginación con botones en los listados largos, modal precargado de
  `pending` y botones de acción rápida en `/buscar`.
- **Ajustes del bot** en Settings: habilitado, guild, allowlist, límite/página, respuestas efímeras,
  TTL de confirmación y recomendaciones por defecto.
- **Recomendaciones (#127)**: el motor local como fallback y las **recomendaciones dinámicas desde
  AniList** (sin API key), el feedback del usuario (**"Ya lo tengo"** / **"No viable"**), la lista de
  10 con relleno, el botón de refresco y la memoria de "ya visto"; más los ajustes (`enabled`,
  `limit`, `seenTtlDays`).

**No** se documentan #119 (mergeado en #116) ni #125 (`/eliminar`, `/portada`: desestimado).

## Scope

**In scope**

- `README.md` (EN) y `README.es.md` (ES) con la misma estructura, badges y aviso de idioma arriba.
- Sección del bot (comandos, UX y ajustes), sección de recomendaciones (AniList + feedback) y mención
  del idioma de la app (ES/EN, default EN).
- Referencias cruzadas a los issues/changes correspondientes.

**Out of scope**

- Traducir `docs/desktop.md` y `CHANGELOG.md` (quedan en español).
- Documentar comandos no implementados (#125) ni el mergeado (#119).
- Traducir el nombre de los comandos de Discord (fuera de alcance de #118).

## Risks

- **Documentar algo no implementado**: mitigación → actualizar al final de la release, cuando todos los
  comandos y el recomendador estén en `main`.
- **Divergencia entre ambos README**: mitigación → misma estructura y un aviso de idioma arriba;
  revisar los dos en el mismo commit.
- **Divergencia con el código**: mitigación → la lista de comandos se verifica contra
  `discord-bot.js` y los ajustes contra `prefs.bot` / `prefs.recommendations`.
- **Duplicación con `docs/desktop.md`**: mitigación → el README lleva la lista de comandos; `desktop.md`
  el detalle operativo.
