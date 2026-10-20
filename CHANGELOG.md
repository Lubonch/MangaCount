# Changelog

Todos los cambios relevantes de MangaCount. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado semántico.

## [2.5.0] - 2026-10-19

### Added

- **Revisión de duplicados al importar TSV**: antes de escribir, el import muestra los posibles
  duplicados (contra la colección y contra el mismo archivo) y permite resolver cada par con “Son lo
  mismo” o “No son lo mismo”. El commit es atómico y no escribe nada hasta confirmar.
- **Alta de manga buscando en AniList**: el modal de alta permite buscar el título, elegir un candidato
  y crear el manga con su portada y referencia externa en un solo paso, prefijando título, volúmenes y
  +18. El alta manual sigue disponible cuando no hay coincidencia.

### Changed

- **La prioridad sólo aplica a series incompletas**: al completar una serie se limpia el flag de
  prioridad de forma persistente. La regla se aplica en la capa de datos (lectura y escritura), al
  cambiar el total de tomos y mediante la migración de esquema **v7** para datos existentes. La
  colección, el bot y la exportación TSV respetan el mismo criterio.

### Fixed

- Series terminadas que seguían apareciendo como prioridad.
- Mangas duplicados creados por variaciones de título al importar TSV.

## [2.2.6] - 2026-10-18

### Fixed

- **La app empaquetada no arrancaba**: el `app.asar` se construía **sin `shared/i18n/`**, que el proceso
  main importa, así que la 2.2.5 moría al iniciar con `ERR_MODULE_NOT_FOUND` en todas las plataformas.
  `build.files` pasa a incluir `shared/**/*` (excluyendo los tests) en vez de enumerar subdirectorios.

### Added

- **Verificación del paquete antes de una release**: `npm run smoke:package` construye y **ejecuta** el
  AppImage y falla si la app no arranca, con el job `Packaged app smoke (AppImage boots)` exigido en los
  PRs hacia `main`. Además, `npm test` incluye un test que falla si el main importa algo que el
  empaquetado no incluye.

### Changed

- **Dependencias**: `electron` 44.7.0 → 44.7.2 y, en el renderer, `react`/`react-dom` 19.3.1,
  `vitest` y `@vitest/coverage-v8` 5.0.5, `jsdom` 30.1.3 y `@testing-library/user-event` 14.6.8.
- **Dependabot** ahora apunta a `develop`: sus PRs se abrían contra `main`, donde el protocolo de rama
  los dejaba bloqueados sin poder mergearse.

## [2.2.5] - 2026-10-18

### Added

- **App bilingüe ES/EN**: la interfaz, los mensajes del proceso main y el bot de Discord se traducen,
  con **inglés por defecto** y selector de idioma en Settings. El diccionario ES es 1:1 con los textos
  que ya existían; el EN es nuevo.
- **Bot de Discord — comandos nuevos**: de consulta `/huecos`, `/a-punto`, `/stats` y `/status`, y de
  administración `/backup` (con confirmación y en background). Además, **autocomplete** del parámetro
  de serie, **paginación con botones** en los listados largos, **modal precargado** en `/pending` (con
  el atajo *Confirmar +1 y editar nota* en `/tomo`) y **botones de acción** en los resultados de
  `/buscar`.
- **Ajustes del bot en Settings**: habilitar, guild, usuarios permitidos, **límite por página**,
  respuestas **efímeras**, **TTL de confirmación** y cantidad por defecto de recomendaciones.
- **Recomendaciones dinámicas con AniList**: a partir de la colección, la app recorre el grafo de
  recomendaciones colaborativas de **AniList** (sin API key) y puntúa por rating más similitud
  temática; el **motor local** queda como *fallback* si AniList no responde. Feedback del usuario:
  **"Ya lo tengo"** (vincula la recomendación con un manga propio, o lo crea) y **"No viable"**
  (descarte permanente por perfil), con lista que se **rellena** al descartar, botón de refresco y
  memoria de "ya visto" con vencimiento configurable.
- **README bilingüe**: `README.md` en inglés (por defecto) y `README.es.md` en español, cross-linkeados.

### Changed

- **Settings → Recomendaciones**: activar/desactivar, tamaño de la lista (1–25) y días de memoria de lo
  ya visto (1–365).
- **Limpieza de comentarios y código muerto** en `electron/`, `mangacount.client/src/`, `shared/` y
  `scripts/`: sin cambios de comportamiento; los comentarios quedan en inglés.

### Fixed

- **Bot `/pendientes`**: el límite de 20 series ya no trunca la lista; se pagina con botones.
- **Relleno de recomendaciones**: el pool de AniList se cachea por perfil, así descartar tarjetas no
  vuelve a consultar la API en cada una (antes podía alcanzar el rate limit de AniList).

## [2.2.4] - 2026-10-17

### Added

- **MangaDex como fuente secundaria de portadas**: si **AniList** no devuelve candidatos, la búsqueda
  y el auto-match caen a **MangaDex** (API pública, sin key). Los candidatos muestran su **fuente**
  (`AniList`/`MangaDex`), el contenido +18 se deriva del `contentRating` de MangaDex y el vínculo
  guarda la **procedencia** elegida.

## [2.2.3] - 2026-10-17

### Fixed

- **Backup con destino remoto lento**: abrir **Settings** ya no congela la app. El I/O del directorio de
  destino corre en un **worker thread con timeout** (el snapshot de la base y el zip siguen locales) y la
  lista de backups se carga **bajo demanda** con “Refrescar”, mostrando la última lista conocida y un
  aviso si el destino no responde. El canal `backup:list` ahora devuelve `{ backups, status }`.
- **Settings**: el botón **“Cerrar”** ya no queda pegado a la esquina del modal (padding propio del pie).

## [2.2.2] - 2026-10-17

### Added

- **Flag +18 en la entidad manga**: el indicador de contenido adulto deja de depender del vínculo de
  portada y pasa a `Manga.IsAdult` (migración **v5** con backfill desde el vínculo +18). Nueva casilla
  **“Contenido +18”** en el alta/edición de manga; vincular una portada de AniList +18 promueve el flag
  y una **portada local** ya no queda sin blur.

### Security

- **Portadas locales (`cover:local`)**: el canal solo acepta rutas devueltas por el diálogo nativo
  (permiso de un solo uso otorgado por `dialog:pick-file`) y **re-chequea el tamaño** después de leer,
  cerrando la ventana TOCTOU del cap de 8 MB.

## [2.2.1] - 2026-10-17

### Fixed

- **Editar una entry ya no vuelve a pedir perfil**: `CollectionView` pasa el perfil activo al modal de
  edición y `AddEntryModal` resuelve el `profileId` desde la propia entry (`editEntry.profileId`) con
  fallback al perfil activo. Antes el submit quedaba bloqueado con *“Elegí un perfil antes de guardar”*
  aunque hubiera un perfil seleccionado. El `+1` de la grilla no se veía afectado porque reenvía la
  entry completa con su `profileId`.

## [2.2.0] - 2026-10-16

### Added

- **Portadas locales**: botón **“Buscar en mi PC…”** en el modal de portada, que copia la imagen elegida
  al cache de portadas (`<userData>/covers/`) validando por **magic bytes** (PNG/JPEG/WEBP/GIF; se ignora
  la extensión) y con un **cap de 8 MB**. Un solo cover activo por manga, con **procedencia**
  (`anilist`/`local`) registrada en el vínculo (al vincular se borran los otros refs). Sin cambio de esquema.
- **Blur y badge +18**: la preferencia se **persiste** (`MangaExternalRef.IsAdult`, migración **v4**) y
  `coverMap` pasa a `{ url, isAdult }`; las portadas +18 se muestran **difuminadas con badge** en la
  colección y en los candidatos, con reveal al **hover** (pref ON) o al **click** (pref OFF).

### Changed

- **Settings**: clases propias del modal sobre los **design tokens** (fin de la reutilización de
  `Sidebar.css`), padding consistente y modal **unificado a español**. La sección **“Intercambio”** pasa a
  **“Importar / Exportar (TSV)”**.
- **Sidebar**: los **títulos largos de una sola palabra** de la Biblioteca ya no desplazan los iconos
  (`.manga-info` libera `min-width:0`; `.manga-name` envuelve con `overflow-wrap`).

## [2.1.0] - 2026-10-16

### Added

- **Filtro de contenido +18 en la búsqueda de portadas (AniList)**: por defecto se **excluye** el
  contenido adulto (`isAdult: false`); un **toggle en Settings ▸ Portadas (AniList)** permite incluirlo,
  y en ese caso cada candidato +18 se marca con un **badge `+18`**. Aplica a buscar, auto-match y bulk.

## [2.0.9] - 2026-10-16

### Changed

- **`recommendations.js`**: el hook de providers de reranking ahora se **inyecta por parámetro**
  (`{ providers }`), en vez de un array privado vacío imposible de cubrir. Mantiene el punto de
  extensión y queda testeado (100% líneas).
- **`NukeDataModal`**: se quitaron guards redundantes de `handleNext`/`handleBack` (la UI ya limita los
  pasos) y se corrigió un texto desactualizado (la Nuclear Option ya **no** conserva un perfil).

### Tests

- Cobertura del suite **main** (solo producción, sin archivos de test): **99.8 / 97.9 / 99.4**
  (lines/branches/funcs); **renderer 99.2 / 98.9 / 99.2 / 99.3**. Se excluyen `*.test.js` del reporte.

## [2.0.8] - 2026-10-16

### Added

- **Eliminar mangas**: botón 🗑️ en cada manga del *Manga Library* (con confirmación). Borra el manga
  y sus entradas de la colección (todos los perfiles, por `ON DELETE CASCADE`). Nuevo canal IPC
  `manga:delete`.
- **Buscador en el Manga Library**: filtra por título (y la lista ocupa el alto disponible), útil con
  muchas series.

### Fixed

- **"Perfil no encontrado" al guardar una entry**: el modal usaba un `profileId` **hardcodeado (`1`)** como
  fallback cuando no había perfil seleccionado; con el estado cero ese perfil no existe. Ahora exige un
  perfil válido y avisa en vez de fallar.
- **Crear/editar un manga dejando los volúmenes vacíos**: el formulario mandaba `volumes: null` y
  violaba `Manga.TotalVolumes NOT NULL`, así que no se podía guardar. Ahora vacío/`null`/inválido se
  normaliza a **`0`** (serie en publicación) en el renderer y en el repositorio.

## [2.0.7] - 2026-10-16

### Fixed

- **La app no arrancaba** (regresión desde 2.0.4): `ReferenceError: Cannot access '__dirname' before
  initialization`. El ícono de la ventana (`APP_ICON`) se evaluaba **antes** de declarar `__dirname`.
  Ahora `__dirname` se declara arriba, antes de cualquier uso top-level. **Esta era la causa real de que
  la app no abriera** en 2.0.4/2.0.5/2.0.6.

## [2.0.6] - 2026-10-16

### Fixed

- **Doble clic no abría la ventana**: con *Arranque en bandeja* activo, **todo** lanzamiento (incluido
  abrir el AppImage a mano) arrancaba oculto y parecía que "no iniciaba". Ahora arranca oculto
  **solo el autostart** (`--hidden`); un lanzamiento manual **muestra la ventana**.
- **Instancias colgadas**: un segundo lanzamiento que no obtiene el *single-instance lock* ahora sale
  con `app.exit(0)` (antes podía quedar vivo, y varias instancias se peleaban el lock).
- El autostart arranca oculto según *Arranque en bandeja* (al cambiarlo se reescribe la entrada).

## [2.0.5] - 2026-10-16

### Fixed

- **Auto-update en AppImage**: tras actualizar, electron-updater dejaba `APPIMAGE` (y `ARGV0`) apuntando
  al AppImage **viejo ya borrado**, así que el **update siguiente fallaba** (ENOENT al reemplazar) y se
  salteaba la integración del ícono. Ahora la app **re-deriva la ruta real** del AppImage en ejecución
  (desde `/proc/self/cmdline`) al arrancar.

## [2.0.4] - 2026-10-16

### Fixed

- **Ícono en Linux/Wayland**: la ventana ahora setea el ícono de la app y, al correr como **AppImage**,
  MangaCount registra su `.desktop` + ícono en `~/.local/share` (idempotente, se rehace al abrir), para
  que el compositor de Wayland y el lanzador muestren el **logo** en vez de un ícono genérico.

## [2.0.3] - 2026-10-16

### Changed

- **Bulk de portadas**: ahora trabaja **de a lotes** (tamaño configurable, por defecto 20) con una
  **pausa entre lotes** (por defecto 5 min, con cuenta regresiva), además del espaciado dentro del
  lote, para no acercarse nunca al rate limit de AniList. Se puede **detener** en cualquier momento.

## [2.0.2] - 2026-10-16

### Added

- **Traer portadas faltantes** en Settings: recorre los mangas sin portada **de a lotes**
  (configurable, por defecto 20) con una pausa entre lotes (por defecto 5 min), respetando el límite
  de AniList ~30/min; muestra progreso y se puede detener.

### Changed

- **Sin seed de catálogos ni de perfiles**: una instalación nueva arranca en **estado cero** (sin
  perfiles, sin editoriales ni formatos); el usuario crea el perfil y lo que necesite. La Nuclear
  Option ya no re-crea el perfil por defecto.
- El **dedupe de catálogos ya no corre automáticamente** en la migración: la prevención es la
  búsqueda case-insensitive y la limpieza de datos viejos es a demanda (script).

## [2.0.1] - 2026-10-16

### Fixed

- **Footer y sidebar fijos**: con muchas entries la página entera crecía y el footer y el acceso a
  Settings quedaban al final del scroll. Ahora la app ocupa el alto de la ventana con **scroll interno**.
- **Editoriales/formatos duplicados** (`Ivrea` vs `ivrea`): el alta de catálogos es **case-insensitive**
  (reusa la entrada existente), con índice único `COLLATE NOCASE`. Una **migración** fusiona los
  duplicados ya existentes (repunta los mangas al nombre más usado).

### Changed

- **Búsqueda de portada desde el Manga Library**: el botón 🖼️ ahora está por manga en el *Manga Library*
  del sidebar (junto al de editar); se quitó de las tarjetas de la colección.
- **Sin seed de catálogos**: una instalación nueva **no** trae editoriales ni formatos (sólo el perfil
  por defecto); cada usuario crea lo que necesita.

## [2.0.0] - 2026-10-16

**Rework visual.** Actualización mayor (major) por la nueva identidad, el design system y las
portadas con vínculo externo. Los datos locales son compatibles: la migración de esquema es
**aditiva** (no toca mangas ni entradas existentes).

### Added

- **Design system**: tokens de color, espaciado, radios, sombras y motion; tema **dark** (por
  defecto) y **light**, con acento azul vivo y la tipografía **Inter** self-hosted.
- **Identidad visual**: logo monograma **MC** (favicon, íconos de instalador y de bandeja).
- **Sidebar modernizada**, agrupada (Colección / Biblioteca / App) y **colapsable**.
- **Portadas vía AniList** (GraphQL, **sin API key**): busca por título y **vincula** la portada
  manteniendo el nombre local. Cache en `<userData>/covers/`, servida por `mangacount://covers/…`.
  Auto-match best-effort al agregar (solo con match único). Modal **Vincular portada** por tarjeta.
- **Portada generada** (gradiente por hash + iniciales + progreso) para mangas sin portada.
- Animaciones sutiles (hover, modales, barras) con soporte de `prefers-reduced-motion`.

### Changed

- UI re-estilizada sobre tokens: tarjetas, tabla, vista compacta, modales, Settings, perfiles y footer.

## [1.0.19] - 2026-10-16

### Changed

- Release de **validación del relaunch** del auto-update: permite comprobar que la **1.0.18** (ya con
  el fix de salida/relanzado + lock con reintento) reabre sola en la versión nueva.

## [1.0.18] - 2026-10-16

### Fixed

- **Auto-update quedaba en la versión vieja al reiniciar**: el modo bandeja (`close → preventDefault`)
  bloqueaba el `app.quit()` de `electron-updater`, y el proceso nuevo perdía el *single-instance lock*.
  Ahora `install()` marca `isQuitting` antes de `quitAndInstall`, y el lock **reintenta ~5s** para tomar
  el relevo del proceso viejo. El update **reabre sola en la versión nueva**.

## [1.0.17] - 2026-10-16

### Changed

- Release de **validación del relaunch** del auto-update: permite comprobar que la 1.0.16
  (ya con el fix `isForceRunAfter`) reabre sola en la versión nueva.

## [1.0.16] - 2026-10-16

### Fixed

- **Auto-update en AppImage no reabría la versión nueva**: `quitAndInstall()` sin `isForceRunAfter`
  solo hacía la integración del AppImage; ahora `quitAndInstall(false, true)` **relanza la app con la
  versión nueva**. Docs: recomendar nombrar el AppImage **sin** la versión (reemplazo in-place).

## [1.0.15] - 2026-10-16

### Changed

- Release de **validación del auto-update in-app** (sin cambios funcionales): permite comprobar que la
  1.0.14 detecta, descarga e instala la 1.0.15 en Windows/AppImage.

## [1.0.14] - 2026-10-16

### Fixed

- **La app no abría** (`SyntaxError: Named export 'autoUpdater' not found`): `electron-updater` es
  CommonJS y se importaba con nombre en el main (ESM). Ahora se usa el **default export**. Afectaba a
  1.0.12 y 1.0.13 (crasheaban al arrancar).

## [1.0.13] - 2026-10-16

### Changed

- **Workflow de release**: publica `latest.yml` (Windows) y `latest-linux.yml` (AppImage) junto a los
  instaladores, la metadata que `electron-updater` necesita para el **auto-update in-app**.

## [1.0.12] - 2026-10-16

### Added

- **Auto-update dentro de la app** en los canales donde se puede reemplazar el ejecutable (Windows NSIS
  y AppImage corrido directo): con `electron-updater` la app **descarga e instala** y ofrece **Reiniciar
  para actualizar** (footer y Settings). En `.deb`/`makepkg` (y en dev) se mantiene el **check + link** a
  GitHub. El modo se resuelve en runtime (`resolveUpdateMode`). El workflow de release publica
  `latest.yml` / `latest-linux.yml`.

## [1.0.11] - 2026-10-16

### Security

- **Zip-slip en el restore** (`electron/main/services/backup.js`): al restaurar un `.zip`, las entradas
  `profiles/…` con `..` podían escribir **fuera** de `profiles/` (sobrescritura arbitraria de archivos).
  Ahora se descartan rutas con `..`/segmentos vacíos y se valida que el destino quede dentro de
  `profiles/`.
- **`shell.openExternal`** (`electron/main/index.js`): el `setWindowOpenHandler` abre solo `http(s)`.

## [1.0.10] - 2026-10-16

### Added

- **Copiar diagnóstico** (Settings → Diagnóstico, toggleable, default ON): copia al portapapeles la
  versión + SO/arch + locale y las últimas 100 líneas de `app.txt`; botón **Abrir carpeta de logs**.
  IPC `diagnostics:copy` / `diagnostics:open-logs`.

### Fixed

- **Layout**: el contenido ahora ocupa el ancho disponible (sin hueco vacío a la derecha); `body` deja
  de centrar con flex y `#root` pasa a `width: 100%`.

## [1.0.9] - 2026-10-16

### Added

- **Chequeo de actualizaciones**: el footer muestra la versión actual y, si hay una nueva publicada
  (GitHub Releases), un enlace `vX → vY` al release. En **Settings → General** hay un botón
  *Buscar actualización* y el toggle `updateCheck` (chequeo automático al abrir la app, default ON).
  `electron/main/services/updates.js` (cliente GitHub + comparación semver).
- **Diagnóstico/logging**: captura global de errores en el main (`uncaughtException`,
  `unhandledRejection`, `render-process-gone`, `child-process-gone`) y del renderer (`window.onerror`,
  `unhandledrejection`, `ErrorBoundary` → `log:error`). La primera línea del log incluye versión,
  plataforma/arch y locale.

### Fixed

- **Layout**: se elimina el scroll horizontal de página (`.main-content` con `min-width: 0`, sin
  `100vw`); la tabla scrollea dentro de su contenedor.

## [1.0.8] - 2026-10-15

### Added

- **Bot de Discord — comandos de escritura**: `/tomo` (+1 volumen), `/actualizar` (fijar cantidad),
  `/pending` (tomos no consecutivos), `/prioridad` (toggle) y `/nuevo` (crea manga + entry en 0);
  más `/ayuda`. Las ediciones piden **confirmación** (botones) y reusan `entry:upsert`/`manga:upsert`.
- `publisher-countries.json`: aliases y editoriales nuevas (`ovni` → Argentina, Yen On/Viz Media →
  United States, Glenat/Planeta → Spain).

### Fixed

- **`/recomendar` siempre respondía "No pude inferir tu mercado"**: el handler llamaba a
  `getRecommendations(...)` (async) **sin `await`**, así que `response` era una `Promise` y
  `response.isConfident` era `undefined`. Ahora espera el resultado.
- **Bot — perfil de sesión inválido**: si el perfil recordado ya no existe (tras Nuclear Option /
  restore), el bot pide `/perfil` (o auto-selecciona si hay uno solo) en vez de operar con un id viejo.
- **`/pendientes`**: ahora detalla prioridad, `cantidad/total`, el campo `pending`, formato y
  editorial; y acota la salida al límite de Discord.
- **Recomendaciones**: la respuesta incluye `inference` (desglose por país) y, cuando no hay
  confianza, el bot explica el motivo (países detectados y series sin editorial reconocida).
- **UI — series sin total de tomos**: se muestran como `owned / ??` (sin barra ni `%`) y se corrigió el
  `0` que React dibujaba al usar un flag numérico como condición de render (`CollectionView`,
  `AddEntryModal`).

## [1.0.7] - 2026-10-15

### Fixed

- **Import y edición tras la Nuclear Option**: la Nuclear Option re-siembra los perfiles con un
  **id nuevo**, pero la UI conservaba el perfil viejo en memoria, así que el import escribía un
  `Entry` con un `ProfileId` inexistente y fallaba con `FOREIGN KEY constraint failed`. Ahora, tras
  el borrado, la app **recarga los perfiles y vuelve a seleccionar** uno válido; además
  `entry:import` y `entry:upsert` validan el perfil y devuelven un mensaje claro si no existe.
- Los errores de los handlers IPC ahora se registran en `logs/app.txt` (antes el import fallaba sin
  dejar rastro en el log).

## [1.0.6] - 2026-10-15

### Added

- **Settings**: sección **Danger Zone** con la **Nuclear Option** (movida desde el `Sidebar`); en el
  lugar que ocupaba, el `Sidebar` ahora muestra el acceso **⚙️ Settings**.
- Script `npm run release:sync` que sincroniza el `pkgver` de `packaging/arch/PKGBUILD` con
  `package.json` y resetea `pkgrel=1`.

### Fixed

- **Bot**: habilitarlo en Settings ahora lo **arranca sin reiniciar** la app. `bot:config-set`
  llamaba a un `reload` inexistente en el controlador (solo hay `start`/`stop`/`restart`); el
  optional chaining lo ignoraba y el estado quedaba en *apagado*. Ahora hace `restart` y el estado
  pasa por *conectando* → *conectado*.
- **Bot**: respuestas a las interacciones en redes con **DNS lento**. La conexión REST de Discord se
  cerraba por keep-alive (~4 s) y **reconectar tardaba ~3 s**, así que la respuesta llegaba fuera de
  la ventana de 3 s y Discord devolvía `Unknown interaction` (`/perfil`, `/buscar`, `/pendientes`).
  Se configura un agent HTTP con **keep-alive largo** (120 s) + ping periódico para mantener la
  conexión caliente. El log de fallos de interacción ahora incluye comando y duración.
- **App**: si no se obtiene el `requestSingleInstanceLock`, ya no inicializa el backend ni el bot
  (antes podía abrir una segunda base y crear sesiones de bot duplicadas).
- **Empaquetado Arch**: `packaging/arch/PKGBUILD` dejaba `/opt/mangacount` inaccesible (el
  `squashfs-root` del AppImage viene en `0700` y `cp -a` copiaba ese modo) y no reparaba los permisos
  al actualizar (`mangacount.install` con `post_install`/`post_upgrade`). `pkgver` 1.0.1 → actual.

## [1.0.5] - 2026-10-15

### Added

- **Pantalla de Settings unificada** (`components/SettingsModal.jsx`) con secciones **General**,
  **Backup**, **Intercambio** y **Bot**, abierta desde un engranaje en el `Sidebar`. El import TSV se
  mueve del `Sidebar` a Settings y se agrega el **Export TSV** (reusa `entry:export`).
- **Backup y restore del sistema** a `.zip` (`services/backup.js`): snapshot consistente con
  `db.backup()`, `profiles/` y `manifest.json`; retención de los últimos 5; `fflate` para la
  compresión. Restore con validación + safety-backup + reemplazo completo.
- **Backup automático opcional** (`services/auto-backup.js`): disparadores *al iniciar* y *mientras
  la app corre*, con destino y disparador obligatorios al habilitar; apagado por defecto.
- **App residente en bandeja** (`lifecycle.js` + `index.js`): cerrar la ventana la oculta, tray con
  menú, instancia única (`requestSingleInstanceLock`), `startInTray`/`--hidden`.
- **Autostart por SO** (`services/autostart.js`): `setLoginItemSettings` en Windows/macOS y
  `~/.config/autostart/mangacount.desktop` en Linux, con toggle en Settings.
- **Bot de Discord embebido** (`services/discord-bot.js`, solo consulta): `/perfil`, `/buscar`,
  `/pendientes`, `/recomendar`, autorización por guild/user IDs, sesión por usuario y token cifrado
  con `safeStorage`. Lógica de consulta compartida en `services/search.js`.
- Canales IPC nuevos (`backup:*`, `bot:*`, `app:*`, `dialog:*`) en handlers, `preload.cjs` y
  `localAdapter.js`. Callback `ctx` ampliado con `logger`, `secrets`, `autostart`, `dialog` y `bot`.

### Changed

- `prefs.js`: defaults resueltos (`resolvePrefs`) con `startInTray` y bloques `backup`/`bot`.
- Documentación actualizada: `README.md` y `docs/desktop.md` (backup, tray/autostart, bot, config).

## [1.0.4] - 2026-10-12

### Changed

- Se completan los 4 PRs abiertos de Dependabot sobre `main` (merge commits):
  - Root: `electron` 44.5.1 → 44.7.0; el módulo nativo `better-sqlite3` se recompila con
    `electron-builder install-app-deps` (`npm run rebuild:electron`).
  - Renderer: `vite` 7.3.5 → **8.3.4** (bundler Rolldown) y `@vitejs/plugin-react` 4.6.0 → **6.1.2**,
    mergeados **juntos** porque `plugin-react` 6 exige el peer `vite ^8.0.0` (por separado dejan
    `main` en `ERESOLVE`/build roto).
  - Renderer: `jsdom` 25.0.1 → **30.1.2** (5 majors; es el entorno de test de Vitest).

### Fixed

- `mangacount.client/src/test/setup.js`: el mock de `localStorage` pasa a usar
  `Object.defineProperty` porque jsdom 30 define `window.localStorage` como propiedad getter-only;
  con la asignación directa fallaban las 7 suites de test.

## [1.0.3] - 2026-10-07

### Security

- Root: `override` de `global-agent` a `^4.1.3`, que elimina `roarr` y `sprintf-js` de la cadena
  de `electron-builder` (`@electron/get` → `global-agent`). `sprintf-js` no tiene versión
  parcheada (alert #133) y era el último moderate de root: `npm audit` en root queda en **0
  vulnerabilidades**. Se verificó que el empaquetado (`@electron/get.bootstrap`) sigue
  funcionando.

### Changed

- Dependencias del renderer actualizadas vía Dependabot: `react`/`react-dom` 19.3.0,
  `@testing-library/jest-dom` 7.0.1, `@testing-library/react` 16.3.3, `globals` 17.13.0.
- `eslint` 10 + `@eslint/js` 10 + `eslint-plugin-react-hooks` 7: se completan los compañeros que
  faltaban en el PR de Dependabot (que dejaba `main` sin instalar por conflicto de peer). Las
  reglas nuevas `react-hooks/immutability` y `react-hooks/set-state-in-effect` quedan en `warn`
  para no forzar un refactor de los componentes existentes.
- `vitest` 5 + `@vitest/coverage-v8` 5: bump conjunto del par acoplado.
- Se quita el `override` de `brace-expansion` (la línea 1.x rompía el `minimatch` de ESLint 10);
  la resolución pasa a `brace-expansion` 2.x/5.x, no afectada por las advisories.
- Root: `electron` 44.5.1 y `pg` 8.23.1; se conserva el override `http-cache-semantics ^4.3.0`.
- `.gitattributes`: `package-lock.json` con `eol=lf` para evitar diffs de fin de línea en PRs
  futuros.

### Fixed

- `main` quedaba en `ERESOLVE` (no instalaba) por los merges de Dependabot sin sus dependencias
  acompañantes; ahora `npm install`, `lint`, `test`, `coverage` y `build` pasan en verde.

## [1.0.2] - 2026-10-07

### Security

- Remediación de las vulnerabilidades `high`/`critical` reportadas por Dependabot en los dos
  lockfiles activos (`/` y `mangacount.client`), sin cambios de comportamiento:
  - Root (Electron main): `overrides` de `http-cache-semantics` a `^4.3.0` (transitiva de
    `electron-builder`).
  - Renderer: bump de `vite` a `^7.3.5` y `overrides` de `brace-expansion`, `browserslist`,
    `form-data`, `js-yaml`, `nanoid`, `postcss`, `source-map-js` y `ws`.
- Prevención: `.github/dependabot.yml` (npm en `/` y `/mangacount.client`, semanal y agrupado) y
  workflow `Dependency Audit` (`npm audit --audit-level=high`) en push/PR a `main` y semanal.

## [1.0.1] - 2026-10-06

### Changed

- Limpieza: se elimina el backend .NET completo (`MangaCount.Server`, tests, `Directory.Build.props`,
  `Program.cs`), `deployment/`, `databasebackup/` y la demo `Pages/` (con su workflow).
- `.gitignore`: ignora `*.db-shm`/`*.db-wal`/`*.db-journal`, `.env*` y el working-context local de
  `.ancleto/`; deja de ignorar `public/` (assets de Vite).
- Documentación: README y `docs/desktop.md` reflejan la ruta real de datos (`mangacount`);
  `copilot-instructions.md` y `ARCHITECTURE.md` actualizados al stack desktop.

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
