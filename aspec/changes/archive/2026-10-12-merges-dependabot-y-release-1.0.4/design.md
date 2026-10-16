# Design: Completar los merges de Dependabot y publicar el release 1.0.4

## Approach

Cerrar los PRs de Dependabot con **verificación local real** (porque el CI solo audita), respetando
el **acoplamiento de peer deps** entre `vite` 8 y `@vitejs/plugin-react` 6, y luego cortar el
release por el flujo `tag → release.yml`.

Reglas:

1. **`main` nunca queda a medias.** El par vite 8 + plugin-react 6 se mergea junto; mergear uno solo
   deja `ERESOLVE`/build roto sin que el CI lo detecte.
2. **Merge secuencial de los PRs del client.** #56, #57 y #58 editan el mismo
   `mangacount.client/package-lock.json`: se mergea uno y se espera el rebase de Dependabot del
   siguiente. No se resuelven conflictos de lockfile a mano.
3. **Verificación después de cada merge**, con los mismos comandos que usa el flujo de release más
   los que el CI no corre (build, lint, tests).
4. **El release se dispara por tag.** `release.yml` corre con `push` de tags `v*`; no hay que crear
   builds a mano: `package.json` (raíz) + `CHANGELOG.md` + `git tag v1.0.4` + push del tag.

## Architecture

```
MangaCount/
├── package.json + package-lock.json        (Electron main)  ← #55 electron ^44.7.0 ; version 1.0.4
├── mangacount.client/
│   ├── package.json + package-lock.json    (renderer React) ← #56 vite ^8.3.4
│   │                                                          #57 jsdom ^30.1.2
│   │                                                          #58 plugin-react ^6.1.2
│   ├── vite.config.js                      (base './', alias, plugin())
│   └── vitest.config.js                    (environment: 'jsdom')
├── CHANGELOG.md                            ← nueva sección [1.0.4]
└── .github/
    ├── dependabot.yml                      (origen de los 4 PRs)
    └── workflows/
        ├── audit.yml                       (gate de PRs: solo npm audit)
        └── release.yml                     (push tag v* → build + GitHub Release draft)
```

### Matriz de merge y acoplamientos

| PR | Paquete | Cambio | Dir | Independiente | Orden |
|----|---------|--------|-----|---------------|-------|
| #55 | `electron` | ^44.5.1 → ^44.7.0 (minor) | raíz | Sí | 1º |
| #56 | `vite` | ^7.3.5 → ^8.3.4 (major, Rolldown) | client | **No** (par con #58) | 2º |
| #58 | `@vitejs/plugin-react` | ^4.6.0 → ^6.1.2 (peer: `vite ^8.0.0`) | client | **No** (par con #56) | 2º |
| #57 | `jsdom` | ^25.0.1 → ^30.1.2 (5 majors) | client | Sí | 3º |

### Compatibilidad de peers (verificada contra npm)

| Paquete | peer de `vite` | Nota |
|---|---|---|
| `@vitejs/plugin-react@4.6.0` | `^4 \|\| ^5 \|\| ^6 \|\| ^7` | cae con vite 8 |
| `@vitejs/plugin-react@6.1.2` | `^8.0.0` | exige vite 8; peers `oxc-transform-react`/`@rolldown/plugin-babel`/react-compiler son **opcionales** |
| `vitest@5.0.3` (ya en main) | `^6.4 \|\| ^7 \|\| ^8` | compatible con vite 8 → **no se toca** |

### Engines / Node

- `vite@8`, `@vitejs/plugin-react@6` → `node ^20.19 || >=22.12`.
- `jsdom@30` → `node ^22.22.2 || ^24.15.0 || >=26`.
- `electron@44.7` → `node >=22.12`.
- CI (`audit.yml`/`release.yml`) usa `setup-node` con `node-version: 22` (flota a la 22.x más
  reciente ≥ 22.22 → OK). Dev local actual: `node v24.21.0` → OK.

### Flujo de release (existente, no se modifica)

```
git tag v1.0.4 && git push origin v1.0.4
        │
        ▼
release.yml (on: push tags 'v*')
  build matrix: ubuntu-latest → npm run dist:linux ; windows-latest → npm run dist:win
        │
        ▼
  npm ci (raíz) + npm ci --prefix mangacount.client + build
        │
        ▼
  release job: GitHub Release en DRAFT con los instaladores
```

## Validation

Pruebas de aceptación (deterministas). La columna "hoy" es lo que da el CI por su cuenta; la
verificación real es local.

1. Baseline sincronizado: `git pull --ff-only` y `git show HEAD:package.json` → `"version": "1.0.3"`.
2. Tras cada merge, en root: `npm ci` sin `ERESOLVE`.
3. Tras cada merge, en client: `npm ci --prefix mangacount.client` sin `ERESOLVE`.
4. `npm run build:renderer` en verde (valida vite 8 + plugin-react 6).
5. `npm --prefix mangacount.client run lint` en verde.
6. `npm --prefix mangacount.client test` (vitest + jsdom 30) en verde, con coverage ≥ thresholds.
7. `npm test` (root, `node --test`) en verde.
8. `npm audit --audit-level=high` → exit 0 en root y en client.
9. Smoke del nativo: `npm run rebuild:electron` y arranque de la app (`npm run dev`) sin crash de
   `better-sqlite3` con electron 44.7.0.
10. `package.json` (raíz) `version` = `1.0.4` y `CHANGELOG.md` con `## [1.0.4]` antes del tag.
11. `git tag v1.0.4` es anotado y apunta al commit del bump en `main`.
12. `release.yml` corre en el push del tag (run en verde) y publica un GitHub Release en draft con
    `*.deb`, `*.AppImage` y `*.exe`.

## Notas de diseño

- **Por qué no mergear en un solo push**: cada `npm ci` obliga a resolver el árbol; el par
  acoplado debe estar completo o la resolución falla. Los tres PRs del client comparten lockfile,
  así que el orden y el rebase de Dependabot son parte del procedimiento.
- **Por qué verificar local antes del tag**: `audit.yml` solo corre `npm audit`; un `vite` 8 roto
  pasaría el CI y recién explotaría en `release.yml` (o peor, en la app instalada). Verificar antes
  de tag evita publicar un release roto.
- **SemVer**: los bumps son devDependencies + runtime de Electron sin cambios de API de producto;
  el release es **patch/minor de mantenimiento** → `1.0.4`.
