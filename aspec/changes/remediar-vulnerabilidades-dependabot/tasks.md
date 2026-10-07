# Tasks: Remediación de vulnerabilidades high/critical de Dependabot

## Fase 0 — Baseline y alcance

- [x] Registrar el baseline: `npm audit --json` en root y en `mangacount.client`, guardar conteos (root 1 high / 8 moderate; client 9 high / 5 moderate / 2 low)
- [x] Confirmar que `WhatsappBot/` queda fuera (sin lockfile, otro change lo remueve) y que no se abre PR de Dependabot sobre ese directorio
- [x] Confirmar umbral `--audit-level=high` y que moderate/low quedan solo documentados

## Fase 1 — Root (Electron main)

- [x] Agregar `overrides` en `package.json` de root: `"http-cache-semantics": "^4.3.0"`
- [x] Regenerar `package-lock.json` de root (`npm install --package-lock-only` o `npm install`) y revisar el diff del lockfile (solo debe moverse `http-cache-semantics`)
- [x] Verificar `npm audit --audit-level=high` en root → exit 0 (0 high/critical)
- [x] Verificar `npm ls http-cache-semantics` sin árbol inválido

## Fase 2 — mangacount.client (renderer)

- [x] Bump de la directa: `vite` de `^7.0.4` a `^7.3.5` en `mangacount.client/package.json`
- [x] Agregar `overrides` en `mangacount.client/package.json`: `brace-expansion ^1.1.21`, `browserslist ^4.29.3`, `form-data ^4.0.6`, `js-yaml ^4.3.2`, `nanoid ^3.3.20`, `postcss ^8.5.29`, `source-map-js ^1.2.2`, `ws ^8.22.0`
- [x] Reinstalar deps del client y regenerar `mangacount.client/package-lock.json`; revisar diff (sin tocar `react`/`react-dom`)
- [x] Verificar `npm audit --audit-level=high` en `mangacount.client` → exit 0 (0 high/critical)
- [x] Verificar `npm ls brace-expansion browserslist form-data js-yaml nanoid postcss source-map-js ws` sin árbol inválido

## Fase 3 — Verificación funcional

- [x] `npm test` en root (node --test) en verde
- [x] `npm --prefix mangacount.client run lint` en verde
- [x] `npm --prefix mangacount.client test` (vitest) en verde
- [x] `npm run build:renderer` en verde
- [x] Smoke de empaquetado (`npm run dist:win` o `dist:linux` según SO) sin fallos

## Fase 4 — Prevención

- [x] Crear `.github/dependabot.yml` con dos `updates` npm (`/` y `/mangacount.client`), `schedule.interval: weekly` y `groups` para patch/minor; sin entrada de `WhatsappBot`
- [x] (Opcional) Agregar step/job `npm audit --audit-level=high` para root y client en el workflow de CI
- [x] Validar YAML de `dependabot.yml`

## Fase 5 — Cierre

- [x] Actualizar `CHANGELOG.md` de root con la remediación de vulnerabilidades
- [x] Verificación final cruzada contra `proposal.md` (qué) y `design.md` (cómo)
- [ ] Revalidar alertas en la pestaña Dependabot (con credenciales del usuario): sin high/critical en `/` ni `/mangacount.client`
- [ ] Archivar el change con `/cleto-archive`

## Nota sobre specs

Este change **no incluye `specs/`**: es una remediación de dependencias de build/test sin
cambios de comportamiento observable ni de contrato. No altera ningún `Requirement` de
`aspec/specs/`; por eso no se generan delta specs ni se tocan los specs principales.
