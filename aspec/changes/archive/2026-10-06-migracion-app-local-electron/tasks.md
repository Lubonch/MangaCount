# Tasks: Migración a aplicación local Electron sin servidor

## Fase 0 — Decisión y matriz de paridad (base del plan)

- [x] Confirmar SQLite vía `better-sqlite3` (o `node:sqlite` si el toolchain lo justifica) y traducir `deployment/database-schema.sql` a `schema.sqlite.sql` con seed de formatos, editoriales y perfil por defecto
- [x] Relevar todos los `fetch('/api/...')` del renderer y todos los endpoints de los 9 controllers en una matriz de paridad endpoint → canal IPC → DTO
- [x] Decidir destino de `Pages/` (default: eliminar por absorción), de `NukeDataModal` (default: reconvertir a borrado local) y de providers remotos (default: diferir; no se portan)

## Fase 1 — Esqueleto Electron + SQLite + migración de datos

- [x] Crear estructura `electron/main`, `electron/preload.js`, `src/api/localAdapter.js` y dev con hot-reload del React actual
- [x] Implementar `db/client.js` (apertura en `userData`, `PRAGMA foreign_keys = ON`, migraciones versionadas, seed) con tests de apertura, migración y seed
- [x] Portar los 5 repositories a SQLite con tests por repositorio
- [x] Escribir script de traspaso PostgreSQL→SQLite con verificación (conteos por tabla, UNIQUE sin colisiones, spot-check) y documentar su uso único
- [x] Corregir el traspaso: incluir `Manga.ImageUrl` (hoy se omite y se pierde) y detectar filas descartadas por `INSERT OR IGNORE`

## Fase 2 — Porte de lógica y handlers IPC

- [x] Portar `EntryService` (CRUD + TSV import/export con las 8 columnas) y exponer handlers IPC con tests
- [x] Portar `ProfileService`, `MangaService`, `FormatService`, `PublisherService` y exponer handlers IPC con tests
- [x] Conectar `shared/recommendations` en main (sin portar `LocalRecommendationEngine.cs`) con clamp de `limit` y fallback local, más handlers IPC con tests
- [x] Migrar fotos de perfil a `<userData>/profiles`, logging a `<userData>/logs` con rotación diaria y preferencias locales (fuera `appsettings*.json`)
- [x] Tests unitarios de ida y vuelta por canal (`node --test` + `vitest` en verde)

## Fase 2.5 — Correcciones de paridad (revisión 2026-10-06)

- [x] **Cablear el renderer al adaptador (bloqueante)**: `App.jsx`, `Sidebar`, `CollectionView`, `AddEntryModal`, `AddMangaModal`, `AddProfileModal` y `ProfileSelector` siguen con `fetch('/api/...')`. Definir el contrato `Response`-like en `localAdapter.js` y montarlo en Electron (shim de `window.fetch` para `/api/*`) o reescribir cada call site
- [x] Corregir DTO de `entry:used-formats` / `entry:used-publishers` a `{id,name,count}[]` (hoy `string[]`; el renderer usa `id`/`name`/`count` como el `EntryController` original)
- [x] Implementar serving de fotos de perfil con protocolo custom (`protocol.handle('mangacount', …)`) y alinear `profile:upload-picture` para devolver `mangacount://profiles/<file>` (hoy `{fileName}`); ajustar `ProfileSelector.getImageUrl`
- [x] Verificar en la app Electron real (dev y empaquetada) los flujos completos sin `fetch` a `/api` sin atender; actualizar `parity-matrix.md` a `UI verde` recién entonces

## Fase 3 — Frontend y empaquetado

- [x] Eliminar `LoadBearingCheck` y su ruta, redefinir `NukeDataModal` y simplificar `vite.config.js` (fuera dev-certs, proxy `/api`, chequeo load-bearing)
- [x] Adaptar `vitest` al adaptador IPC (mock de `window.mangaCount`) y dejar la suite verde
- [x] Configurar `electron-builder` (`nsis`, `deb`, `AppImage`), iconos, metadatos y versionado, **encadenando `build:renderer` antes de `electron-builder`** en el script `dist`; documentar el rebuild de `better-sqlite3` (ABI Electron vs Node) para no romper `npm test`
- [x] Probar instalación real en Windows (exe), Debian/Ubuntu (deb) y Arch (AppImage): arranque, persistencia entre reinicios, import/export TSV y foto de perfil visible (Linux nativo + Windows vía Wine, sin problemas)
- [x] Agregar workflow `.github/workflows/release.yml`: en push de tag `v*` compila los instaladores en `windows-latest` (nsis `.exe`) y `ubuntu-latest` (`.deb` + `.AppImage`), los sube como artifacts y crea un GitHub Release **draft** con ellos (`workflow_dispatch` permite sólo compilar sin release)

## Fase 4 — Limpieza de código basura

- [x] Borrar `MangaCount.Server/`, `MangaCount.Server.Tests/`, `.sln`, `Program.cs` y referencias `SpaProxy`/Swagger/CORS una vez la paridad esté `UI verde`
- [x] Borrar `deployment/`, `databasebackup/`, `Pages/`, `.angular/` si quedara, `loadbearingimage.jpg` y chequeos load-bearing
- [x] Borrar `DatabaseController`/`DatabaseService` (o su equivalente si se reconvirtió) y endpoints `/api/database/*` sin reemplazo
- [x] Verificar con `git grep` que no queden referencias a servidor (`localhost:63920`, `ASPNETCORE_`, `Npgsql`, `Dapper`, `192.168.0.50`, `loadbearing`) fuera de docs históricas

## Fase 5 — Documentación actualizada

- [x] Reescribir `README.md` (qué es la app desktop, instalación por exe/deb/AppImage, migración desde PostgreSQL, desarrollo con Electron)
- [x] Eliminar o archivar `PLAN.md` raíz y `WhatsappBot/PLAN.md`, actualizar `CHANGELOG`s y quitar WhatsApp de la documentación general (código intacto)
- [x] Documentar ubicación de datos (`userData`), formato del SQLite, protocolo `mangacount://` para fotos, backup manual y troubleshooting por plataforma
- [x] Verificación final cruzada contra proposal (qué) y design (cómo) y actualización de `aspec/specs/` vía delta specs de este change
