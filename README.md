# MangaCount

**Local-first desktop manga collection manager.**

> Read this in: **English** · [Español](README.es.md)

[![Tests](https://github.com/Lubonch/MangaCount/actions/workflows/test.yml/badge.svg)](https://github.com/Lubonch/MangaCount/actions/workflows/test.yml)
[![Dependency Audit](https://github.com/Lubonch/MangaCount/actions/workflows/audit.yml/badge.svg)](https://github.com/Lubonch/MangaCount/actions/workflows/audit.yml)
[![Latest release](https://img.shields.io/github/v/release/Lubonch/MangaCount?label=release)](https://github.com/Lubonch/MangaCount/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-4b5563)](#download-and-install)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](#development)

<p align="center">
  <img src="docs/screenshots/collection-cards.png" alt="MangaCount collection in card view" width="960">
</p>

MangaCount organizes your manga collection in a self-contained desktop application: **Electron** for
the main process, **React + Vite** for the interface and **embedded SQLite** for the data. There is no
server, no external database and no cloud account: everything lives on your machine. The renderer gets
its data over IPC through a main process that ports the business logic to Node.

## Features

### Collection

- **Multiple profiles**, each with its own collection and profile picture.
- **CRUD for mangas and entries** with owned volumes, pending volumes, priority and per-series progress.
- **Sidebar library search** and filters by publisher, format and status.
- **Three views**: cover cards, table and compact; sort by name, progress, quantity, priority,
  publisher or format.
- **TSV import and export** of the collection.
- **Recommendations** of series you don't own yet, from a local engine (`shared/recommendations`).

### Covers

- **AniList search with no API key**, with a local cache of the images.
- **Local covers** from your machine, validated by *magic bytes*.
- **Generated cover** (gradient + initials) for series without an image.
- **Blur and `+18` badge** on adult covers, with configurable reveal (hover or click).

### Data and system

- **Local SQLite** with versioned migrations and an empty initial state.
- **Backup and restore** of the whole system to a `.zip` (database + pictures), with optional automatic
  backup.
- **Tray-resident app** with optional autostart: closing the window does not close the app.
- **Diagnostics** with rotating logs, copy-diagnostics-to-clipboard and opening the logs folder from
  Settings.

### Integrations

- **Embedded Discord bot** (optional) to query and edit the collection from Discord.
- **Update check** in the footer: on Windows and AppImage the app downloads and installs on its own; on
  `.deb` and `makepkg` (Arch) it links to the GitHub release.

### Interface

- **Light/dark themes** (dark by default) on design tokens, **Inter** typography and its own logo.
- **ES/EN interface** (English by default), switchable in Settings.
- **Collapsible sidebar** and a **Settings** screen that gathers configuration, backup, TSV exchange,
  bot and diagnostics.

## Screenshots

| Table view | Light theme |
| --- | --- |
| ![Collection in table view](docs/screenshots/collection-table.png) | ![Collection in light theme](docs/screenshots/collection-light.png) |

| Add entry | Add manga |
| --- | --- |
| ![Add entry modal](docs/screenshots/add-entry.png) | ![Add manga modal](docs/screenshots/add-manga.png) |

| Settings | Profile selector |
| --- | --- |
| ![Settings screen](docs/screenshots/settings.png) | ![Profile selector](docs/screenshots/profile-selector.png) |

## Download and install

Installers are published on **[GitHub Releases](https://github.com/Lubonch/MangaCount/releases)** for
each `v*` tag:

- **Windows**: `MangaCount.Setup.<version>.exe` (NSIS installer)
- **Debian / Ubuntu**: `mangacount_<version>_amd64.deb`
- **Arch and other distros**: `MangaCount-<version>.AppImage`

```bash
# Debian / Ubuntu
sudo apt install ./mangacount_<version>_amd64.deb

# AppImage
chmod +x MangaCount-<version>.AppImage
./MangaCount-<version>.AppImage
```

> The `.exe` is not signed with a paid certificate: Windows SmartScreen may warn you. Choose
> *More info → Run anyway*.
>
> If the AppImage fails to start because of a missing FUSE: `./MangaCount-<version>.AppImage --appimage-extract-and-run`
> or install `libfuse2`.

### Arch Linux and derivatives (makepkg)

The repo ships [`packaging/arch/PKGBUILD`](packaging/arch/PKGBUILD), which repackages the published
AppImage and integrates the app into the system (binary in `/usr/bin`, desktop launcher and icons),
without depending on FUSE:

```bash
sudo pacman -S --needed base-devel git   # makepkg must not run as root
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount/packaging/arch
makepkg -si
```

`makepkg` downloads `MangaCount-<version>.AppImage` from the `v<version>` release and installs it as the
`mangacount` package. To update, bump `pkgver` in the `PKGBUILD` and regenerate the checksums with
`updpkgsums`. Uninstall: `sudo pacman -R mangacount`.

## App data

Everything lives in the system's `userData` folder, outside the bundle:

- Windows: `%APPDATA%\mangacount\`
- Linux: `~/.config/mangacount/`

| File / folder | Contents |
| --- | --- |
| `mangacount.db` (+ `-wal`, `-shm`) | SQLite database with profiles, mangas, entries, formats and publishers |
| `profiles/` | Profile pictures, served to the renderer via `mangacount://profiles/<file>` |
| `covers/` | Cover cache (AniList and local) |
| `logs/` | `app.txt` with daily rotation (`app.YYYY-MM-DD.txt`) |
| `preferences.json` | Tray, backup, bot and recommendation preferences |
| `discord-token.bin` | Bot token encrypted with `safeStorage` |
| `backups-restore/` | Safety backups taken before a restore |

Schema, backup, tray/autostart, bot and per-platform troubleshooting details:
[`docs/desktop.md`](docs/desktop.md).

## Discord bot (optional)

MangaCount can expose your collection through a bot **embedded** in the app (it starts and stops with
it, over the same local database). It lets you query and edit the collection from Discord.

**Each user runs their own bot**: your own Discord application, your own token and your own server. The
app does not use the *Application ID* at runtime; you only need it once to build the invite URL.

### Setup (once per user)

1. **Create the application**: in the [Discord Developer Portal](https://discord.com/developers/applications)
   → *New Application*. Copy the **Application ID** from *General Information*.
2. **Token**: *Bot* tab → *Reset Token* → copy. Store it in a secrets manager (never in the repo or the
   chat).
3. **Invite the bot** with the Application ID:
   `https://discord.com/api/oauth2/authorize?client_id=<APPLICATION_ID>&permissions=83968&scope=bot%20applications.commands`
   (83968 = *Send Messages* + *Embed Links* + *Read Message History*).
4. **Guild ID and User ID**: enable *Developer Mode* in Discord (Settings → Advanced) and copy the
   server ID and your user ID.
5. **Configure it in the app**: ⚙️ **Settings → Bot**: Token, Guild ID and *Allowed users* → *Enable bot*
   → *Save*. The status should read **connected**.

### Commands

Query commands:

| Command | Description |
| --- | --- |
| `/perfil [profile]` | View or switch the active profile |
| `/buscar query:<title>` | Search a series in your collection |
| `/pendientes` | Ongoing series and missing volumes |
| `/huecos` | Series with gaps (pending note) |
| `/a-punto` | Series 1–2 volumes away from completion |
| `/stats` | Collection stats |
| `/status` | App and database status |
| `/recomendar [limit]` | Recommendations for the active profile |

Editing and administration commands:

| Command | Description |
| --- | --- |
| `/tomo titulo:<series>` | Add 1 volume |
| `/actualizar titulo:<series> cantidad:<n>` | Set how many volumes you own |
| `/pending titulo:<series> tomos:<5,7>` | Set non-consecutive pending volumes (empty = clear) |
| `/prioridad titulo:<series>` | Toggle the priority of a series |
| `/nuevo titulo:<series> [total] [cantidad] [formato] [editorial]` | Add a new series (entry starts at 0) |
| `/backup` | Run a backup now (asks for confirmation and runs it in the background) |
| `/ayuda` | List the available commands |

> Command and option **names** are fixed and in Spanish (e.g. `/ayuda`, `titulo:`). What follows the
> app's language (ES/EN) are the descriptions, responses and help text.

### Bot UX

- **Autocomplete** on the series parameter (`/buscar`, `/tomo`, `/actualizar`, `/pending`, `/prioridad`,
  `/nuevo`).
- **Pagination with buttons** on long listings (`/pendientes`, `/huecos`, `/a-punto`, `/buscar`).
- **Preloaded modal** for `/pending` when a series has no pending volumes, and a *Confirm +1 and edit
  note* shortcut on `/tomo`.
- **Action buttons** on `/buscar` results (add a volume, toggle priority, edit the pending note).
- Editing operations ask for **confirmation** (Confirm/Cancel buttons) and only someone on the allowlist
  can use them. If the title matches zero or more than one series, the bot does not write and asks you
  to disambiguate.
- Adult covers are posted as a Discord **spoiler**.

### Bot settings

**Settings → Bot** gathers the token, the guild, the allowed users, *Enable bot*, the per-page limit
(1–500, default 20), ephemeral replies, the confirmation TTL (1–60 min, default 5) and the default
number of recommendations (1–10, default 5).

## Recommendations

**Recommendations** suggest series you don't own yet. There are two sources, in this order:

1. **AniList (dynamic)** — starting from the series in your collection, the app walks AniList's
   collaborative recommendation graph (no API key needed) and scores the candidates by community rating
   plus thematic similarity with your collection.
2. **Local engine (fallback)** — if AniList is unreachable (offline, timeout, rate limit), the app falls
   back to a purely local, lexical engine over a small bundled catalog (`shared/recommendations`).

### Feedback

- **I already own it** — links the recommendation to one of your mangas (or creates it with the name you
  choose). It never comes back, even if your local title differs from AniList's.
- **Not viable** — permanently dismisses it for that profile.
- **↻ Refresh** — asks for a new batch. The list always keeps its full size (a dismissed card is
  replaced by the next candidate), and what you already saw is remembered for a while so it doesn't
  repeat.

### Recommendation settings

**Settings → Recommendations**: enable/disable, list size (1–25, default 10) and for how many days a
seen recommendation is remembered (1–365, default 30).

## Development

Requirements: **Node.js 20+** and npm. CI runs on Node 22.

```bash
npm ci
npm ci --prefix mangacount.client
```

### Development mode (Electron + hot-reload)

In one terminal:

```bash
npm run dev            # Vite on http://localhost:5173
```

In another:

```bash
MANGACOUNT_DEV_URL=http://localhost:5173 npx electron .
```

The main process opens the window pointing at the dev server and exposes the IPC channels through the
preload. Electron is the only supported mode.

### Build and packaging

```bash
npm run build:renderer   # renderer build (mangacount.client/dist)
npm run dist             # build:renderer + electron-builder (per OS)
npm run dist:linux       # .deb + .AppImage
npm run dist:win         # .exe (NSIS)
```

`electron-builder` rebuilds the `better-sqlite3` native module for Electron's ABI. If you later need to
run the tests under Node, rebuild it for Node:

```bash
npm run rebuild:node
```

## Tests

```bash
npm test                                      # main process (node --test)
npm run test:renderer                         # renderer (vitest)
npm run test:renderer:coverage                # renderer + coverage
npm run lint:renderer                         # renderer ESLint
```

CI (`.github/workflows/test.yml`) requires **≥ 90% coverage** in main and renderer, and also runs
`npm audit` (`.github/workflows/audit.yml`).

## Publishing a release

The [`release.yml`](.github/workflows/release.yml) workflow builds the installers on Windows and Linux
runners and creates a **draft** GitHub Release with the artifacts:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

It can also be triggered manually from *Actions* (`workflow_dispatch`) to generate the artifacts only,
without a release. The `.exe` is not cross-compiled: it is built on the Windows runner.

## Migrating from a server install (PostgreSQL)

If you were using the client-server version, there is a one-off script that copies the 5 tables
(profiles, mangas, entries, formats and publishers) from PostgreSQL to the local SQLite and verifies the
counts, the `UNIQUE(ProfileId, MangaId)` constraint, that no rows are dropped and a spot-check of 20
entries.

Requirements: app **closed**, `npm ci` at the root (the script uses `pg`) and, if possible, the
PostgreSQL database in read-only mode.

```bash
PG_CONNECTION_STRING="Host=localhost;Database=MangaCount;Username=mangacount;Password=***;Port=5432" \
  node electron/main/db/migrate-from-postgres.js "<data-folder>"
```

`<data-folder>` is the `userData` one (see [App data](#app-data)). The script exits with a non-zero code
on any difference, so it never leaves a half-done migration.

## Structure

```text
MangaCount/
├── electron/               # main process: SQLite, IPC handlers, services, preload
│   ├── main/
│   │   ├── db/             # schema, SQLite client and repositories
│   │   ├── ipc/            # handlers per channel
│   │   └── services/       # covers, backup, bot, updater, prefs, logs
│   └── assets/             # app and tray icons
├── mangacount.client/      # React + Vite renderer (IPC adapter in src/api)
├── shared/recommendations/ # shared recommendation engine (JS)
├── docs/                   # desktop documentation and screenshots
├── packaging/arch/         # PKGBUILD for Arch Linux
├── scripts/                # release utilities
└── aspec/                  # specs and changes (spec-driven)
```

> The .NET/PostgreSQL backend is out of scope for the desktop app. The old WhatsApp bot was removed
> from the repo: it is replaced by the Discord bot embedded in the main process.

## Contributing

Changes are documented with the **aspec** flow in `aspec/changes/` (proposal, design, tasks and delta
specs). Before opening a PR:

```bash
npm test
npm run test:renderer:coverage
npm run lint:renderer
npm run build:renderer
```

### Branch protocol

`main` is the release branch and **is only updated by PR from `develop`**:

- Do not push directly to `main` (nor force-push or delete it).
- PRs into `main` **must** have `develop` as the source branch: the
  [`branch-enforcement.yml`](.github/workflows/branch-enforcement.yml) workflow fails otherwise.
- The merge requires the CI checks in green (`Tests`, `Dependency Audit`) and the
  `Require develop source` check.
- The normal flow is: work on a branch → merge into `develop` → PR `develop → main` → release.

**Hotfix**: if the protocol ever had to be bypassed, disable the **“PR only”** ruleset in
*Settings → Rules* (a manual, exceptional action) and re-enable it when done.

## License

MIT. See [`LICENSE`](LICENSE).
