# Design: Remediación de vulnerabilidades high/critical de Dependabot

## Approach

Remediación **mínima y acotada a severidad `high`/`critical`**, por lockfile, con dos
herramientas:

1. **Bump de dependencia directa** cuando el paquete vulnerable es directo (`vite`).
2. **`overrides` en `package.json`** para transitivas que un padre fija por debajo del fix
   (no se puede subir el padre sin un major riesgoso, p. ej. `electron-builder` o paquetes de
   build/test que declaran rangos viejos).

No se usa `npm audit fix` como mecanismo primario (aplica cambios amplios); si se usa, es solo
para descubrir el delta y luego se traduce a overrides explícitos. Cada override se fija a la
**versión parcheada mínima conocida dentro de la misma línea mayor** que ya resuelve el árbol,
con prefijo `^`, para no degenerar a exact-pinning.

Fuente de datos: `npm audit --json` sobre los lockfiles versionados (`package-lock.json` raíz y
`mangacount.client/package-lock.json`), misma base GHSA que Dependabot. `WhatsappBot/` no se
audita (sin lockfile; otro change lo remueve).

## Architecture

```
MangaCount/
├── package.json + package-lock.json      (Electron main)   ← overrides: http-cache-semantics
├── mangacount.client/
│   └── package.json + package-lock.json  (renderer React)  ← vite bump + overrides transitivas
└── .github/
    ├── dependabot.yml                    (NUEVO: npm en / y /mangacount.client)
    └── workflows/release.yml             (+ step opcional npm audit --audit-level=high)
```

### Mapa de remediación — root (Electron main)

Cadena: `electron-builder@26.15.3` → `app-builder-lib` → `@electron/get` →
`global-agent`/`http-cache-semantics`. Solo se remedia la `high`; los moderate de la cadena
quedan fuera de alcance (no hay fix estable).

| Paquete | Sev | Actual | Fix mínimo | Mecanismo |
|---|---|---|---|---|
| `http-cache-semantics` | high | 4.2.0 | `^4.3.0` | `overrides` (transitiva) |
| `electron-builder` + 7 transitivas | moderate | 26.15.3 | — | fuera de alcance |

### Mapa de remediación — mangacount.client (renderer)

| Paquete | Sev | Actual | Fix mínimo | Vía / mecanismo |
|---|---|---|---|---|
| `vite` | high | 7.3.2 | `^7.3.5` | directa (`devDependencies`) |
| `brace-expansion` | high | 1.1.13 | `^1.1.21` (línea 1.x) | `overrides` (glob/minimatch) |
| `browserslist` | high | 4.28.2 | `^4.29.3` | `overrides` (build) |
| `form-data` | high | 4.0.5 | `^4.0.6` | `overrides` (jsdom) |
| `js-yaml` | high | 4.1.1 | `^4.3.2` (línea 4.x) | `overrides` (eslint) |
| `nanoid` | high | 3.3.11 | `^3.3.20` (línea 3.x) | `overrides` (postcss) |
| `postcss` | high | 8.5.8 | `^8.5.29` | `overrides` (build) |
| `source-map-js` | high | 1.2.1 | `^1.2.2` | `overrides` (postcss) |
| `ws` | high | 8.20.0 | `^8.22.0` | `overrides` (jsdom) |
| `vitest`, `@vitest/*`, `@humanfs/node`, `baseline-browser-mapping` | moderate | — | — | fuera de alcance |
| `@babel/core`, `esbuild` | low | — | — | fuera de alcance |

Notas de diseño:
- No se sube `vite` a 8.x ni `vitest` a 5.x: el fix de la alerta `high` existe dentro de 7.x.
- `brace-expansion`, `js-yaml` y `nanoid` requieren pin por **línea mayor** porque el `latest`
  es un major superior (5.x/5.x/6.x) incompatible con lo que esperan sus padres; el override
  apunta a la rama 1.x/4.x/3.x parcheada.
- Se evita overridear cualquier paquete que no esté en la tabla: el resto del árbol queda
  intacto.

### Prevención

`dependabot.yml` (nuevo) con dos `updates` de ecosistema `npm`, `directory: "/"` y
`directory: "/mangacount.client"` respectivamente, `schedule.interval: weekly`, y `groups`
para agrupar PRs de parches/minors. **No** se declara `WhatsappBot`. El gate de CI es
`npm audit --audit-level=high` sobre cada lockfile (falla solo con high/critical, deja pasar
los moderate/low documentados).

## Validation

Pruebas de aceptación (deterministas):

1. `npm audit --audit-level=high` en root → exit 0 y `"high": 0, "critical": 0`.
2. `npm audit --audit-level=high` en `mangacount.client` → exit 0 y `"high": 0, "critical": 0`.
3. `npm ci` en root y en `mangacount.client` sin errores de resolución ni de peer deps.
4. `npm ls http-cache-semantics brace-expansion browserslist form-data js-yaml nanoid postcss source-map-js ws`
   en cada paquete sin reportar `invalid`.
5. Suite root: `npm test` (node --test) en verde.
6. Suite client: `npm --prefix mangacount.client run lint` y `npm --prefix mangacount.client test` (vitest) en verde.
7. Build de empaquetado smoke: `npm run build:renderer` en verde; `npm run dist:linux` o
   `dist:win` (según SO) genera artefacto sin fallar.
8. `dependabot.yml` válido (YAML parseable) y sin entrada de `WhatsappBot`.
9. Al cerrar (con credenciales del usuario): la pestaña Dependabot no muestra alertas
   `high`/`critical` para `/` ni `/mangacount.client`.
