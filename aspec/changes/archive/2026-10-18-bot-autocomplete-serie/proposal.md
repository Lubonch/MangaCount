# Proposal: Autocomplete del parámetro de serie en el bot

## Problem

Para usar `/buscar`, `/tomo`, `/pending`, `/prioridad` o `/actualizar` hay que **tipear el título exacto**
de la serie. Con colecciones grandes es fácil errarle (y el bot responde que no la encontró).

## Proposed change

Agregar **autocomplete** al parámetro `titulo`/`serie` de los comandos que lo usan:

1. Responder a `interaction.isAutocomplete()` con hasta **25 opciones** de títulos de mangas que
   matcheen el texto tipeado (case-insensitive, por prefijo/contiene), tomadas de la biblioteca del
   perfil activo.
2. Marcar el parámetro como autocompletable en la definición de cada slash command.
3. Si no hay perfil activo o no hay coincidencias, responder con lista vacía (sin error).

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: `handleInteraction` maneja `isAutocomplete()`, helper de
  opciones y definiciones de comando con `setAutocomplete(true)`.
- Tests: matching, límite de 25, sin perfil activo y sin coincidencias.

**Out of scope**

- Autocomplete de perfiles u otros parámetros.
- Cacheo persistente del catálogo (se lee la biblioteca en memoria, ya disponible).

## Risks

- **Límite de 25 opciones** de Discord: mitigación → recortar y priorizar coincidencias por prefijo.
- **Respuesta lenta** (>3 s invalida el autocomplete): mitigación → usar la lista ya cargada en memoria,
  sin consultas a la red.
- **Títulos duplicados**: mitigación → `value` = nombre; Discord admite duplicados de nombre (se elige el
  que resuelve el comando).
