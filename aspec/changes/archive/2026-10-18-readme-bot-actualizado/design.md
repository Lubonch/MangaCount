# Design: README del bot y recomendaciones

## Approach

- `README.md` pasa a **inglés** (idioma por defecto de la app) y `README.es.md` conserva el **español**,
  con la misma estructura, los mismos badges y un aviso arriba:
  `Read this in: [English](README.md) · [Español](README.es.md)`.
- Reescribir la sección **Discord bot (optional)** / **Bot de Discord (opcional)** con: requisitos,
  invitación del bot, configuración en Settings (token, guild, allowlist, límites y ajustes) y
  **tablas de comandos** de consulta, edición y administración.
- Agregar un apartado de **UX del bot** (autocomplete, paginación con botones, modal de `pending`,
  botones de acción en `/buscar`, respuestas efímeras, TTL de confirmación) y la nota del flag +18
  (spoiler de Discord).
- Documentar la sección **Recommendations / Recomendaciones** (#127): el motor local como fallback y
  las recomendaciones dinámicas desde **AniList** (sin API key) con el feedback del usuario.

## Architecture

Solo documentación: `README.md` (EN, default) + `README.es.md` (ES), cross-linkeados, misma estructura
y badges. No se toca `docs/desktop.md` salvo que el detalle del bot quede desactualizado ahí (queda en
español, fuera de alcance).

## Validation

- La lista de comandos coincide **exactamente** con los registrados en
  `electron/main/services/discord-bot.js` (`perfil`, `buscar`, `pendientes`, `huecos`, `a-punto`,
  `recomendar`, `tomo`, `actualizar`, `pending`, `prioridad`, `nuevo`, `stats`, `backup`, `status`,
  `ayuda`).
- Los ajustes documentados coinciden con `prefs.bot` (`pendingLimitEnabled`, `pendingLimit` 1–500
  default 20, `ephemeralReplies` default false, `confirmTtlMinutes` 1–60 default 5, `recommendLimit`
  1–10 default 5) y con `prefs.recommendations` (`enabled` default true, `limit` 1–25 default 10,
  `seenTtlDays` 1–365 default 30).
- Lo documentado de recomendaciones coincide con el comportamiento real: AniList como fuente, motor
  local como fallback, y el feedback ("Ya lo tengo" / "No viable") con la memoria de "ya visto".
- No se documentan comandos desestimados (#125) ni el mergeado (#119).
- Ambos README quedan consistentes entre sí.
