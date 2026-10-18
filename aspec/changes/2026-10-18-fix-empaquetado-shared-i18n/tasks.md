# Tasks: Empaquetado del app.asar completo + smoke test del release

## Fase 1 — Fix del empaquetado

- [x] 1.1 `package.json`: `build.files` incluye `shared/**/*` y excluye `!shared/**/*.test.js` (en vez de enumerar `shared/recommendations`).
- [x] 1.2 Verificar con `@electron/asar` que el asar del build contiene `shared/i18n/{index,en,es}.js`.

## Fase 2 — Guard de unidad

- [x] 2.1 Crear `electron/packaging.test.js`: los imports de runtime que salen de `electron/` deben estar cubiertos por `build.files`.
- [x] 2.2 Afirmar que `shared/i18n`, `shared/recommendations` y `mangacount.client/dist` están incluidos, y que los tests no se empaquetan.
- [x] 2.3 Comprobar que el test falla con el `build.files` viejo (regresión simulada): falla nombrando `shared/i18n/index.js`.

## Fase 3 — Smoke test del paquete

- [x] 3.1 Crear `scripts/smoke-package.sh` (lanza el AppImage, espera, falla ante crash de arranque, limpia).
- [x] 3.2 Exponerlo como `npm run smoke:package` en `package.json`.
- [x] 3.3 Verificar el script contra el AppImage con el fix (sale 0) y contra el de la 2.2.5 publicada (sale 1).

## Fase 4 — CI y documentación

- [x] 4.1 Agregar el job `package-smoke` a `.github/workflows/test.yml` (build + `xvfb-run npm run smoke:package`).
- [x] 4.2 Agregar el contexto del job a los `required_status_checks` del ruleset **“PR only”**.
- [x] 4.3 `AGENTS.md`: `npm run smoke:package` como paso previo obligatorio a una release.

## Fase 5 — Release 2.2.6

- [ ] 5.1 Bump a `2.2.6` (`package.json`, lock y `PKGBUILD`) y entrada `CHANGELOG`.
- [ ] 5.2 Gates: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`, `npm run lint:renderer`, `npm run build:renderer`, `npm run smoke:package`.
- [ ] 5.3 Merge a `develop`, PR `develop → main`, merge, tag `v2.2.6` y publicar el release.
- [ ] 5.4 Verificación manual: descargar el AppImage de la 2.2.6 y abrir la app.
