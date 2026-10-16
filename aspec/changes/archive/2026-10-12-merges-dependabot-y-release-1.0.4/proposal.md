# Proposal: Completar los merges de Dependabot y publicar el release 1.0.4

## Problem

Tras el release 1.0.3 (tag `v1.0.3`) quedaron abiertos en `main` cuatro PRs de Dependabot
(creados el 2026-10-11), todos `MERGEABLE`/`CLEAN` pero **sin verificación real**: el único gate
de CI sobre PRs es `npm audit --audit-level=high` (`.github/workflows/audit.yml`), que no corre
build, lint ni tests. Un check en verde no dice nada sobre si estos bumps rompen la app.

- **#55** — root (Electron main): `electron` `^44.5.1` → `^44.7.0` (minor).
- **#56** — `mangacount.client`: `vite` `^7.3.5` → `^8.3.4` (**major**; Vite 8 pasa a Rolldown).
- **#57** — `mangacount.client`: `jsdom` `^25.0.1` → `^30.1.2` (**5 majors**; es el entorno de test).
- **#58** — `mangacount.client`: `@vitejs/plugin-react` `^4.6.0` → `^6.1.2` (**2 majors**).

Hay un **acoplamiento de peer deps** que impide mergear #56 y #58 por separado:

```
@vitejs/plugin-react 4.6.0  peers → vite ^4 || ^5 || ^6 || ^7   ← main hoy
@vitejs/plugin-react 6.1.2  peers → vite ^8.0.0                  ← exige vite 8
```

- #58 solo → plugin-react 6 con vite 7 → peer incompatible, `main` roto.
- #56 solo → vite 8 con plugin-react 4 → peer incompatible, `main` roto.

Además, el clon local está **24 commits detrás** de `origin/main` (versión raíz `1.0.3`), por lo
que cualquier verificación local debe partir de un `main` sincronizado.

## Proposed change

Cerrar los cuatro PRs de Dependabot en `main` con verificación local real, y una vez que todo
esté mergeado y verde, cortar el release **1.0.4**:

1. **Sincronizar y verificar baseline**: `git pull` a `origin/main` (1.0.3) y correr
   build/lint/test/audit en verde antes de mergear.
2. **Mergear en orden seguro**:
   - #55 solo (independiente, raíz).
   - **#56 + #58 juntos** (par acoplado: vite 8 + plugin-react 6).
   - #57 solo (jsdom 30; independiente en peers, pero es el entorno de test).
   Los tres PRs del client tocan el mismo `mangacount.client/package-lock.json`, así que se
   mergean de a uno dejando que Dependabot regenere/rebasee el siguiente.
3. **Verificar tras cada merge** con `npm ci` + build + lint + test en root y client (lo que el
   CI no cubre), más `npm audit --audit-level=high` (el único gate del CI).
4. **Bump de versión y release**: subir `version` a `1.0.4` en `package.json` de raíz, agregar
   la entrada `[1.0.4]` en `CHANGELOG.md`, commitear y **pushear el tag `v1.0.4`**, que dispara
   `.github/workflows/release.yml` (build de `deb`/`AppImage`/`nsis` y GitHub Release en draft).

## Scope

In scope:
- Merge de los PRs #55, #56, #57, #58 en `main`, en el orden seguro definido arriba.
- Regeneración/rebase de `mangacount.client/package-lock.json` y `package-lock.json` de root por
  los merges (los PRs ya incluyen sus lockfiles).
- Verificación local de cada merge: `npm ci`, `npm run build:renderer`,
  `npm --prefix mangacount.client run lint`, `npm test` (root) y `npm --prefix mangacount.client test`.
- `npm run rebuild:electron` (o `electron-builder install-app-deps`) para el módulo nativo
  `better-sqlite3` tras el bump de `electron`.
- `package.json` de root: `version` `1.0.3` → `1.0.4`.
- `CHANGELOG.md` de root: nueva sección `## [1.0.4] - <fecha>` con los cambios de dependencias.
- Creación y push del tag anotado `v1.0.4`; verificación de que `release.yml` corre y publica el
  draft de release.

Out of scope:
- Mergear a mano con resolución de conflictos de lockfile fuera de lo que Dependabot rebasea:
  si un PR queda `CONFLICTING`, se espera el rebase de Dependabot en lugar de resolver a mano.
- Upgrades adicionales no cubiertos por estos PRs (p. ej. `electron-builder` 27.x, `react`).
- Cambios de comportamiento, de contrato o de configuración de Vite más allá de lo que el build
  exija (no se esperan cambios en `vite.config.js`/`vitest.config.js`).
- Publicar el release fuera del flujo `v*` → `release.yml` (no se crean builds locales "a mano").
- Este change **no incluye `specs/`**: es un upgrade de dependencias de build/test y un bump de
  versión, sin cambio de comportamiento observable ni de contrato (igual que el change archivado
  `2026-10-07-remediar-vulnerabilidades-dependabot`).

## Risks

- **#56/#58 por separado rompen `main`** (peer deps): mitigación mergeándolos juntos y verificando
  con `npm ci` + build + test; nunca dejar `main` con solo uno de los dos.
- **Vite 8 = Rolldown**: cambio de bundler de fondo; el build del renderer puede diferir.
  Mitigación verificando `npm run build:renderer` y el arranque de la app Electron antes de tag.
- **jsdom 30 (5 majors)**: cambios de foco/CSS/DOM que pueden alterar tests y el coverage
  (threshold 70%). Mitigación corriendo `npm --prefix mangacount.client test` completo y revisando
  fallos por comportamiento, no silenciándolos.
- **electron 44.7.0 + módulo nativo**: `better-sqlite3` compilado contra el ABI de Electron.
  Mitigación con `npm run rebuild:electron` y smoke de arranque (`npm run dev` / `dist`).
- **Conflictos de lockfile entre #56/#57/#58** (mismo archivo): mitigación mergeando secuencial y
  esperando el rebase de Dependabot; no resolver a mano.
- **Tag/release equivocado**: mitigación creando el tag solo con `main` verde y todo mergeado, y
  confirmando la versión `1.0.4` en `package.json` y `CHANGELOG.md` antes del push.
- **`main` local desincronizado (24 commits detrás)**: mitigación `git pull --ff-only` y revalidar
  que `package.json` raíz dice `1.0.3` antes de empezar.
