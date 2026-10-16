# Design: Pantalla de Settings unificada + backup/restore del sistema + app residente en bandeja con bot de Discord

> Fusiona los diseños de `2026-10-13-backup-y-pantalla-settings` y
> `2026-10-07-bot-discord-consulta`. El eje que los une es la **pantalla de Settings**, que todavía
> no existe: se crea una sola vez, con secciones **Backup**, **Intercambio** y **Bot**.

## Approach

Extender el proceso main de Electron con tres capacidades que comparten la infraestructura existente
(`ctx = { db }`, handlers puros, whitelist en `preload.cjs`, `localAdapter.js`, `prefs.js`), sin
reescribir el transporte ni duplicar lógica, y exponerlas en **una única pantalla de Settings** en el
renderer.

1. **Modo residente en bandeja (tray) primero.** Sin esto el bot muere al cerrar la ventana
   (`electron/main/index.js:92`, `window-all-closed` → `app.quit()`). Se introduce un `Tray` con
   menú, `close` → `win.hide()` con flag `isQuitting`, `startInTray` (default `true`) y
   `requestSingleInstanceLock()`.
2. **Servicio de backup dedicado** en `electron/main/services/backup.js`, con funciones puras sobre
   `(db, dataDir, config)` para poder testearlas con `node --test` y un `dataDir` temporal.
3. **Snapshot consistente de SQLite** con `db.backup(destino)` de better-sqlite3 (online, respeta
   WAL). Se snapshotear a un temporal, se comprime y recién ahí se escribe el `.zip` definitivo.
4. **`.zip` con `fflate`** conteniendo `mangacount.db` + `profiles/` + `manifest.json`. Sin
   `preferences.json` ni `logs/`.
5. **Restore destructivo con red**: validación → backup de seguridad → cierre de DB → limpieza de
   WAL → reemplazo → reapertura/reinicio.
6. **Bot embebido en el main, sobre la misma conexión `db`.** `initBackend()` ya abre
   `openDb(dataDir)` (`index.js:50`). El bot recibe ese mismo `ctx = { db }`, así que no hay segundo
   escritor ni problema de WAL. Los handlers IPC ya son funciones puras `(ctx, ...args)`, por lo que
   el bot los invoca igual que el renderer.
7. **Solo consulta, con seam para escritura.** Se implementan `/perfil`, `/buscar`, `/pendientes`,
   `/recomendar` sobre `profile:list`, `entry:list` y `getRecommendations`. El despacho es un
   **registro nombre → función**; `actualizar` se agrega luego como una entrada que llame a
   `entry:upsert` sobre la misma conexión.
8. **Reuso de la lógica de consulta.** `buscar`/`pendientes` hoy viven en
   `WhatsappBot/src/commands/*` (CommonJS, acoplados a `msg.reply`). Se extraen a
   `electron/main/services/` como funciones que devuelven datos; IPC y Discord formatean la salida.
   Así la regla de negocio queda en un solo lugar (`copilot-instructions.md`: no duplicar lógica).
9. **Disparadores de backup configurables** desde `prefs.js`: al iniciar (vencido) y mientras corre.
   `onQuit` queda fuera de alcance por riesgo de cuelgue en el cierre.
10. **Config y secretos.** Preferencias en `prefs.js` (`userData/preferences.json`): `startInTray`,
    bloque `backup` y bloque `bot`. El token de Discord se cifra con `safeStorage`.
11. **Autostart por OS**, como opción (toggle). Win/macOS con `setLoginItemSettings`; Linux con
    `.desktop` en `~/.config/autostart/`.
12. **Pantalla Settings unificada** en el renderer con secciones **Backup**, **Intercambio** y
    **Bot**; el import TSV se mueve desde `Sidebar.jsx` y se agrega Export TSV.
13. **Retiro de WhatsApp al final**, una vez que el bot de Discord esté verde.

## Architecture

```text
Electron main (Node, "type":"module")
├── index.js
│   ├── requestSingleInstanceLock()                ← una sola instancia
│   ├── openDb(dataDir) ───────────────────────────┐
│   ├── registerHandlers(ipcMain, {db, dataDir}) ──┼─▶ renderer (window.mangaCount)
│   │        └── NUEVO: backup:create / restore / list / config-get / config-set
│   │        └── NUEVO: dialog:pick-directory / dialog:pick-file
│   │        └── NUEVO: bot:config-get / config-set / set-token / status / autostart
│   │        └── NUEVO: app:config-get / config-set   (startInTray)
│   ├── createTray()                               │   Abrir / Estado bot / Iniciar con el sistema / Salir
│   ├── scheduleAutoBackup({db, dataDir, prefs})   ← NUEVO
│   │        ├── al iniciar: ¿now - lastBackupAt > interval? → backup
│   │        └── setInterval(interval) mientras la app vive (limpiado al salir)
│   ├── startDiscordBot({db, prefs})               ← NUEVO
│   │        └── discord.js client
│   │              └── commands registry
│   │                    ├── /perfil     → handlers['profile:list']({db})
│   │                    ├── /buscar     → services/busqueda.js + handlers['entry:list']({db}, pid)
│   │                    ├── /pendientes → services/busqueda.js + handlers['entry:list']({db}, pid)
│   │                    ├── /recomendar → getRecommendations(db, pid, limit)
│   │                    └── (futuro) /actualizar → handlers['entry:upsert']({db}, ...)
│   └── serveProfileImages(dataDir)
├── services/backup.js   ← NUEVO: snapshot, zip, unzip, validate, prune, restore
├── services/  (NUEVO: buscar/pendientes extraídos de WhatsappBot)
├── services/prefs.js    ← extender: `startInTray`, bloque `backup`, bloque `bot`
├── db/client.js         ← reusa openDb / SCHEMA_VERSION
└── secrets (safeStorage → token de Discord)

Renderer (mangacount.client)
├── components/SettingsModal.jsx   ← NUEVO (General + Backup + Intercambio + Bot + Danger Zone)
├── components/Sidebar.jsx         ← acceso a Settings; se le quita "Import Collection" y la Danger Zone
└── api/localAdapter.js            ← NUEVO: /api/backup/*, /api/bot/*, /api/app/config, dialog:*
```

La ventana del renderer se puede ocultar y recrear; el main (y el bot) sobrevive.

## Ciclo de vida

```text
                        app.whenReady()
                              │
                ┌─────────────┴─────────────┐
        startInTray=true               startInTray=false
        (o arg --hidden)                    │
                │                     createWindow() + show()
        createTray() (sin ventana)          │
                │                           │
                └───────────┬───────────────┘
                            │
                     startDiscordBot()  (si bot.enabled y hay token)
                            │
                     scheduleAutoBackup()  (si backup.enabled)
                            │
        ┌───────────────────┼───────────────────────┐
   clic "Abrir"        close ventana           tray "Salir"
        │                   │                       │
   win.show()      e.preventDefault()        app.isQuitting = true
                   win.hide()                       │
                                            stopDiscordBot() + clearInterval() + db.close()
                                                app.quit()
```

- `window-all-closed` **no** llama a `app.quit()`: la app queda residente.
- El único camino a `app.quit()` es el ítem *Salir* del tray (o el cierre del SO).
- `before-quit` detiene el bot, limpia el `setInterval` de backup y cierra la `db` como ya hace hoy
  (`index.js:57`).

## Instancia única

```js
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
```

Necesario porque el autostart + una apertura manual producirían dos procesos: dos conexiones del bot
a Discord y dos escritores de SQLite.

## Autostart por plataforma

| Plataforma | Mecanismo | Notas |
|---|---|---|
| Windows | `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })` | API oficial |
| macOS | `app.setLoginItemSettings(...)` | API oficial |
| Linux | Escribir/borrar `~/.config/autostart/mangacount.desktop` | **No** hay API de Electron |

En Linux, `Exec=` debe apuntar a una ruta estable:

- AppImage: resolver desde `process.env.APPIMAGE` (la ruta del mount `/tmp/.mount_*` cambia).
- `.deb`: usar el binario instalado (p. ej. `/usr/bin/mangacount` o el `Exec` del `.desktop` del paquete).

El toggle en Settings escribe/elimina el archivo y refleja el estado real (leer el `.desktop`, no
asumir).

## Formato del backup

```text
mangacount-backup-<YYYY-MM-DD-HHmm>.zip
├── manifest.json      { app: "MangaCount", schemaVersion: 1, createdAt, files: [...] }
├── mangacount.db      ← snapshot consistente (sin -wal/-shm)
└── profiles/          ← fotos de perfil (profile_<id>_<uuid>.ext)
```

- Nombres con timestamp; el **patrón del archivo** define qué se puede podar (nunca se tocan archivos
  ajenos en la carpeta destino).
- `manifest.json` permite rechazar archivos que no son backups de MangaCount o de un esquema
  incompatible antes de tocar nada.

## Config persistida (`preferences.json`, vía `prefs.js`)

```jsonc
{
  "startInTray": true,             // arranque en bandeja por defecto
  "backup": {
    "enabled": false,              // default OFF
    "destinationDir": null,        // obligatorio al habilitar
    "intervalMinutes": 1440,       // "cada X tiempo" (default 24h)
    "triggers": {
      "onStartup": true,           // si pasó > X desde el último backup
      "whileRunning": false        // setInterval mientras la app vive
    },
    "lastBackupAt": null,          // ISO; se actualiza en cada backup OK
    "lastBackupStatus": null       // { ok, at, error } para el indicador
  },
  "bot": {
    "enabled": false,              // default OFF (opt-in)
    "guildId": null,
    "allowedUserIds": []           // allowlist vacía = no responde a nadie
  }
  // token de Discord: NO acá; cifrado con safeStorage en userData
}
```

Reglas:

- `backup.enabled = true` **exige** `destinationDir` y al menos un disparador (`onStartup` o
  `whileRunning`). En la UI los campos están ocultos/deshabilitados hasta tildar "Habilitar backup
  automático".
- `bot.enabled` con allowlist vacía no responde a nadie; sin token el cliente no arranca.

## Flujo de backup

```text
backup:create
  1. resolver destino + nombre con timestamp
  2. db.backup(<tmpDir>/mangacount.db)        ← snapshot online consistente (WAL-safe)
  3. zip( fflate: manifest.json + mangacount.db + profiles/ ) → <tmp>/backup.zip
  4. move atómico a <dest>/mangacount-backup-<stamp>.zip
  5. prune: conservar los últimos 5 (solo patrón propio)
  6. lastBackupAt = now; lastBackupStatus = { ok:true, at }
  ── en error: log + lastBackupStatus = { ok:false, at, error } (no rompe la app)
```

## Flujo de restore

```text
backup:restore(zipElegido)
  1. unzip a <tmp>            (fflate)
  2. validar: manifest.json presente + app/schemaVersion + PRAGMA integrity_check del .db
  3. safety-backup: backup() del estado ACTUAL → <dest> o <userData>/backups-restore
  4. cerrar db
  5. reemplazar mangacount.db y borrar -wal/-shm viejos; reemplazar profiles/
  6. reabrir db  (o pedir reinicio de la app si el reemplazo lo requiere)
  7. devolver { restored: true, safetyBackup: <ruta> }
```

Confirmación explícita en la UI antes de `backup:restore` (acción destructiva).

## Disparadores de backup (máquina de estados)

```text
app.whenReady()
      │
prefs.backup.enabled ?
      │ no ──► (manual disponible siempre)
      │ sí
      ├─ triggers.onStartup  ──► ¿now - lastBackupAt > intervalMinutes? ─► backup
      └─ triggers.whileRunning ─► setInterval(intervalMinutes) ─► backup
                                        │
before-quit ─────────────────────────► clearInterval()   (sin backup en quit)
```

- Un `setInterval` muere al cerrar la app: por eso `onStartup` es el disparador robusto para quien
  cierra/reinicia seguido; `whileRunning` complementa sesiones largas.
- `onQuit` **fuera de alcance**.

## Token y configuración del bot

- `startInTray` (default `true`), `bot.enabled`, `bot.guildId`, `bot.allowedUserIds` → `prefs.js`.
- Token de Discord → `safeStorage.encryptString` / `decryptString`, persistido en `userData` como
  blob. Nunca en `preferences.json` en claro, nunca en el repo.
- Sin token o con `bot.enabled=false`, el cliente no se inicia y el estado del tray muestra
  *Bot: apagado*.

## Seam para `actualizar`

```js
const commands = {
  perfil:     (db, user) => ...,
  buscar:     (db, user, q) => ...,
  pendientes: (db, user) => ...,
  recomendar: (db, user, n) => ...,
  // actualizar: (db, user, args) => handlers['entry:upsert']({db}, {...})  ← futuro
};
```

Agregar escritura más adelante no requiere transporte, API ni sync: es una entrada más sobre la misma
conexión.

## Reuse map

| Capacidad | Fuente a reusar |
|---|---|
| Snapshot SQLite | `db.backup(dest)` de better-sqlite3 sobre la conexión de `openDb` |
| Ruta de datos | `app.getPath('userData')` (ya inyectado como `dataDir`) |
| Versión de esquema | `SCHEMA_VERSION` de `electron/main/db/client.js` |
| Config | `loadPrefs/savePrefs` de `electron/main/services/prefs.js` |
| Directorio de fotos | `path.join(dataDir, 'profiles')` (convención de `services/files.js`) |
| Export TSV | `handlers['entry:export']` (`electron/main/ipc/handlers.js:80`) |
| Listar perfiles | `handlers['profile:list']` (`ipc/handlers.js`) |
| Listar entradas del perfil | `handlers['entry:list']({db}, profileId)` |
| Recomendaciones | `getRecommendations(db, profileId, limit)` (`services/recommendations.js`) |
| Lógica buscar/pendientes | Extraer de `WhatsappBot/src/commands/*` a `electron/main/services/` |
| Sesión por usuario | Patrón de `WhatsappBot/src/session.js`, clave = Discord user ID |
| Autorización | Reemplazo de `WhatsappBot/src/authorization.js` por guild/user IDs |
| Logging | `services/logger.js` → `<userData>/logs` |

## Renderer: Settings unificada

```text
Settings (nuevo, abierto desde el engranaje del Sidebar)
├── General
│   ├── [✓] Arrancar en la bandeja (startInTray)         (default ON)
│   └── [✓] Iniciar con el sistema (autostart)           (default OFF)
├── Backup
│   ├── [✓] Habilitar backup automático                  (default OFF)
│   ├── Destino:  [ /ruta/elegida ]                      ← dialog:pick-directory
│   ├── Cada [ 24 h ]                                    ← intervalMinutes
│   ├── Disparadores: [✓] al iniciar   [ ] mientras corre
│   ├── Últimos 5 · último OK: <fecha> · último error: <msg>
│   ├── [ Backup ahora ]   [ Restaurar… ]                ← dialog:pick-file + confirmación
├── Intercambio
│   ├── Import TSV   (movido desde Sidebar.jsx)
│   └── Export TSV   (reusa entry:export)
└── Bot (Discord, solo consulta)
    ├── [✓] Habilitar bot                                (default OFF)
    ├── Token:  [ •••••••• ]  [Guardar]                  ← cifrado con safeStorage
    ├── Guild ID:  [ ........ ]                          ← autorización
    ├── Usuarios permitidos: [ ids ]                     ← allowlist (vacía = nadie)
    └── Estado: conectado / desconectado / sin token / apagado
└── Danger Zone
    └── [ 💥 Nuclear Option ]                            ← NukeDataModal (borra todo y re-siembra)
        └── onSuccess → recargar perfiles y re-seleccionar (handleDataReset en App.jsx)
```

El estado del último backup y el estado de conexión del bot se reflejan al reabrir Settings.

## Validation

- **Backup manual**: `backup:create` produce un `.zip` en el destino con `manifest.json`,
  `mangacount.db` y `profiles/`; el `.db` abre limpio (`integrity_check` ok).
- **Snapshot WAL-safe**: con la app corriendo y escrituras recientes, el `.db` del backup abre sin
  errores (no se copia el `.db` en caliente).
- **Retención**: tras 6 backups quedan 5; archivos ajenos en la carpeta no se tocan.
- **Restore**: restaurar un backup sobre un estado distinto deja el estado idéntico al del backup; se
  genera un safety-backup del estado previo antes de reemplazar.
- **Rechazo**: un zip sin manifest, con `app` distinto o `schemaVersion` incompatible se rechaza con
  mensaje claro y sin modificar datos.
- **Automático**: con `enabled` y `onStartup`, reiniciar la app con el intervalo vencido dispara el
  backup; con `whileRunning`, el intervalo dispara mientras la app vive.
- **Gate de config**: no se puede guardar `backup.enabled=true` sin destino ni sin al menos un
  disparador.
- **Degradación de backup**: destino inexistente o sin permiso registra el error, marca el indicador
  de fallo y no rompe la app.
- **Tray**: cerrar la ventana deja el proceso vivo; *Abrir* la muestra de nuevo; *Salir* termina el
  proceso y el bot. Verificado en Linux (deb/AppImage) y Windows.
- **Instancia única**: lanzar la app dos veces solo enfoca la primera; una sola conexión de bot.
- **Bot**: `/perfil`, `/buscar`, `/pendientes`, `/recomendar` responden con datos reales de la
  colección; los comandos se registran guild-scoped.
- **Autorización**: un usuario/guild fuera de la allowlist no recibe respuesta.
- **Degradación del bot**: sin token o sin red, la app arranca normal y el bot queda *apagado*; no hay
  crash.
- **Autostart**: el toggle crea/elimina el `.desktop` (Linux) o el login item (Win/macOS) y el estado
  se refleja al reabrir Settings.
- **No regresión**: la app desktop sigue funcionando igual (CRUD, import/export, recomendaciones,
  fotos) con el bot apagado y el backup deshabilitado.
- **Tests**: `node --test` para `services/backup.js` (crear/podar/validar/restore con tmp dir), el
  despacho de comandos, la sesión y los servicios extraídos con mocks (sin conexión real a Discord);
  `vitest` para la pantalla Settings (gate de config, indicadores, mover import, bot).
