# Tasks: Pantalla de Settings unificada (Backup, Intercambio y Bot) + backup/restore del sistema + app residente en bandeja con bot de Discord

> El orden refleja dependencias: primero la app residente (tray), después el servicio de backup y
> los canales IPC, luego el bot y el autostart, y **al final** la pantalla de Settings, que depende
> de todos los canales anteriores.

## Fase 0 — Preparativos de Discord (los hacés vos, sin código)

Estos pasos se completan **antes de escribir código**. Ninguno toca el repositorio.

- [x] Crear la aplicación/bot en el **Discord Developer Portal**
      (https://discord.com/developers/applications) y anotar el **Application ID**.
      → valor de ejemplo: `6862722811959951444`.
- [x] En la sección *Bot*, generar y copiar el **Token**. Guardarlo en un gestor de secretos
      (nunca en el repo, ni en un `.env` versionado, ni en `preferences.json`).
- [x] Invitar el bot al servidor con los scopes `bot` + `applications.commands` (OAuth2 URL
      Generator) y permisos mínimos: *Send Messages* y *Use Slash Commands* (sin administrador).
- [x] Habilitar *Developer Mode* en Discord y copiar el **Guild ID** (Server ID) y tu **User ID**.
      → valores de ejemplo: Guild `6866769530454846357`, User `1875861368927281920`.
- [x] Confirmar que el bot operará **solo en ese servidor** (guild-scoped) y anotar los IDs
      autorizados (guild y/o usuarios). → ejemplo: guild `6866769530454846357`; allowlist = `1875861368927281920`.
- [x] Decidir el **ícono del tray**: reusar `build/icon.png` o preparar uno de 16/32 px.
      → generado `electron/assets/tray-icon.png` (32×32) desde `build/icon.png`.
- [x] Confirmar en qué equipos se usará el autostart (Linux `.deb`/AppImage y/o Windows) para poder
      validarlo. → Linux (este equipo) y Windows.
- [x] Confirmar el **destino del bot de WhatsApp** (`WhatsappBot/`): eliminar del repo o archivar.
      → eliminar del repo.

## Fase 1 — App residente en bandeja y ciclo de vida

- [x] `app.requestSingleInstanceLock()` + `second-instance` → `win.show()` de la instancia viva
- [x] Crear el `Tray` con ícono y menú: *Abrir*, *Estado del bot*, *Iniciar con el sistema*, *Salir*
- [x] `close` → `e.preventDefault()` + `win.hide()` con flag `app.isQuitting`; *Salir* setea el flag
      y llama a `app.quit()`
- [x] `window-all-closed` deja de llamar a `app.quit()` (excepto macOS se mantiene)
- [x] Preferencia `startInTray` (default `true`) y argumento `--hidden` para arrancar sin ventana
- [x] Tests de ciclo de vida donde no haga falta Electron real

## Fase 2 — Servicio de backup (`electron/main/services/backup.js`)

- [x] Agregar dependencia `fflate` a `package.json`
- [x] `createBackup(db, dataDir, destinationDir)`: snapshot con `db.backup(tmp)` + zip
      (`manifest.json` + `mangacount.db` + `profiles/`) + move atómico al destino
- [x] Nombre con timestamp `mangacount-backup-<YYYY-MM-DD-HHmm>.zip`
- [x] `pruneBackups(destinationDir, keep = 5)`: conservar los últimos 5, solo patrón propio
- [x] `listBackups(destinationDir)`: listar con fecha/version desde el nombre o el manifest
- [x] `validateBackup(zipPath)`: manifest presente + `app`/`schemaVersion` + `PRAGMA integrity_check`
- [x] `restoreBackup(db, dataDir, zipPath)`: validate → safety-backup → cerrar DB → limpiar
      `-wal`/`-shm` → reemplazar `mangacount.db` + `profiles/` → reabrir
- [x] Manejo de errores: log + `lastBackupStatus` sin romper la app
- [x] Tests `node --test` con `dataDir`/destino temporales (crear, podar, validar, restaurar)

## Fase 3 — Config, canales IPC y adaptador

- [x] Extender `prefs.js`: `startInTray`; bloque `backup` (`enabled`, `destinationDir`,
      `intervalMinutes`, `triggers.onStartup`, `triggers.whileRunning`, `lastBackupAt`,
      `lastBackupStatus`); bloque `bot` (`enabled`, `guildId`, `allowedUserIds`)
- [x] Gate de config de backup: `enabled=true` exige `destinationDir` y al menos un disparador
- [x] Guardar/leer el token de Discord con `safeStorage` (con fallback documentado si no está
      disponible)
- [x] Handlers nuevos en `ipc/handlers.js`: `backup:create`, `backup:restore`, `backup:list`,
      `backup:config-get`, `backup:config-set`
- [x] Handlers del bot: `bot:config-get`, `bot:config-set`, `bot:set-token`, `bot:status`,
      `bot:autostart-get`/`bot:autostart-set`
- [x] Handlers de diálogo: `dialog:pick-directory`, `dialog:pick-file` (via `dialog` de Electron)
- [x] Registrar los canales en la whitelist de `preload.cjs`
- [x] Conectar las rutas / llamadas tipadas en `mangacount.client/src/api/localAdapter.js`

## Fase 4 — Disparadores automáticos de backup

- [x] `scheduleAutoBackup({db, dataDir, prefs})` en `index.js`
- [x] `onStartup`: si `enabled` y `now - lastBackupAt > intervalMinutes` → backup
- [x] `whileRunning`: `setInterval(intervalMinutes)` mientras la app vive
- [x] Limpiar el intervalo en `before-quit` (sin backup en quit)
- [x] No disparar si falta destino o la config es inválida; log ante fallo

## Fase 5 — Extraer la lógica de consulta a servicios compartidos

- [x] Portar `buscar` y `pendientes` de `WhatsappBot/src/commands/*` a
      `electron/main/services/` como funciones que devuelven datos (sin `msg.reply`)
- [x] Tests que repliquen los casos de `WhatsappBot/src/commands/*.test.js`
- [x] Confirmar que los handlers IPC existentes siguen verdes tras el refactor

## Fase 6 — Bot de Discord (solo consulta)

- [x] Agregar `discord.js` y crear el cliente en el main
- [x] Registrar slash commands guild-scoped: `/perfil`, `/buscar`, `/pendientes`, `/recomendar`
- [x] Implementar el despacho como registro nombre → función (seam para `/actualizar`)
- [x] Autorización por guild/user IDs (reemplaza la allowlist por teléfono)
- [x] Sesión por Discord user ID para recordar el perfil activo
- [x] Formateo de respuestas reusando los datos de los servicios extraídos
- [x] Arranque/parada atados a `whenReady` / `before-quit`; respetar el toggle; estado en el tray
- [x] Fallos de red o token inválido no rompen la app; log a `<userData>/logs`
- [x] Tests del despacho y los comandos con mocks (sin conexión real a Discord)

## Fase 7 — Autostart por sistema operativo

- [x] Windows/macOS: `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })`
- [x] Linux: escribir/eliminar `~/.config/autostart/mangacount.desktop` resolviendo la ruta real
      (`process.env.APPIMAGE` para AppImage; binario del `.deb` en su caso)
- [x] Toggle en Settings + reflejo del estado real (leer el login item / el `.desktop`)

## Fase 8 — Pantalla Settings unificada en el renderer

- [x] Crear `components/SettingsModal.jsx` (+ CSS) con secciones **General**, **Backup**,
      **Intercambio** y **Bot**
- [x] Sección General: toggle "arrancar en la bandeja" y toggle "iniciar con el sistema"
- [x] Sección Backup: toggle "habilitar", destino (picker), intervalo, disparadores, indicador
      último OK/error, [Backup ahora], [Restaurar…] con confirmación destructiva
- [x] Gate de UI de backup: campos ocultos/deshabilitados hasta habilitar; no guardar inválido
- [x] Sección Bot: toggle, token (cifrado), guild ID, allowlist (guild/user IDs), estado de conexión
- [x] Sección Intercambio: mover el bloque "Import Collection" desde `Sidebar.jsx`
- [x] Agregar botón Export TSV (reusa `entry:export` vía `localAdapter`)
- [x] Engranaje de Settings en `Sidebar.jsx` y estado de apertura en `App.jsx`
- [x] Tests `vitest` para Settings (gate de backup, indicadores, import movido, export, bot)

## Fase 9 — Documentación y cierre

- [x] Actualizar `README.md` y `docs/desktop.md` (backup, restore, destino, disparadores, TSV, tray,
      autostart, bot, manejo del token)
- [x] Actualizar `CHANGELOG.md`
- [x] Ejecutar el retiro del bot de WhatsApp (`WhatsappBot/`) según la decisión de Fase 0
- [x] Verificación cruzada contra proposal (qué), design (cómo) y delta specs de este change
- [x] Correr `npm test` (raíz) y la suite del renderer en verde
