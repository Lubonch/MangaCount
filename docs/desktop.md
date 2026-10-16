# MangaCount Desktop — datos y plataformas

Documentación de la app de escritorio Electron: dónde viven los datos, cómo respaldarlos y
cómo resolver problemas comunes por plataforma.

## Ubicación de los datos (`userData`)

La app usa `app.getPath('userData')`, fuera del bundle:

| Plataforma | Ruta típica |
|---|---|
| Windows | `%APPDATA%\mangacount\` |
| Linux | `~/.config/mangacount/` |
| macOS (no soportado oficialmente) | `~/Library/Application Support/mangacount/` |

> La carpeta usa el `name` del `package.json` (`mangacount`), no el `productName` de
> electron-builder. Verificado corriendo el AppImage v1.0.0.

Contenido:

```text
<userData>/
├── mangacount.db          # base SQLite
├── mangacount.db-wal      # write-ahead log (temporal)
├── mangacount.db-shm      # shared memory (temporal)
├── preferences.json       # arranque en bandeja, backup y config del bot
├── discord-token.bin      # token del bot (cifrado con safeStorage, o plano si no hay soporte)
├── backups-restore/       # backups de seguridad previos a un restore
├── profiles/              # fotos de perfil subidas
│   └── profile_<id>_<uuid>.<ext>
└── logs/
    ├── app.txt            # log actual
    └── app.YYYY-MM-DD.txt # logs rotados (al cambiar el día, sólo si había contenido)
```

`MANGACOUNT_DATA_DIR` sólo lo usa el script de traspaso; la app siempre abre `userData`.

## Formato del SQLite

Esquema en [`electron/main/db/schema.sqlite.sql`](../electron/main/db/schema.sqlite.sql). Cinco
tablas:

- `Profile(Id, Name UNIQUE, ProfilePicture, CreatedAt)`
- `Format(Id, Name UNIQUE)`
- `Publisher(Id, Name UNIQUE)`
- `Manga(Id, Title, TotalVolumes, FormatId, PublisherId, ImageUrl, CreatedAt)`
- `Entry(Id, ProfileId, MangaId, PurchasedVolumes, PendingVolumes, IsComplete, IsPriority, CreatedAt, UpdatedAt, UNIQUE(ProfileId, MangaId))`

Detalles:

- La app abre la conexión con `PRAGMA journal_mode = WAL` y `PRAGMA foreign_keys = ON`, por lo
  que `ON DELETE CASCADE` de `Entry` funciona al borrar `Profile`/`Manga`.
- La versión del esquema se guarda en `PRAGMA user_version` y las migraciones son versionadas
  (`electron/main/db/client.js`).
- En el primer arranque se hace *seed* de 5 formatos, 5 editoriales y el perfil `Default Profile`.
- `Profile.ProfilePicture` guarda una URL `mangacount://profiles/<archivo>`, no un path local.

## Protocolo `mangacount://`

Las fotos de perfil no se sirven por HTTP: el proceso main registra un esquema custom
(`protocol.handle('mangacount', …)`) que lee `<userData>/profiles/<archivo>` y lo responde con
el `content-type` correcto. El renderer lo usa directo en `<img src="mangacount://profiles/…">`.

## Backup y restore integrados

La app trae backup/restore del **sistema completo** desde **Settings → Backup**:

- **Formato**: un `.zip` (`mangacount-backup-<YYYY-MM-DD-HHmm>.zip`) con `manifest.json`,
  `mangacount.db` (snapshot consistente con `db.backup()`, nunca copiando el `.db` vivo con WAL)
  y `profiles/`. **No** incluye `preferences.json` ni `logs/`: la config es de la máquina, no del
  dato.
- **Retención**: se conservan los últimos **5** backups (se podan solo archivos con el patrón
  propio).
- **Automático (opcional, apagado por defecto)**: al habilitarlo exige un **destino** y al menos un
  **disparador** — *al iniciar* (si pasó más del intervalo desde el último backup) y/o *mientras la
  app corre* (cada X minutos). El destino debería estar en **otro disco** o carpeta sincronizada.
- **Restore**: valida el `.zip` (`manifest.json` + `PRAGMA integrity_check`), genera un backup de
  seguridad del estado actual en `backups-restore/`, cierra la base, limpia `-wal`/`-shm` y
  reemplaza `mangacount.db` + `profiles/`. Un backup con `app`/`schemaVersion` incompatible se
  rechaza sin tocar datos.
- **Indicador**: Settings muestra la fecha del último OK y, si falló, el error (que también queda
  en `logs/`).

## Modo residente en bandeja y autostart

La app queda **residente en la bandeja del sistema**: cerrar la ventana la **oculta** en vez de
salir. El menú del tray ofrece *Abrir*, *Estado del bot*, *Iniciar con el sistema* y *Salir* (único
camino para terminar el proceso). El arranque por defecto es en tray (`startInTray`), incluido el
autostart con `--hidden`.

- **Instancia única**: un segundo lanzamiento enfoca la instancia existente (evita dos conexiones
  de bot y dos escritores de SQLite).
- **Autostart** (opcional, en Settings → General): Windows/macOS con `app.setLoginItemSettings`;
  Linux escribiendo o borrando `~/.config/autostart/mangacount.desktop` con la ruta real del
  ejecutable (`$APPIMAGE` o el binario del `.deb`). El toggle refleja el estado real del sistema.

## Bot de Discord (solo consulta)

Bot **embebido en el proceso main**: arranca y se detiene con la app, sobre la **misma conexión
SQLite**, y expone slash commands guild-scoped de solo lectura: `/perfil`, `/buscar`, `/pendientes`
y `/recomendar`. **Cada usuario usa su propio bot** (su aplicación, su token, su servidor); no se
comparte nada entre instalaciones, y la app es **mono-guild** (un `guildId` por vez).

La configuración vive en **Settings → Bot**: toggle, **token** (cifrado con `safeStorage`; nunca en
texto plano ni en el repo), **Guild ID** y **allowlist de usuarios** (las User IDs, coma-separadas;
con la lista vacía no responde a nadie). El **Application ID** no se carga en la app: se usa solo
para armar la URL de invitación (ver el README).

Sin token o sin red el bot queda *apagado* y la app funciona normal. Los fallos se registran en
`logs/`. El comando de escritura `actualizar` no está expuesto (queda como punto de extensión).

## Actualizaciones

La app **no se auto-instala** (en Linux lo maneja el gestor de paquetes: `apt`/`pacman`). El **footer**
muestra la versión actual (`MangaCount vX`) y, si hay una nueva publicada, un enlace `vX → vY` que abre
la página del release. El chequeo **automático al abrir la app** se puede desactivar en
**Settings → General** (toggle *Buscar actualizaciones al abrir la app*); ahí mismo hay un botón
**Buscar actualización** manual. Se consulta `releases/latest` de GitHub, que excluye
drafts/prereleases → solo se ofrecen releases **publicadas**.

## Diagnóstico

Los errores del proceso main (excepciones no capturadas, promesas rechazadas, caída de procesos) y del
renderer (`window.onerror`, `unhandledrejection`, `ErrorBoundary`) se registran en `logs/app.txt`. La
**primera línea de cada sesión** incluye la versión, plataforma/arch y locale, para saber en qué build
ocurrió.

## Backup manual (alternativo)

Con la app **cerrada** (para que el WAL esté consolidado), copiá la carpeta `userData` completa:

```bash
# Linux
cp -a ~/.config/mangacount ~/.config/mangacount.bak-$(date +%F)
```

```powershell
# Windows (PowerShell)
Copy-Item -Recurse "$env:APPDATA\mangacount" "$env:APPDATA\mangacount.bak-$(Get-Date -Format yyyy-MM-dd)"
```

Alcanza con `mangacount.db` si querés sólo la colección, pero incluí `profiles/` para conservar
las fotos. Si copiás con la app abierta, pueden faltar cambios recientes que estén en `-wal`.

Restaurar = reemplazar `mangacount.db` (+ `profiles/` si aplica) con la app cerrada.

## Troubleshooting por plataforma

### Windows (`.exe`)

- SmartScreen advierte porque el ejecutable no está firmado: *Más información → Ejecutar de
  todas formas*.
- Si el instalador no puede escribir en `%APPDATA%`, revisá permisos/antivirus.

### Debian / Ubuntu (`.deb`)

```bash
sudo apt install ./mangacount_<version>_amd64.deb
```

- Dependencias de escritorio faltantes en servidores headless: la app necesita entorno gráfico.

### Arch / otras distros (AppImage)

- Hacer ejecutable: `chmod +x MangaCount-<version>.AppImage`.
- Si falta FUSE: instalar `fuse2`/`libfuse2` o correr con
  `--appimage-extract-and-run`.
- En Arch y derivadas se puede instalar como paquete con el `PKGBUILD` del repo
  (`packaging/arch/`), que reempaqueta el AppImage y no requiere FUSE: ver el README.

### Base de datos bloqueada

Si el script de traspaso o un backup falla por *database is locked*, cerrá la app: sólo un
proceso puede escribir la SQLite (modo WAL admite lectores concurrentes, no dos escritores).

### La foto de perfil no carga

Verificá que el archivo exista en `<userData>/profiles/` y que el valor en
`Profile.ProfilePicture` empiece con `mangacount://profiles/`. Archivos huérfanos en
`profiles/` son inofensivos.

### Migración desde PostgreSQL falla

El script `electron/main/db/migrate-from-postgres.js` falla a propósito ante cualquier
diferencia. Revisá el mensaje (conteo por tabla, colisión `UNIQUE`, fila descartada o
spot-check); corregí el origen y volvé a intentar sobre una base destino nueva.
