# Design: I/O del destino de backup fuera del hilo principal

## Approach

Separar **dónde se computa** de **dónde se toca el disco del destino**:

- El trabajo local (temp dir, `db.backup()`, leer `dataDir/profiles`, armar el zip) queda en el hilo
  principal como hoy: es disco local y rápido.
- **Todo acceso al `destinationDir`** (que puede ser un FUSE lento) pasa por un **worker thread** con
  **timeout**, para que el hilo principal y el resto de la app sigan respondiendo.

### 1. `fs-worker.js` (worker_threads)

Recibe `{ id, op, args }` y responde `{ id, ok, result | error }`. Operaciones:

- `listBackups(dir)` → `[{ fileName, path, size, createdAt }]` (equivalente al `listBackups` actual).
- `listBackupFiles(dir)` → `string[]`.
- `mkdir(dir)` / `writeFile(path, bytes)` / `rename(from, to)` / `rm(path)`.
- `stat(path)`.

Sin acceso a la base ni a módulos del main: sólo `node:fs`.

### 2. `remote-fs.js` (envoltura con timeout)

- Mantiene **un** worker vivo y una cola de pedidos.
- `call(op, args, { timeoutMs })` → `Promise<{ ok, result?, error?, timedOut? }>`.
- Al vencer el timeout: `worker.terminate()`, se marca el pedido como `timedOut` y se crea un worker
  nuevo para el siguiente pedido (no se reutiliza el colgado).
- Timeouts por defecto: `list` 5 s, `write`/`rename`/`rm` 60 s (configurables por parámetro).

### 3. `backup.js`

- `listBackups(destinationDir)` → async vía `remote-fs.call('listBackups', …)`; en `timedOut` **lanza**
  `Error('El destino no responde')`.
- `createBackup(...)`: el snapshot y el zip se arman igual (local); `mkdir` del destino, `writeFile` del
  `.tmp` y `rename` final van por el worker.
- `pruneBackups(...)`: `rm` por el worker.
- `listBackupFiles`/`listBackups` dejan de usar `fs` sincrónico.

### 4. Contrato IPC

`backup:list` pasa a devolver `{ backups, status }`:

- `unset` → no hay `destinationDir` (`backups: []`).
- `ok` → `backups` reales.
- `unresponsive` → timeout: `backups` = última lista cacheada por el main (o `[]`).

`backup:create` no cambia su contrato, pero internamente ya no bloquea.

### 5. `SettingsModal`

- El `Promise.all` inicial **deja de incluir `backupList()`**.
- La lista se pide **al expandir la sección Backup** y con un botón **“Refrescar”**; mientras carga
  muestra un spinner.
- Guarda `{ backups, status }` en estado y, si `status === 'unresponsive'`, muestra un aviso
  (“El destino no responde; reintentá con Refrescar”) manteniendo la última lista visible.

## Architecture

```
SettingsModal
  └─ (expandir Backup / Refrescar) ─► backup:list ─► handlers ─► listBackups (async)
                                                                    │
                                                    remote-fs.call('listBackups', dir, timeout)
                                                                    │
                                                            fs-worker (worker_threads)
                                                                    │
                                                          destinationDir (rclone/FUSE)
   hilo principal NUNCA ejecuta fs sincrónico sobre el destino
```

Archivos:

- **Nuevo**: `electron/main/services/fs-worker.js`, `electron/main/services/remote-fs.js`.
- **Nuevo**: `electron/main/services/remote-fs.test.js`.
- **Modificar**: `electron/main/services/backup.js`, `electron/main/ipc/handlers.js`,
  `mangacount.client/src/components/SettingsModal.jsx` (+ `.css`).
- **Tests**: `backup.test.js`, `handlers.test.js`, `SettingsModal.test.jsx`.
- **Sin cambios**: formato del zip/manifest, retención, `auto-backup.js` (sigue llamando a
  `backup:create`).

## Validation

- **Timeout**: con un worker inyectado que nunca responde, `backup:list` resuelve
  `{ status: 'unresponsive' }` dentro del timeout y **no** bloquea (test con temporizador).
- **Camino feliz**: con un directorio local real, `backup:list` devuelve `{ status: 'ok', backups }` con
  tamaño y fecha, igual que antes.
- **Crear/podar**: `createBackup` escribe el zip vía el worker y `pruneBackups` borra sólo los propios.
- **UI**: abrir Settings **no** dispara `backup:list`; al expandir Backup aparece el spinner; con destino
  lento se ve el aviso y la última lista conocida.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
- **Manual**: con el destino en el montaje rclone, abrir Settings responde al instante; expandir Backup
  puede tardar pero **no** congela la app; el backup automático no la congela.
