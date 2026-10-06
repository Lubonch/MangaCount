# Matriz de paridad: endpoint HTTP → canal IPC → DTO

Fuente: `grep` de `fetch('/api/...')` en `mangacount.client/src` (15 formas de URL) y
atributos `[Http*]` de los 9 controllers.

## Leyenda de estado

- `UI verde`: el renderer consume el canal vía adaptador y se verificó ida y vuelta en Electron.
- `handler verde / UI pendiente`: handler IPC + test unitario verdes, **pero el renderer
  todavía llama `fetch('/api/...')` directo** (el adaptador no está cableado en ese componente).
- `pendiente`: sin implementar.
- `eliminado`: se retira sin reemplazo y no debe quedar ninguna referencia.

> **Estado (2026-10-06):** resuelto. El renderer carga `installApiFetchShim()` en `main.jsx`;
> el shim reemplaza `window.fetch` para `/api/*` enrutando a IPC y devolviendo un objeto tipo
> `Response` (`ok`/`status`/`json()`), por lo que los componentes no se reescribieron. Los
> flujos se verificaron con el bundle real del renderer dentro de Electron (perfiles, entries,
> filtros, import TSV, subida y carga de foto por `mangacount://`, recomendación).

| # | Origen renderer | Endpoint HTTP actual | Canal IPC propuesto | DTO | Estado |
|---|---|---|---|---|---|
| 1 | App/ProfileSelector/AddProfileModal | `GET /api/profile` | `profile:list` | ProfileDTO[] | UI verde |
| 2 | AddProfileModal | `POST /api/profile` | `profile:upsert` (crea o renombra por `id`) | — (el handler devuelve `{ok:true}`; el original `{message}`) | UI verde |
| 3 | ProfileSelector | `DELETE /api/profile/{id}` | `profile:delete` | — | UI verde |
| 4 | AddProfileModal | `POST /api/profile/upload-picture/{id}` (multipart) | `profile:upload-picture` | el handler devuelve `{fileName, url}` con `url = mangacount://profiles/<file>`, persistida en `Profile.ProfilePicture` y cargable por `<img>` | UI verde |
| 5 | App | `GET /api/entry?profileId=` | `entry:list` | EntryModel[] | UI verde |
| 6 | AddEntryModal/CollectionView | `POST /api/entry` | `entry:upsert` | — (el handler devuelve EntryModel; el original `{message}`) | UI verde |
| 7 | Sidebar | `POST /api/entry/import/{profileId}` (multipart) | `entry:import` | resultado importación | UI verde |
| 8 | CollectionView | `GET /api/entry/filters/formats?profileId=` | `entry:used-formats` | **`{id,name,count}[]`** (NO `string[]`: el original agrupa y ordena por nombre y el renderer usa `id`/`name`/`count`) | UI verde |
| 9 | CollectionView | `GET /api/entry/filters/publishers?profileId=` | `entry:used-publishers` | **`{id,name,count}[]`** (idem fila 8) | UI verde |
| 10 | App | `GET /api/manga` | `manga:list` | MangaDTO[] | UI verde |
| 11 | AddMangaModal | `POST /api/manga` / `PUT /api/manga/{id}` | `manga:upsert` | MangaDTO | UI verde |
| 12 | AddMangaModal | `GET /api/format`, `POST /api/format` | `format:list`, `format:create` | FormatDTO | UI verde |
| 13 | AddMangaModal | `GET /api/publisher`, `POST /api/publisher` | `publisher:list`, `publisher:create` | PublisherDTO | UI verde |
| 14 | App | `GET /api/recommendation?profileId=&limit=` | `recommendation:get` | RecommendationResponse | UI verde |
| 15 | NukeDataModal | `GET /api/database/statistics`, `POST /api/database/nuke` | `database:statistics`, `database:nuke-local` (redefinido) | — | UI verde |
| 16 | LoadBearingCheck | `GET /api/loadbearing/status` | — (ELIMINAR, sin reemplazo) | — | eliminado |
| 17 | — (sin uso en frontend) | `GET /api/entry/{id}`, `GET /api/entry/shared/{a}/{b}` | `entry:get-by-id` (canal muerto, sin fila propia antes); `shared` sin canal (sin uso) | — | pendiente / sin uso |
| 18 | — (sin uso en frontend) | `POST /api/import/tsv`, `POST /api/import/clear` | — (ELIMINAR, vía muerta; import real es `entry:import`) | — | eliminado |
| 19 | — (sin uso en frontend) | `POST /api/database/preview-deletion`, `POST /api/database/selective-delete` | — (ELIMINAR con NukeDataModal; se reconvierte a borrado local total) | — | decidido |
| 20 | — (sin uso en frontend) | `GET /api/loadbearing/image`, `GET /api/loadbearing/image/{f}` | — (ELIMINAR con load-bearing) | — | eliminado |
| 21 | ProfileSelector (`<img>`) | `GET /api/Profile/image/{fileName}` | **`mangacount://profiles/<fileName>`** (protocolo custom en main) | binario de imagen | UI verde |
| 22 | (agregado, sin UI) | — (nuevo) | `entry:export` | TSV string (8 columnas) | pendiente / agregado |
| 23 | localAdapter (no usado por UI) | `GET /api/profile/{id}` | `profile:get` | ProfileDTO | pendiente / sin uso |
| 24 | localAdapter (no usado por UI) | `GET /api/manga/{id}` | `manga:get` | MangaDTO | pendiente / sin uso |

## Contrato del adaptador

`src/api/localAdapter.js` conserva la forma que esperan los componentes. Opción elegida:

- **Shim `fetch`-compatible**: `installApiFetchShim()` monta `window.fetch` para rutas `/api/*`
  (Response-like `{ ok, status, json() }`) y delega el resto al `fetch` real. Se instala en
  `main.jsx`; fuera de Electron es no-op. Las funciones tipadas (`profileList`, …) siguen
  disponibles para código nuevo (`NukeDataModal`).

## Notas

- Decisiones Fase 0 (defaults del design, 2026-09-29): `Pages/` → eliminar por absorción;
  `NukeDataModal` → reconvertir a borrado local total contra SQLite.
- **Reranking remoto (revisión 2026-10-06):** `electron/main/services/recommendations.js`
  arranca con `providers = []` y no se portaron `OpenRouterRankingProvider` ni
  `GitHubModelsRankingProvider`. La capacidad remota queda **diferida**, no "conservada";
  ver `specs/recomendaciones`.
- `WhatsappBot` consume la API por HTTP (`MANGA_API_URL`): queda fuera de scope y no
  entra en esta matriz; deja de funcionar contra desktop salvo futuro adaptador.
