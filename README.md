# MangaCount

MangaCount es un gestor de colección de manga de escritorio. Corre como aplicación local
autocontenida con **Electron** y **SQLite embebida**: no requiere servidor, ni PostgreSQL,
ni conexión de red. El frontend React consume los datos por IPC a través de un proceso main
que porta la lógica de negocio a Node.

## Características

- múltiples perfiles de colección (con foto de perfil)
- CRUD de mangas y de entradas de colección (comprados / pendiente / prioridad)
- importación y exportación de la colección en TSV
- filtros por formato y editorial
- recomendaciones de manga no poseído según el mercado inferido, con motor local (`shared/recommendations`)
- datos 100% locales en la carpeta de usuario; sin servidor ni base de datos externa

## Descargar e instalar

Los instaladores se publican en **GitHub Releases** (pestaña *Releases* del repositorio) para
cada tag `v*`:

- **Windows**: `MangaCount Setup <version>.exe` (instalador NSIS)
- **Debian / Ubuntu**: `mangacount_<version>_amd64.deb`
- **Arch y otras distros**: `MangaCount-<version>.AppImage` (o instalar con `makepkg`, ver abajo)

> El instalador `.exe` no está firmado con certificado de pago: Windows SmartScreen puede
> advertir; elegir *Más información → Ejecutar de todas formas*.

Instalación:

```bash
# Debian / Ubuntu
sudo apt install ./mangacount_<version>_amd64.deb

# Arch y otras distros (AppImage)
chmod +x MangaCount-<version>.AppImage
./MangaCount-<version>.AppImage
```

Si el AppImage no arranca por falta de FUSE: `./MangaCount-<version>.AppImage --appimage-extract-and-run`
o instalar `libfuse2`.

### Arch Linux y derivadas (makepkg)

Además del AppImage, el repo trae un [`packaging/arch/PKGBUILD`](packaging/arch/PKGBUILD) que
reempaqueta el AppImage publicado e integra la app en el sistema (binario en `/usr/bin`,
lanzador de escritorio e iconos), sin depender de FUSE:

```bash
sudo pacman -S --needed base-devel git   # makepkg no se corre como root
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount/packaging/arch
makepkg -si
```

`makepkg` descarga el `MangaCount-<version>.AppImage` del release `v<version>` y lo instala
como el paquete `mangacount`. Para actualizar a una release nueva, actualizá `pkgver` en el
`PKGBUILD` (y regenerá checksums con `updpkgsums`). Desinstalar: `sudo pacman -R mangacount`.

> `base-devel` es necesario para construir; el AppImage se extrae en tiempo de build, así que
> no requiere `fuse2` en el sistema.

## Migrar desde una instalación con servidor (PostgreSQL)

Si venías usando la versión cliente-servidor, hay un script de traspaso único que copia las
5 tablas (perfiles, mangas, entradas, formatos, editoriales) de PostgreSQL a la SQLite local y
verifica conteos, la constraint `UNIQUE(ProfileId, MangaId)`, que no se descarten filas y un
spot-check de 20 entradas.

Requisitos: app **cerrada**, `npm ci` en la raíz (el script usa `pg`), y de ser posible la base
PostgreSQL en sólo lectura.

```bash
PG_CONNECTION_STRING="Host=localhost;Database=MangaCount;Username=mangacount;Password=***;Port=5432" \
  node electron/main/db/migrate-from-postgres.js "<carpeta-de-datos>"
```

`<carpeta-de-datos>` es la de `userData` (ver [Datos de la app](#datos-de-la-app)). El script
falla con código ≠ 0 ante cualquier diferencia para no dejar una migración a medias.

## Datos de la app

Todo vive en la carpeta `userData` del sistema (fuera del bundle):

- Windows: `%APPDATA%\mangacount\`
- Linux: `~/.config/mangacount/`

Contenido:

- `mangacount.db` (+ `-wal`, `-shm`): base SQLite con las 5 tablas
- `profiles/`: fotos de perfil (servidas al renderer por el protocolo `mangacount://profiles/<archivo>`)
- `logs/`: `app.txt` con rotación diaria (`app.YYYY-MM-DD.txt`)

Detalles de esquema, backup y troubleshooting por plataforma: [`docs/desktop.md`](docs/desktop.md).

## Desarrollo

Requisitos: **Node.js 20+** y npm.

```bash
npm ci
npm ci --prefix mangacount.client
```

### Correr en modo desarrollo (Electron + hot-reload)

En una terminal:

```bash
npm run dev            # inicia el dev server de Vite (http://localhost:5173)
```

En otra:

```bash
MANGACOUNT_DEV_URL=http://localhost:5173 npx electron .
```

El proceso main abre la ventana apuntando al dev server y expone los canales IPC a través del
preload. Fuera de Electron el renderer puede usar un `fetch` de respaldo, pero el modo soportado
es Electron.

### Build y empaquetado

```bash
npm run build:renderer   # build del renderer (mangacount.client/dist)
npm run dist             # build:renderer + electron-builder (según el OS)
npm run dist:linux       # .deb + .AppImage
npm run dist:win         # .exe (nsis)
```

`electron-builder` reconstruye el módulo nativo `better-sqlite3` para el ABI de Electron. Si
después necesitás correr los tests bajo Node, volvé a reconstruirlo para Node:

```bash
npm run rebuild:node
```

## Tests

```bash
npm test                        # proceso main (node --test)
npm --prefix mangacount.client test -- --run   # renderer (vitest)
```

## Publicar una release

El workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) compila los
instaladores en runners Windows y Linux y crea un GitHub Release **draft** con los tres
artefactos:

```bash
git tag v1.0.0
git push origin v1.0.0
```

También se puede disparar manualmente desde *Actions* (`workflow_dispatch`) para generar sólo
los artifacts, sin release. El `.exe` no se cross-compila: se genera en el runner Windows.

## Estructura

```text
MangaCount/
├── electron/               # proceso main: SQLite, handlers IPC, servicios, preload
├── mangacount.client/      # renderer React + Vite (adaptador IPC en src/api)
├── shared/recommendations/ # motor de recomendaciones compartido (JS)
├── build/                  # iconos para electron-builder
├── docs/                   # documentación de la app desktop
└── aspec/                  # specs y changes (spec-driven)
```

> El bot de WhatsApp y el backend .NET/PostgreSQL quedan fuera del alcance de la app de
> escritorio: no se empaquetan ni se documentan acá. El bot sigue en el repo pero dejó de
> apuntar a un servidor de MangaCount.

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
