# Design: Empaquetado del app.asar completo + smoke test del release

## Approach

Tres capas, de la más barata a la más real:

1. **`build.files` correcto por construcción**: incluir `shared/**/*` en lugar de enumerar
   subdirectorios, para que un directorio compartido nuevo quede empaquetado sin tocar la config.
2. **Test de unidad** (`npm test`) que compara los imports de runtime del main contra `build.files`.
   Detecta la clase exacta de bug (un módulo importado que no se empaqueta) en segundos.
3. **Smoke test del paquete** (CI en PRs a `main` + script local): construye el AppImage y lo **ejecuta**
   bajo un display virtual, afirmando que arranca. Detecta cualquier fallo de arranque, no sólo imports.

## Architecture

### `package.json` — `build.files`

```json
"files": [
  "electron/**/*",
  "shared/**/*",
  "!shared/**/*.test.js",
  "mangacount.client/dist/**/*",
  "package.json"
]
```

`electron-builder` usa patrones tipo minimatch con soporte de negación.

### `electron/packaging.test.js` (nuevo)

- Lee `package.json` → `build.files`; convierte los globs a `RegExp` (`**/` = cero o más directorios,
  `*` = segmento, `!` = exclusión).
- Recorre `electron/**/*.js` (sin `.test.js`), extrae los specifiers relativos
  (`from '…'` / `import '…'`) y resuelve cada uno contra la raíz del repo.
- Falla si algún target **fuera de `electron/`** no queda cubierto por `build.files`.
- Afirma explícitamente que `shared/i18n`, `shared/recommendations` y `mangacount.client/dist` están
  incluidos, y que los tests **no** se empaquetan.

### `scripts/smoke-package.sh` (nuevo)

```
uso: scripts/smoke-package.sh [ruta-al-AppImage]
```

1. Resuelve el AppImage por defecto: `release/MangaCount-<version>.AppImage`.
2. Si no hay `/dev/fuse`, agrega `--appimage-extract-and-run`.
3. Lo lanza con `setsid` y salida a un archivo temporal; espera `SMOKE_TIMEOUT` (default 40 s).
4. **Falla** si: el proceso ya no está vivo (se murió solo), o el log contiene
   `ERR_MODULE_NOT_FOUND` / `Cannot find module` / `A JavaScript error occurred`.
5. Limpia el proceso y el mount, e imprime el log si falló.

Se expone como `npm run smoke:package`.

### `.github/workflows/test.yml` — job `package-smoke`

```yaml
package-smoke:
  name: Packaged app smoke (AppImage boots)
  runs-on: ubuntu-latest
  steps:
    - checkout + setup-node 22 (cache npm)
    - npm ci && npm ci --prefix mangacount.client
    - npm run build:renderer
    - npx electron-builder --linux AppImage --publish never
    - sudo apt-get install -y xvfb
    - xvfb-run -a npm run smoke:package
```

Al correr en `pull_request` hacia `main`, queda disponible como check requerido del ruleset **“PR only”**
(se agrega el contexto a la lista de `required_status_checks`).

### `AGENTS.md`

En “Verificación antes de terminar” se agrega, **para releases**, `npm run smoke:package` (construir y
ejecutar el AppImage) además de los cuatro comandos actuales.

## Validation

- `npm test` incluye `electron/packaging.test.js` (verde con el fix; con el `build.files` viejo falla
  nombrando `shared/i18n/index.js`).
- `npm run smoke:package` sobre el AppImage construido con el fix: arranca (log de la app con
  `backend listo`) y el script sale 0; con el AppImage de la 2.2.5 publicada sale ≠ 0.
- `npm run build:renderer`, `npm run lint:renderer` y `npm run test:renderer:coverage` siguen verdes.
- El job `package-smoke` pasa en el PR de la 2.2.6.
- Verificación manual del release: descargar el AppImage de la 2.2.6 y abrir la app.
