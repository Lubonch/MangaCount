# Tasks: Completar los merges de Dependabot y publicar el release 1.0.4

## Fase 0 — Sincronización y baseline

- [x] `git pull --ff-only` y confirmar que el clon local queda en `origin/main` (sin `behind`)
- [x] Confirmar baseline: `package.json` (raíz) `version` = `1.0.3` y tag `v1.0.3` existente
- [x] Confirmar estado de los 4 PRs (`gh pr list`): #55, #56, #57, #58 en `MERGEABLE`
- [x] Baseline verde en root: `npm ci`, `npm test`, `npm audit --audit-level=high`
- [x] Baseline verde en client: `npm ci --prefix mangacount.client`, `lint`, `test`, `npm audit --audit-level=high`

## Fase 1 — Merge #55 (root, electron minor, independiente)

- [x] Mergear PR #55 (electron `^44.5.1` → `^44.7.0`)
- [x] `git pull` y `npm ci` en root sin `ERESOLVE`
- [x] `npm run rebuild:electron` y smoke de arranque (`npm run dev`) sin crash de `better-sqlite3`
- [x] `npm test` (root) en verde

## Fase 2 — Merge #56 + #58 (par acoplado: vite 8 + plugin-react 6)

- [x] Confirmar que #56 y #58 se mergean **juntos** (nunca uno solo)
- [x] Mergear PR #56 (`vite` `^7.3.5` → `^8.3.4`); si #58 queda `CONFLICTING`, esperar el rebase de Dependabot
- [x] Mergear PR #58 (`@vitejs/plugin-react` `^4.6.0` → `^6.1.2`) inmediatamente después
- [x] `git pull` y `npm ci --prefix mangacount.client` sin `ERESOLVE` (peers vite 8 ↔ plugin-react 6)
- [x] `npm run build:renderer` en verde (valida vite 8 / Rolldown + plugin-react 6)
- [x] `npm --prefix mangacount.client run lint` en verde
- [x] Smoke de la app Electron con el renderer buildeado

## Fase 3 — Merge #57 (client, jsdom 30, independiente)

- [x] Mergear PR #57 (`jsdom` `^25.0.1` → `^30.1.2`)
- [x] `git pull` y `npm ci --prefix mangacount.client` sin `ERESOLVE`
- [x] `npm --prefix mangacount.client test` (vitest + jsdom 30) en verde, coverage ≥ thresholds
- [x] Si algún test falla por cambio de jsdom: arreglar el test/uso (no silenciar ni bajar el threshold)

## Fase 4 — Verificación integral pre-release

- [x] `npm ci` + `npm test` + `npm audit --audit-level=high` en root → todo verde
- [x] `npm ci --prefix mangacount.client` + `lint` + `test` + `npm audit --audit-level=high` en client → todo verde
- [x] `npm run build:renderer` en verde
- [x] `git status` limpio y `main` local == `origin/main`

## Fase 5 — Bump de versión y release

- [x] Subir `version` a `1.0.4` en `package.json` de root
- [x] Agregar `## [1.0.4] - <fecha>` en `CHANGELOG.md` con los bumps (#55 electron, #56 vite 8, #57 jsdom 30, #58 plugin-react 6) y la nota del par acoplado
- [x] Commit del bump (p. ej. `chore(release): 1.0.4`)
- [x] Push a `main`
- [x] Crear tag anotado `v1.0.4` y `git push origin v1.0.4`
- [ ] Verificar que `release.yml` corre en el push del tag y queda en verde
- [ ] Verificar el GitHub Release en draft con `*.deb`, `*.AppImage` y `*.exe`

## Fase 6 — Cierre

- [x] Verificación final cruzada contra `proposal.md` (qué) y `design.md` (cómo)
- [x] Archivar el change con `/cleto-archive`

## Nota sobre specs

Este change **no incluye `specs/`**: es un upgrade de dependencias de build/test/runtime Electron y
un bump de versión, sin cambio de comportamiento observable ni de contrato. No altera ningún
`Requirement` de `aspec/specs/`, igual que el change archivado
`2026-10-07-remediar-vulnerabilidades-dependabot`.
