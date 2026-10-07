# Changelog

Todos los cambios relevantes de MangaCount. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado semántico.

## [1.0.2] - 2026-10-07

### Security

- Remediación de las vulnerabilidades `high`/`critical` reportadas por Dependabot en los dos
  lockfiles activos (`/` y `mangacount.client`), sin cambios de comportamiento:
  - Root (Electron main): `overrides` de `http-cache-semantics` a `^4.3.0` (transitiva de
    `electron-builder`).
  - Renderer: bump de `vite` a `^7.3.5` y `overrides` de `brace-expansion`, `browserslist`,
    `form-data`, `js-yaml`, `nanoid`, `postcss`, `source-map-js` y `ws`.
- Prevención: `.github/dependabot.yml` (npm en `/` y `/mangacount.client`, semanal y agrupado) y
  workflow `Dependency Audit` (`npm audit --audit-level=high`) en push/PR a `main` y semanal.

## [1.0.1] - 2026-10-06

### Changed

- Limpieza: se elimina el backend .NET completo (`MangaCount.Server`, tests, `Directory.Build.props`,
  `Program.cs`), `deployment/`, `databasebackup/` y la demo `Pages/` (con su workflow).
- `.gitignore`: ignora `*.db-shm`/`*.db-wal`/`*.db-journal`, `.env*` y el working-context local de
  `.ancleto/`; deja de ignorar `public/` (assets de Vite).
- Documentación: README y `docs/desktop.md` reflejan la ruta real de datos (`mangacount`);
  `copilot-instructions.md` y `ARCHITECTURE.md` actualizados al stack desktop.

## [1.0.0] - 2026-10-06

### Added

- Aplicación de escritorio **Electron** autocontenida con **SQLite embebida** (`better-sqlite3`),
  sin servidor ni PostgreSQL.
- Proceso main en Node que porta la lógica del backend: repositories, servicios de entries
  (TSV import/export), catálogos, recomendaciones (`shared/recommendations`), configuración local,
  logging a `userData` y gestión de fotos de perfil.
- IPC tipada vía `preload.cjs` (`window.mangaCount`) y adaptador en el renderer que enruta
  `fetch('/api/*')` a IPC devolviendo objetos `Response`-like, sin reescribir los componentes.
- Fotos de perfil en `<userData>/profiles` servidas por el protocolo custom `mangacount://`.
- Filtros de formato/editorial con DTO `{id,name,count}`.
- Script de traspaso PostgreSQL → SQLite con verificación (conteos, UNIQUE, filas descartadas,
  spot-check), incluyendo `Manga.ImageUrl`.
- Empaquetado con `electron-builder`: NSIS (`.exe`), `.deb` y `.AppImage`.
- Workflow de CI que compila los instaladores por SO en un tag `v*` y publica un GitHub Release
  draft con los artefactos.
- Documentación de la app desktop (`docs/desktop.md`): datos, esquema, backup y troubleshooting.

### Removed

- Código *joke* load-bearing en el frontend (componente, imagen y estilos).
- Estilos del modal de datos previos, reemplazados por el borrado local total.

### Changed

- El renderer usa rutas de assets relativas (`base: './'`) para funcionar con `loadFile` en el
  empaquetado.

### Notas

- El bot de WhatsApp y el backend .NET/PostgreSQL quedan fuera del alcance de la app de
  escritorio (el backend se elimina en la limpieza final del change).
