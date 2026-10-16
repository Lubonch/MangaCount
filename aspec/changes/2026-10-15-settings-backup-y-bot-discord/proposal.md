# Proposal: Pantalla de Settings unificada (Backup, Intercambio y Bot) + backup/restore del sistema + app residente en bandeja con bot de Discord (solo consulta)

> Change fusionado: reúne `2026-10-13-backup-y-pantalla-settings` y `2026-10-07-bot-discord-consulta`
> porque ambos introducen y consumen la **misma pantalla de Settings**, que todavía no existe. En vez
> de crear dos superficies de configuración, se crea una sola con secciones **Backup**,
> **Intercambio** y **Bot**.

## Problem

Dos necesidades convergen en una misma superficie que hoy no existe.

**A) Recuperación del estado y configuración dispersa.**

- MangaCount es local-first: todo el estado vive en `<userData>` (`mangacount.db` con WAL,
  `profiles/` con las fotos de perfil, `preferences.json`, `logs/`) y no hay servidor ni nube. En
  consecuencia **no hay forma de recuperar el estado ante un formateo o una reinstalación**:
  perder la carpeta de usuario implica perder la colección completa, los perfiles y las fotos. No
  existe backup, restore ni copia automática.
- **No existe una pantalla de Settings.** La configuración está dispersa: `prefs.js`
  (`electron/main/services/prefs.js`) tiene `loadPrefs/savePrefs` pero **ningún canal IPC lo
  expone**; el único ajuste con UI es el tema (`ThemeToggle`).
- **El intercambio de datos está mal ubicado y es incompleto.** El import TSV vive dentro de
  `Sidebar.jsx` (ensucia el front, que es una colección, no una pantalla de configuración) y el
  export TSV **tiene canal pero no tiene UI** (`entry:export`, `electron/main/ipc/handlers.js:80`).

**B) El bot de WhatsApp quedó huérfano y roto.**

- Es un cliente HTTP del backend .NET/PostgreSQL eliminado en 1.0.1: `WhatsappBot/.env.example`
  apunta a `MANGA_API_URL=http://localhost:3000/api` y `WhatsappBot/src/api.js` consume `/profile`,
  `/entry` y `/recommendation` de una API que ya no existe. Además `whatsapp-web.js` es una
  librería no oficial (viola los ToS de WhatsApp, riesgo de ban del número) que arrastra Chromium
  headless, QR, re-autenticación y una sesión frágil, y no se empaqueta con la app.
- Hoy la colección solo se consulta con la ventana de la app abierta en la misma PC. No hay forma
  de consultarla desde fuera de casa, que era justamente el objetivo original del bot.

Se quiere: poder respaldar y restaurar el sistema completo (para levantarlo igual en otra PC tras un
formateo), un backup automático opcional, un bot de Discord **oficial, estable y disponible desde
cualquier lugar** que arranque con la app sin obligar a mantener la ventana abierta, y **reunir toda
la configuración (backup, intercambio y bot) en una única pantalla de Settings**.

## Proposed change

Agregar tres capacidades que comparten el proceso main de Electron y **una sola pantalla de
Settings** en el renderer, servidas por IPC (handlers puros `(ctx = { db })`, whitelist en
`preload.cjs`, rutas en `localAdapter.js`).

### 1. App residente en bandeja (tray)

La app pasa a **modo residente**: cerrar la ventana la oculta en lugar de salir; el menú del tray
ofrece *Abrir*, *Estado del bot*, *Iniciar con el sistema* y *Salir*. El único camino a
`app.quit()` es el ítem *Salir* (flag `isQuitting`). Arranque por defecto en tray
(`startInTray: true`) con argumento `--hidden`. `app.requestSingleInstanceLock()` es obligatorio
(evita dos conexiones de bot y dos escritores de SQLite). El **autostart** con el sistema es una
opción apagada por defecto: Windows/macOS con `app.setLoginItemSettings`, Linux escribiendo
`~/.config/autostart/mangacount.desktop`.

### 2. Backup y restore del sistema

- **Backup completo a `.zip`**: snapshot consistente de `mangacount.db` (vía `db.backup()` de
  better-sqlite3, nunca copiando el `.db` vivo con WAL) + la carpeta `profiles/` + `manifest.json`.
  Se agrega **`fflate`** como dependencia de compresión. El `preferences.json` **NO** se incluye:
  la config es de la máquina, no del dato.
- **Restore que reemplaza todo**: valida el `.zip` (manifest + `PRAGMA integrity_check`), genera un
  **backup de seguridad** del estado actual, cierra la DB, limpia los sidecar `-wal`/`-shm`,
  reemplaza `mangacount.db` + `profiles/` y reabre (o pide reinicio de la app).
- **Backup automático configurable, apagado por defecto**: al habilitarlo exige **destino** y **al
  menos un disparador**. Disparadores: **al iniciar** (si pasó > X desde el último backup) y
  **mientras la app corre** (intervalo). `onQuit` queda **fuera de alcance**. Retención de los
  **últimos 5** backups. `lastBackupAt` + indicador de último OK/error y log.
- **Sección Intercambio**: se **mueve** el import TSV del sidebar y se **agrega** el export TSV
  (reusa el canal `entry:export` existente). Sigue siendo TSV; **no se agrega CSV**.

### 3. Bot de Discord embebido (solo consulta)

El bot corre **dentro del proceso main**, arranca y se detiene con la app, reutiliza la **misma
conexión SQLite** (`openDb`) y los **handlers IPC puros** `(ctx = { db })`, y opera en **modo solo
consulta**: `/perfil`, `/buscar`, `/pendientes` y `/recomendar`. El comando de escritura
`actualizar` queda fuera de alcance, pero el despacho de comandos se deja preparado (registro nombre
→ función) para incorporarlo sin infraestructura nueva. La lógica de `buscar`/`pendientes` se extrae
de `WhatsappBot/src/commands/*` a `electron/main/services/` para que la compartan IPC y Discord sin
duplicar reglas. La configuración del bot (token cifrado con `safeStorage`, allowlist por guild/user
IDs, toggle ON/OFF) vive en `userData`. El bot de WhatsApp (`WhatsappBot/`) se retira del repo.

### 4. Pantalla de Settings unificada

Una única pantalla **Settings** en `mangacount.client`, abierta desde un engranaje en el `Sidebar`,
con secciones **Backup**, **Intercambio** y **Bot** (más los toggles de arranque en bandeja y de
inicio con el sistema). Es la superficie compartida que motiva la fusión de ambos changes.

## Scope

In scope:

- Dependencia `fflate` (compresión del `.zip` de backup) y `discord.js` (cliente de Discord).
- Servicio de backup en `electron/main/services/` (crear, listar, podar, restaurar) sobre la
  conexión `db` existente y `dataDir`.
- Modo residente en bandeja: `close` → `win.hide()` con flag `isQuitting`, `window-all-closed` no
  cierra la app, menú del tray, ícono, y `app.requestSingleInstanceLock()`.
- Preferencia `startInTray` (default `true`) y argumento `--hidden` para el arranque en tray.
- Autostart por OS con toggle y reflejo del estado real.
- Bot de Discord en el proceso main; registro de **slash commands guild-scoped** (`/perfil`,
  `/buscar`, `/pendientes`, `/recomendar`).
- Reuso directo de `handlers['profile:list']`, `handlers['entry:list']` y
  `getRecommendations(db, profileId, limit)` sobre la conexión `db` existente.
- Extracción de la lógica de consulta de `buscar`/`pendientes` (hoy en `WhatsappBot/src/commands/*`,
  CommonJS) a `electron/main/services/`.
- Estado de sesión por **usuario de Discord** (perfil activo), patrón de `WhatsappBot/src/session.js`
  con clave = user ID de Discord.
- Autorización por **guild ID / user ID** de Discord, en reemplazo de la allowlist por teléfono.
- Almacenamiento del token con `safeStorage`; preferencias del bot en `prefs.js`.
- Canales IPC nuevos: `backup:create`, `backup:restore`, `backup:list`, `backup:config-get`,
  `backup:config-set`, `dialog:pick-directory`, `dialog:pick-file`, y los ajustes del bot
  (get/set token, toggle del bot, estado, autostart).
- Persistencia en `preferences.json` (`prefs.js`): `startInTray`, bloque `backup` (`enabled`,
  `destinationDir`, `intervalMinutes`, `triggers.onStartup`, `triggers.whileRunning`, `lastBackupAt`,
  `lastBackupStatus`) y bloque `bot` (`enabled`, `guildId`, `allowedUserIds`).
- Disparadores de backup: comprobación al iniciar ("vencido por X") + `setInterval` mientras la app
  corre (limpiado al salir).
- Retención de los últimos 5 backups (podando solo archivos que matcheen el patrón propio).
- **Pantalla Settings unificada** con secciones **Backup**, **Intercambio** y **Bot**; entrada de
  navegación (engranaje) en el `Sidebar`.
- Mover el bloque "Import Collection" desde `Sidebar.jsx` a Settings; agregar UI de Export TSV.
- Actualización de `preload.cjs` (whitelist de canales) y `localAdapter.js` (rutas / llamadas
  tipadas).
- Logging del bot a `<userData>/logs` con la política de rotación diaria existente.
- Documentación (`README.md`, `docs/desktop.md`) y `CHANGELOG`.
- Retiro del bot de WhatsApp (`WhatsappBot/`).
- Tests: `node --test` (raíz) para el servicio de backup, el despacho de comandos, la sesión y los
  servicios extraídos (con mocks, sin conexión real a Discord); `vitest` del renderer para la
  pantalla de Settings.

Out of scope:

- Comando `actualizar` (escritura desde Discord): diferido; solo se deja el punto de extensión.
- **CSV**: solo TSV.
- `onQuit` como disparador del backup automático.
- Backup incremental/diferencial, cifrado del `.zip`, subida a la nube o servidor.
- Incluir `logs/` o `preferences.json` dentro del backup.
- Migraciones de esquema históricas: si `SCHEMA_VERSION` avanza, restore de un backup de versión
  distinta se **rechaza** con mensaje claro (no se migra).
- Programación externa (cron / Task Scheduler) fuera de la app; copia de seguridad con la app
  cerrada (fuera de proceso).
- Reranking remoto de recomendaciones (`providers = []` se mantiene).
- Sincronización de la colección a la nube, API HTTP o PostgreSQL: la app sigue local-first.
- Soporte multi-guild/multi-tenant, i18n, comandos de administración o moderación.
- Empaquetar o mantener el bot de WhatsApp.
- Firma de código paga, auto-update, AUR/Snap/Store.

## Risks

- **Autostart en Linux no está soportado por la API de Electron** (`setLoginItemSettings` solo
  Windows/macOS) y con AppImage la ruta cambia en cada arranque. Mitigación: generar
  `~/.config/autostart/mangacount.desktop` resolviendo la ruta real (`process.env.APPIMAGE` o el
  binario del `.deb`) y documentar el caso.
- **Doble instancia** (autostart + apertura manual) crearía dos conexiones de bot y dos escritores de
  SQLite. Mitigación: `app.requestSingleInstanceLock()`; la segunda instancia solo hace `win.show()`
  de la primera.
- **WAL**: zipar o copiar el `.db` vivo mientras hay `-wal` pendiente produce un backup corrupto.
  Mitigación: snapshot exclusivamente con `db.backup(tmp)` (o `VACUUM INTO`), nunca `fs.copyFile` del
  `.db` en caliente.
- **Restore destructivo**: reemplazar todo con el backup equivocado es irreversible. Mitigación:
  validar antes de tocar nada (`PRAGMA integrity_check` + manifest), **backup de seguridad**
  automático del estado actual, limpiar `-wal`/`-shm` viejos antes de reemplazar y confirmación
  explícita en la UI.
- **Destino en el mismo disco**: si el backup automático cae en el mismo disco que `userData`, un
  formateo se lo lleva igual. Mitigación: el destino es **obligatorio y elegido por el usuario** al
  habilitar (disco externo / carpeta sincronizada); se documenta.
- **Fallo silencioso del automático**: disco externo desconectado o carpeta sin permiso. Mitigación:
  registrar el error en el log y reflejar "último backup falló" con fecha/hora en Settings.
- **Versión de esquema**: un backup viejo restaurado sobre un esquema nuevo rompe la app. Mitigación:
  manifest con `schemaVersion`; si no coincide, se rechaza con mensaje claro.
- **Dependencias nuevas** (`fflate`, `discord.js`) en una app offline-first. Mitigación: `fflate` es
  pura/JS (sin binarios nativos ni red, no afecta el empaquetado de `better-sqlite3`); el bot es
  opt-in (apagado hasta configurar token) y degrada en silencio sin red.
- **Backups acumulados** si el destino es compartido. Mitigación: podar solo archivos que matcheen
  `mangacount-backup-*.zip` y conservar los últimos 5.
- **Token de Discord en disco**. Mitigación: `safeStorage` (keychain/DPAPI), nunca en texto plano, en
  `preferences.json` ni en el repo.
- **Arranque en tray sin UI**: si falta el token o no hay red, el bot no debe romper la app.
  Mitigación: inicialización en try/catch, estado visible en el menú del tray, reintento.
- **Cambio de comportamiento de la app** (ahora residente, consume RAM en segundo plano) puede
  sorprender. Mitigación: ítem *Salir* explícito en el tray, `startInTray` configurable y
  documentación.
- **Propagación de slash commands**: los comandos globales tardan en propagarse. Mitigación:
  registrarlos guild-scoped (instantáneo) en el servidor personal.

## Decisión pendiente

Destino del bot de WhatsApp en el repo: **eliminar** `WhatsappBot/` o **archivarlo**. El change asume
eliminarlo; si se prefiere conservar el código, se archiva fuera del árbol activo.
