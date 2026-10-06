# Changelog

Todos los cambios relevantes de MangaCount. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado semántico.

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
