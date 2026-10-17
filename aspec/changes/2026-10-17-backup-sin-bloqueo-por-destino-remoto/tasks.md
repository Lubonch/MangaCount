# Tasks: Backup sin bloquear la app con un destino remoto lento

## Fase 1 — Worker de filesystem y envoltura con timeout

- [ ] Crear `electron/main/services/fs-worker.js` (`worker_threads`) con las ops `listBackups`,
      `listBackupFiles`, `mkdir`, `writeFile`, `rename`, `rm`, `stat` y protocolo `{ id, op, args }` →
      `{ id, ok, result | error }`.
- [ ] Crear `electron/main/services/remote-fs.js`: worker único + cola, `call(op, args, { timeoutMs })`
      que resuelve `{ ok, result, error, timedOut }`; al vencer, `terminate()` y worker nuevo.
- [ ] Tests de `remote-fs`: camino feliz, error del worker y **timeout** (worker que nunca responde).

## Fase 2 — `backup.js` con destino asíncrono

- [ ] `listBackupFiles`/`listBackups`: async vía `remote-fs`; en timeout lanzar `El destino no responde`.
- [ ] `createBackup`: `mkdir`/`writeFile`/`rename` del destino por el worker (snapshot y zip siguen locales).
- [ ] `pruneBackups`: `rm` por el worker.
- [ ] Tests de `backup`: listar/crear/podar con el worker inyectado (fake) y con directorio local real.

## Fase 3 — Contrato IPC

- [ ] `handlers.js` `backup:list` → `{ backups, status }` con `status` ∈ `unset | ok | unresponsive`;
      en timeout devolver la última lista cacheada por el main.
- [ ] Tests de handlers: `unset`, `ok` y `unresponsive` (timeout).

## Fase 4 — SettingsModal

- [ ] Sacar `backupList()` del `Promise.all` inicial.
- [ ] Cargar la lista al expandir la sección Backup y con un botón **“Refrescar”**, con spinner.
- [ ] Estado `{ backups, status }`: mantener la última lista y mostrar aviso cuando `unresponsive`.
- [ ] Tests de `SettingsModal`: no llama `backup:list` al abrir; carga diferida; aviso de no responde.

## Fase 5 — Gates y verificación

- [ ] `npm test` en verde.
- [ ] `npm run test:coverage` en verde (main ≥90%).
- [ ] `npm run test:renderer:coverage` en verde (≥90%).
- [ ] `npm run lint:renderer` sin errores.
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación manual: con el destino en el montaje rclone, abrir Settings responde al instante y
      expandir Backup no congela la app.
