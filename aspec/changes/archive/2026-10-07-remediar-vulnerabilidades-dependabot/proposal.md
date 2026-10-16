# Proposal: Remediación de vulnerabilidades high/critical de Dependabot

## Problem

El repositorio tiene alertas de Dependabot **sin atender y sin proceso de remediación ni de
prevención**. Al no poder consultar la API de alertas en este entorno (requiere auth; no hay
`gh` ni token), se levantó el mismo dato con `npm audit` sobre los lockfiles versionados, que
consulta la base de advisories (GHSA) que usa Dependabot:

- **Root (Electron main)**: 9 vulnerabilidades (1 high, 8 moderate). Todas cuelgan del
  tooling de empaquetado `electron-builder`. El código que se distribuye (`better-sqlite3`,
  `electron`) no está flaggeado.
- **mangacount.client (renderer)**: 16 vulnerabilidades (9 high, 5 moderate, 2 low). Todas en
  `devDependencies` (build/test: Vite, Vitest, ESLint, jsdom/Babel/PostCSS). El runtime
  (`react`, `react-dom`) no está flaggeado.

Aunque hoy ninguna de las vulnerabilidades high está en código de producción ni es explotable
remotamente (son build/test tooling), se acumulan, no hay revisión sistemática y no hay
ninguna barrera que impida que entren más. `WhatsappBot/` queda excluido: lo remueve otro
change en curso (y hoy no tiene lockfile auditable).

## Proposed change

Remediar **solo las vulnerabilidades `high` (y `critical`, hoy 0)** de los dos lockfiles
activos, con cambios mínimos y dentro del mismo major, y agregar las barreras para que no
vuelvan a entrar:

1. **Root**: la única `high` es `http-cache-semantics` (transitiva de `electron-builder` vía
   `@electron/get`). Se fija con `overrides` a `^4.3.0`. La cadena `electron-builder` no tiene
   fix estable (26.15.3 es la última y sigue en rango), así que sus moderate se aceptan fuera
   de alcance.
2. **Client**: bump de la directa `vite` (7.3.2 → `^7.3.5`) y `overrides` para las transitivas
   high (`brace-expansion@1`, `browserslist`, `form-data`, `js-yaml@4`, `nanoid@3`, `postcss`,
   `source-map-js`, `ws`).
3. **Prevención**: `.github/dependabot.yml` para los ecosistemas `npm` en `/` y
   `/mangacount.client` (schedule semanal, PRs agrupados) y un gate de CI
   `npm audit --audit-level=high` para ambos lockfiles.

La verificación de cierre es determinista: `npm audit --audit-level=high` debe salir con
exit code 0 (0 high/critical) en root y en client, con build, lint y tests en verde.

## Scope

In scope:
- `package.json` / `package-lock.json` de root: `overrides` de `http-cache-semantics` (`^4.3.0`).
- `mangacount.client/package.json` / `package-lock.json`: bump de `vite` a `^7.3.5` y
  `overrides` para las transitivas high: `brace-expansion` (línea 1.x → `^1.1.21`),
  `browserslist` (`^4.29.3`), `form-data` (`^4.0.6`), `js-yaml` (línea 4.x → `^4.3.2`),
  `nanoid` (línea 3.x → `^3.3.20`), `postcss` (`^8.5.29`), `source-map-js` (`^1.2.2`),
  `ws` (`^8.22.0`).
- Regeneración de ambos lockfiles y verificación `npm audit --audit-level=high` limpio.
- `vite.config.js` / configuración: sin cambios salvo que un bump lo requiera (no esperado).
- `.github/dependabot.yml` (nuevo) y, opcional, un job/step de audit en CI.
- `CHANGELOG.md` de root con la entrada de la remediación.
- Documentar el mapa de remediación y la fuente (`npm audit`) en el `design.md` del change.

Out of scope:
- Vulnerabilidades **moderate y low**: client 5 moderate + 2 low; root 8 moderate. Se
  documentan pero no se remedian en este change.
- `WhatsappBot/`: lo elimina otro change; no se audita, no se le crea lockfile, no se abre
  PR de Dependabot sobre ese directorio.
- Upgrade **major** de `electron-builder` (27.x) o de `vite`/`vitest` (8.x/5.x): innecesario y
  de mayor riesgo.
- Dismiss de alertas en GitHub: se resuelven bajando la versión, no silenciando.
- Cambios de comportamiento funcional o de contrato: no hay ninguno; no hay specs de producto
  afectadas (por eso este change no incluye `specs/`).

## Risks

- Los `overrides` fuerzan versiones que algún padre no declara, rompiendo la resolución o los
  peer deps: mitigación con versiones minor/patch **dentro de la misma línea** que ya resuelve
  el árbol, y verificación con `npm ci` + build + lint + tests.
- `npm audit fix` aplica cambios amplios y difíciles de revisar: mitigación evitándolo como
  mecanismo principal; se usan overrides explícitos y se revisa el diff de cada lockfile.
- Un override de una transitiva compartida por varias ramas (p. ej. `postcss`, `ws`) puede
  afectar paquetes distantes: mitigación verificando que `npm ls <pkg>` no reporte árboles
  inválidos y corriendo la suite completa.
- `electron-builder` sigue con moderate (sin fix estable) y podría disparar alertas nuevas:
  mitigación acotando el gate de CI a `--audit-level=high` y dejando la decisión de 27.x para
  un change futuro.
- Deriva entre lo que reporta `npm audit` y las alertas reales de Dependabot: mitigación
  registrando la fuente y el método en `design.md`, y revalidando contra la pestaña de
  Dependabot al cerrar (acceso con credenciales del usuario).
