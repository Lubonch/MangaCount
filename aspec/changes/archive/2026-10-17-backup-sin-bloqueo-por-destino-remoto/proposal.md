# Proposal: Backup sin bloquear la app con un destino remoto lento

## Problem

Cuando el destino de backup está en un **montaje de red lento** (p. ej. Google Drive vía rclone en
`~/Cloud/drive/...`), **abrir Settings deja la app “no responde” por un rato**: el proceso main se
bloquea esperando al montaje.

Causa raíz (verificada en el código):

- `electron/main/services/backup.js` usa **fs sincrónico sobre el destino**:
  - `listBackupFiles()`: `fs.existsSync` + `fs.readdirSync`.
  - `listBackups()`: `fs.statSync` por archivo.
  - `createBackup()`: `fs.mkdirSync` + `fs.writeFileSync` + `fs.renameSync`.
  - `pruneBackups()`: `fs.rmSync`.
- `handlers.js` `backup:list` llama a `listBackups(destinationDir)`.
- `SettingsModal` **lo invoca al abrir** (dentro del `Promise.all` del `useEffect`).

Como Electron ejecuta el main en un único hilo, una llamada sincrónica que espera a rclone **congela
toda la app** (IPC incluido) hasta que el montaje responde. Además, el **backup automático**
(`onStartup` / `whileRunning`) escribe en el mismo destino con fs sincrónico, así que también puede
congelar en cualquier momento.

## Opinion / recommendation

- **La app no debería tocar el destino en el arranque de Settings**: listar backups es una acción
  puntual, no parte del estado de configuración. Se debe cargar **bajo demanda** y con **timeout**.
- **Ninguna operación sobre el destino debe correr en el hilo principal**. Lo correcto es moverla a un
  **worker thread** con timeout, porque incluso `fs.promises` (libuv) puede consumir hilos y colgarse
  contra un FUSE sin responder.
- **Setup**: mientras tanto, el workaround del lado del usuario es apuntar el backup a una carpeta
  **local** (p. ej. `~/.local/share/mangacount-backups/`) y dejar que **rclone sincronice** esa carpeta
  con Drive (rclone maneja reintentos y no bloquea a nadie). La app igual debe ser robusta a destinos
  lentos.

## Proposed change

1. **Worker de filesystem** (`electron/main/services/fs-worker.js`): un `worker_threads` que ejecuta
   operaciones por ruta (listar, `stat`, `mkdir`, `writeFile`, `rename`, `rm`) y responde por mensajes.
2. **Envoltura con timeout** (`electron/main/services/remote-fs.js`): encola la operación en el worker y
   resuelve con `{ ok, result }` o `{ ok: false, timeout: true }`; al vencer, **termina el worker** y
   crea uno nuevo para la próxima llamada.
3. **`backup.js`**: las funciones que tocan el destino pasan a **async** y usan el worker
   (`listBackups`, `createBackup`, `pruneBackups`); el trabajo local (temp, `db.backup()`, leer
   `dataDir/profiles`) queda igual.
4. **Contrato `backup:list`**: devuelve `{ backups, status }` con `status` ∈ `ok | unresponsive | unset`.
5. **SettingsModal**: deja de pedir la lista en el `Promise.all` inicial; la carga **al expandir Backup**
   o con **“Refrescar”**, muestra la última lista conocida (cache) y un aviso si el destino no responde.
6. **Backup automático**: sigue en background, pero el I/O del destino va por el worker (no congela).

## Scope

**In scope**

- `electron/main/services/fs-worker.js` (nuevo), `remote-fs.js` (nuevo) y tests.
- `electron/main/services/backup.js`: destino async vía worker; tests.
- `electron/main/ipc/handlers.js`: `backup:list` con `{ backups, status }`; tests.
- `mangacount.client/src/components/SettingsModal.jsx` (+ `.css`): carga diferida, cache, aviso y
  “Refrescar”; tests.

**Out of scope**

- Cambiar el formato del backup (zip + manifest) o la retención.
- Sincronización con la nube propia de la app (se sigue delegando en rclone/Drive del usuario).
- Detección de tipo de montaje (`statfs`) — queda como mejora futura opcional.
- Backups incrementales o en streaming.

## Risks

- **Complejidad de un worker**: mitigación → el worker es genérico y sólo recibe rutas + operación; sin
  acceso a `better-sqlite3` (que no cruza hilos).
- **Timeout demasiado corto en un destino lento pero sano**: mitigación → timeouts holgados y
  configurables (p. ej. 5 s para listar, 60 s para escribir) y **cache** de la última lista para que la
  UI nunca quede vacía.
- **Worker colgado en un syscall**: `worker.terminate()` no siempre interrumpe un syscall bloqueante;
  mitigación → no reutilizar el worker vencido y crear uno nuevo; el hilo colgado queda aislado.
- **Cambio de contrato `backup:list`**: mitigación → actualizar `SettingsModal` y tests en el mismo
  change; es un consumidor único.
- **Regresión en el backup automático**: mitigación → tests del flujo `onStartup`/`whileRunning` con el
  worker inyectado (fake) y verificación de que no bloquea.
