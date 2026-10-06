# MangaCount Desktop — datos y plataformas

Documentación de la app de escritorio Electron: dónde viven los datos, cómo respaldarlos y
cómo resolver problemas comunes por plataforma.

## Ubicación de los datos (`userData`)

La app usa `app.getPath('userData')`, fuera del bundle:

| Plataforma | Ruta típica |
|---|---|
| Windows | `%APPDATA%\MangaCount\` |
| Linux | `~/.config/MangaCount/` |
| macOS (no soportado oficialmente) | `~/Library/Application Support/MangaCount/` |

Contenido:

```text
<userData>/
├── mangacount.db          # base SQLite
├── mangacount.db-wal      # write-ahead log (temporal)
├── mangacount.db-shm      # shared memory (temporal)
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

## Backup manual

Con la app **cerrada** (para que el WAL esté consolidado), copiá la carpeta `userData` completa:

```bash
# Linux
cp -a ~/.config/MangaCount ~/.config/MangaCount.bak-$(date +%F)
```

```powershell
# Windows (PowerShell)
Copy-Item -Recurse "$env:APPDATA\MangaCount" "$env:APPDATA\MangaCount.bak-$(Get-Date -Format yyyy-MM-dd)"
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
