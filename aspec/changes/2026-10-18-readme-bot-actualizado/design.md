# Design: Sección del bot en el README

## Approach

- Reescribir la sección **Bot de Discord (opcional)** con: requisitos, invitación del bot, configuración
  en Settings (token, guild, allowlist, límites y ajustes), y **tablas de comandos** de consulta,
  edición y administración.
- Agregar un apartado **UX del bot** (autocomplete, paginación, modales, botones) y una nota del flag +18
  (spoiler de Discord).
- Mantener el aviso de que cada usuario usa su propio bot.

## Architecture

Solo documentación: `README.md` (EN, default) + `README.es.md` (ES), con un aviso arriba
(`Read this in: [English](README.md) · [Español](README.es.md)`), misma estructura y badges; y
`docs/desktop.md` si hace falta.

## Validation

- La lista de comandos coincide **exactamente** con los registrados en `discord-bot.js`.
- Los ajustes documentados coinciden con `prefs.bot` (límite/página, efímeras, TTL, recomendaciones).
- No se documentan comandos desestimados (#125) ni el mergeado (#119).
- Si el change bilingüe entra en la release, ambos README quedan consistentes.
