# Proposal: Limpieza de código y comentarios innecesarios

## Problem

El código acumuló comentarios en español y en inglés, muchos de los cuales solo repiten lo que hace la
línea siguiente (`// Load publishers`, `// Edit modal states`, banners de sección). Al mismo tiempo hay
comentarios valiosos —invariantes de BD, límites de rate de AniList, particularidades de plataforma,
workarounds— que conviven con el ruido y quedan difíciles de encontrar. También hay restos de código sin
uso (imports/variables, helpers y bloques comentados) que agregaron los cambios de las últimas releases.

El resultado es un archivo más largo de leer, con dos idiomas mezclados y sin una regla clara de cuándo
un comentario aporta.

## Proposed change

Hacer una limpieza **sin cambios de comportamiento** en el código de la app:

- **Eliminar** comentarios que no aportan: los que repiten el nombre de una función/variable o describen
  lo obvio, banners decorativos de sección, y bloques de código comentado.
- **Conservar y traducir al inglés** los comentarios que explican el *por qué*: invariantes de datos,
  migraciones de esquema, límites de APIs externas, workarounds de plataforma, seguridad y decisiones
  no evidentes.
- **Unificar el idioma**: todos los comentarios que queden en el código pasan a inglés. Los textos de
  UI/i18n y la documentación (`README`, `docs/`, `CHANGELOG`) quedan como están.
- **Quitar código muerto verificable**: imports y variables sin uso, helpers sin referencias y bloques
  comentados. Sin refactors, sin renombres y sin cambios funcionales.

El alcance cubre `electron/` (main, preload, servicios, DB, IPC), `shared/` y `mangacount.client/src/`,
más `scripts/` y los archivos de configuración JS/JSX/CJS/CSS versionados.

## Scope

**In scope**

- Comentarios en `electron/**`, `shared/**`, `mangacount.client/src/**`, `scripts/**` y configs
  (`vite.config.js`, `vitest.config.js`, `eslint.config.js`) — incluye tests.
- Traducción al inglés de los comentarios que se conservan.
- Eliminación de imports/variables/helpers sin uso y código comentado.
- Comentarios en CSS de `mangacount.client/src` (se conservan solo los que explican decisiones de diseño).

**Out of scope**

- Cambios de comportamiento, refactors, renombres de APIs o archivos, y actualizaciones de dependencias.
- Cadenas de UI, `shared/i18n/*.js` (son contenido traducible, no comentarios) y documentación Markdown.
- Reescritura masiva de estilo/formato (Prettier, comillas, orden de imports).
- Borrar scripts operativos documentados (`migrate-from-postgres.js`, `sync-pkgbuild-version.mjs`).
- Comentarios del propio flujo aspec (`aspec/**`).

## Risks

- **Borrar un comentario que documenta una decisión no obvia (migración, rate limit, TOCTOU)**:
  mitigación → criterio explícito "si explica por qué, se traduce; si repite qué, se borra" y revisión
  por áreas con el diff a la vista.
- **Introducir un cambio de comportamiento al tocar código muerto**: mitigación → solo se elimina lo
  que no tiene referencias ni efectos; la suite completa y la cobertura ≥90% actúan de red.
- **Diff muy grande y difícil de revisar**: mitigación → tareas por área (main, renderer, shared/config)
  y verificación después de cada una.
- **Traducciones que pierden matices técnicos**: mitigación → conservar términos del dominio
  (`profile`, `entry`, `cover`, `pending`) y revisar que el inglés diga lo mismo que el original.
