# Design: Migración a aplicación local Electron sin servidor

## Approach

Migración por capas con paridad verificable, sin reescribir la UI:

1. **Decisión de persistencia primero (Fase 0):** SQLite embebida vía `better-sqlite3` en el proceso main. Alternativas descartadas: JSON plano (sin queries ni transacciones para 5 tablas relacionadas), mantener PostgreSQL (es el problema a eliminar), IndexedDB (límites de cuota, migraciones más frágiles y sin acceso fuera del renderer). El esquema actual (`deployment/database-schema.sql`, 69 líneas, 5 tablas) se traduce casi 1:1 (`SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT`, `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` se conserva, `ON CONFLICT DO NOTHING` → `INSERT OR IGNORE`, índices iguales). Dos ajustes del esquema destino: se agrega `Profile.ProfilePicture` (el original en PG está roto: `ProfileRepository.cs` referencia columnas que no existen) y se activa `PRAGMA foreign_keys = ON` por conexión para que `ON DELETE CASCADE` funcione igual que en PG.
2. **Matriz de paridad:** se relevan todos los `fetch('/api/...')` del renderer (`App.jsx`, `Sidebar`, `CollectionView`, `AddEntryModal`, `AddMangaModal`, `AddProfileModal`, `ProfileSelector`, `NukeDataModal`, `LoadBearingCheck`) y todos los endpoints de los 9 controllers —incluidos los que el frontend no usaba (`GET /api/profile/{id}`, `GET /api/manga/{id}`, `GET /api/Entry/{id}`, `GET /api/Profile/image/{fileName}` y el export TSV inexistente) y se les asigna un canal IPC con los mismos DTOs que serializa ASP.NET Core. Nada se borra del backend .NET hasta que su fila de la matriz esté `UI verde`.
3. **Porte de lógica a Node:** los repositories (Dapper → consultas `better-sqlite3` síncronas) y services se portan a JS en `electron/main/db/` y `electron/main/services/`. `LocalRecommendationEngine.cs` (410 líneas) NO se porta: se usa directamente `shared/recommendations` en JS, que es la implementación de referencia. `EntryService` (TSV, 354 líneas) sí se porta. **Los providers de reranking remoto (`OpenRouterRankingProvider`, `GitHubModelsRankingProvider`) NO se portan en este change:** el motor local y el fallback alcanzan, y portar la config por env vars agrega fricción; queda como extensión futura del punto `providers` ya previsto en `recommendations.js`.
4. **Frontend:** se agrega `src/api/localAdapter.js`, que traduce `/api/...` → canal IPC y **debe devolver un objeto tipo `Response` (`ok`, `status`, `json()`)**, no el body parseado, para que los call sites actuales funcionen sin reescribirse. En Electron se instala como `window.fetch` (o `localFetch`) cubriendo las rutas `/api/*`; en navegador conserva el `fetch` real. Los componentes no cambian salvo `LoadBearingCheck` (se elimina) y `NukeDataModal` (se redefine para borrado local total y ya consume el adaptador). `vite.config.js` se simplifica: fuera certificados `dotnet dev-certs`, proxy `/api` y chequeo load-bearing; se agrega `base: './'` para que el bundle cargue por `file://` con `loadFile` en el empaquetado; se agrega plugin de Electron en dev.
5. **Fotos de perfil (faltante en el planteo original):** el original guardaba en `wwwroot/profiles` y las servía por `GET /api/Profile/image/{fileName}`. En desktop se guardan en `<userData>/profiles` y se sirven con un **protocolo custom** (`protocol.handle('mangacount', …)` registrado en main) expuesto como `mangacount://profiles/<fileName>`; el handler `profile:upload-picture` devuelve esa URL y `ProfileSelector.getImageUrl` la maneja como URL absoluta. Sin esto el `<img>` no resuelve (`/profiles/...` no existe en Electron).
6. **Empaquetado:** `electron-builder` con targets `nsis` (Windows exe), `deb` (Debian/Ubuntu) y `AppImage` (Arch y resto; AUR oficial queda como trabajo futuro documentado); el script de empaquetado debe encadenar `build:renderer` antes de `electron-builder` para no empaquetar un `mangacount.client/dist` viejo. La compilación corre en CI (`.github/workflows/release.yml`) en dos runners — `windows-latest` para el `.exe` y `ubuntu-latest` para `.deb`/`.AppImage` (no se cross-compila el exe) — y al pushear un tag `v*` adjunta los tres instaladores a un GitHub Release **draft**. Datos de usuario en `app.getPath('userData')` (SQLite + fotos de perfil + logs); nunca dentro del bundle.
7. **Limpieza al final, no al principio:** recién cuando la app Electron pasa la paridad se borra `MangaCount.Server/`, `MangaCount.Server.Tests/`, `deployment/`, `databasebackup/`, `Pages/` (decisión: eliminar — su valor, demo sin backend con `TSVLoader`, queda absorbido por la app local; si se quiere conservar la demo web, moverla fuera del repo), load-bearing, `.angular/` si quedara, y se reescribe la documentación. (Nota: `dist/`, `.angular/` y `Pages/dist` ya están gitignoreados; no hay `dist/` commiteado que borrar.)

## Architecture

Target:

```text
mangacount-desktop/               # nuevo root de la app (o reuso de mangacount.client/)
├── electron/main/
│   ├── index.js                  # ventanas, ciclo de vida, userData, protocolo mangacount://
│   ├── db/client.js              # better-sqlite3 + migraciones + seed
│   ├── db/repositories/          # profile, manga, entry, format, publisher
│   ├── services/                 # entry (TSV), recommendation (usa shared/), profile, database
│   └── ipc/handlers.js           # matriz de paridad: un handler por endpoint
├── electron/preload.cjs         # contextBridge: window.mangaCount.* (CommonJS por sandbox)
├── src/                          # React actual casi intacto
│   └── api/localAdapter.js       # /api/* → IPC, devolviendo Response-like
└── shared/recommendations/       # se reutiliza sin cambios
```

- Transporte: solo `ipcRenderer.invoke` / `ipcMain.handle`, con validación de argumentos en cada handler (profileId > 0, clamp de `limit` 1–10 como hoy en `RecommendationController`).
- Adaptador: contrato `Response`-like (`ok`, `status`, `json()`) para no reescribir los componentes; el mapeo URL→canal debe cubrir **todos** los `fetch('/api/...')` relevados, no solo `NukeDataModal`.
- Fotos de perfil: de `wwwroot/profiles` a `<userData>/profiles`, servidas por `mangacount://profiles/<file>`.
- Logs: de `logs/backend.txt` con rotación diaria a `<userData>/logs/app-YYYY-MM-DD.txt` con la misma política (rotar solo si hay contenido).
- Config: fuera `appsettings*.json`; dentro `electron-store` o JSON local para preferencias (tema, último perfil, endpoint de reranking opcional — hoy sin consumidor).
- Decisiones diferidas con default: `Pages/` → eliminar (absorción); `NukeDataModal` → reconvertir en "borrar todos los datos locales" contra SQLite (útil en desktop) en vez de eliminar, **hecho**; providers remotos → **diferidos** (no portados en este change).

## Validation

- Matriz de paridad completa: cada `fetch('/api/...')` relevado tiene canal IPC con test de ida y vuelta y mismos DTOs; los DTOs de filtros (`{id,name,count}`) y de upload (URL del protocolo) se validan explícitamente.
- **Verificación de UI, no solo de handlers:** la app Electron (dev y empaquetada) ejecuta los flujos reales (listar perfil, alta de entry/manga, filtros, import TSV, subir foto y verla en `<img>`, recomendación, nuke local) sin ningún `fetch` a `/api` sin atender.
- Migración de datos: script PG→SQLite + verificación automática (conteos por tabla, UNIQUE `ProfileId+MangaId` sin colisiones, spot-check de 20 entries, y conteo estricto de filas descartadas por `INSERT OR IGNORE`).
- Tests: los `vitest` del frontend corren contra el adaptador (mock de `window.mangaCount`); la lógica porteada tiene tests que replican los casos de `MangaCount.Server.Tests`.
- Empaquetado: `dist` encadena `build:renderer`; la primera corrida de `electron-builder` reconstruye `better-sqlite3` para el ABI de Electron, por lo que `npm test` (Node) debe volver a reconstruirlo para Node o usar un cache separado (documentar el ida y vuelta).
- Instaladores: `exe` instala y abre en Windows, `deb` instala en Debian/Ubuntu, `AppImage` corre en Arch; en los tres la colección persiste entre reinicios, el TSV importa/exporta y la foto de perfil se muestra.
- Limpieza: `git grep` sin referencias a `localhost:63920`, `ASPNETCORE_`, `Npgsql`, `Dapper`, `192.168.0.50`, `loadbearing`, `/api/database/nuke` salvo en docs históricas; `README.md` describe solo instalación local.
