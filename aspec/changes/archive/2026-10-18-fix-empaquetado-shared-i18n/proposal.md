# Proposal: Empaquetado del app.asar completo + smoke test del release

## Problem

La release **2.2.5** quedó **rota en todas las plataformas**: la app no arranca. Al ejecutar el AppImage:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../resources/app.asar/shared/i18n/index.js'
  imported from '.../resources/app.asar/electron/main/ipc/handlers.js'
```

`build.files` (electron-builder) listaba `shared/recommendations/**/*` pero **no `shared/i18n/**/*`**, y
tres módulos del proceso main lo importan (`ipc/handlers.js`, `services/i18n.js`,
`services/discord-bot.js`). El change bilingüe (#118) agregó `shared/i18n/` y **no actualizó el
empaquetado**. El `app.asar` salió sin ese directorio y el main murió al resolver el import, antes de
abrir la ventana.

**Nada lo detectó**: la suite de tests corre contra el repo (donde `shared/i18n/` existe), el check
`Renderer` sólo buildea el renderer, y ningún check construía y ejecutaba la app empaquetada. El bug
llegó a producción.

## Proposed change

- **Fix**: `build.files` pasa a incluir `shared/**/*` (con `!shared/**/*.test.js`), en vez de enumerar
  subdirectorios: cualquier directorio compartido nuevo queda empaquetado por defecto.
- **Guard barato (unidad)**: `electron/packaging.test.js` recorre los imports relativos del main que
  salen de `electron/` y falla si alguno no está cubierto por `build.files`. Corre en `npm test`.
- **Guard real (release)**: un **smoke test del paquete** que construye el AppImage y lo **ejecuta**,
  verificando que arranca sin crash de arranque. Se agrega como job de CI en los PRs hacia `main` y como
  script local (`npm run smoke:package`), y se documenta como paso previo obligatorio a una release.

## Scope

**In scope**

- `package.json` (`build.files` + script `smoke:package`).
- `electron/packaging.test.js` (nuevo).
- `scripts/smoke-package.sh` (nuevo) y el job `package-smoke` en `.github/workflows/test.yml`.
- `AGENTS.md`: el smoke del paquete como parte de la verificación previa a una release.
- Release **2.2.6** con el fix.

**Out of scope**

- Cambiar el empaquetado más allá de `files` (firma, `desktopName`, íconos, targets).
- Smoke test en Windows/macOS (el job corre en Linux; el `.exe` se genera en el runner Windows y no se
  ejecuta en CI).
- Reemplazar la 2.2.5 publicada (se libera una 2.2.6).

## Risks

- **El smoke test alarga la CI**: mitigación → job separado, sólo en PRs hacia `main`, con timeout
  acotado; el build del AppImage ya lo hace el workflow de release, así que el costo es conocido.
- **Falso negativo por entorno headless**: mitigación → el script corre bajo `xvfb-run` en CI y acepta
  `--appimage-extract-and-run` cuando no hay FUSE.
- **Un `build.files` demasiado amplio** (`shared/**/*`) empaqueta tests: mitigación → exclusión explícita
  `!shared/**/*.test.js` y un test que la verifica.
- **Otros recursos de runtime no detectados por el test de imports** (p. ej. lecturas por `fs`): el smoke
  test del paquete cubre ese hueco al ejecutar la app real.
