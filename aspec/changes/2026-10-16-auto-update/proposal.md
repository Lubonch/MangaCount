# Proposal: Auto-update dentro de la app (Windows + AppImage) manteniendo el link en el resto

## Problem

El chequeo de actualizaciones (1.0.10) **solo avisa y linkea a GitHub**: el footer muestra
`vX → vY (click)` y el botón de Settings abre la página del release. El usuario tiene que **descargar e
instalar a mano**. La idea es que, donde el canal lo permita, la app **baje e instale la actualización
sola** y pida reiniciar.

Por el modelo de distribución, no todos los canales pueden auto-actualizarse:

| Canal | ¿Auto-update? |
|---|---|
| Windows `.exe` (NSIS) | ✅ sí |
| AppImage **corrido directo** (carpeta escribible) | ✅ sí |
| Arch `makepkg` → `/opt` | ❌ lo maneja `pacman` |
| Debian `.deb` | ❌ lo maneja `apt` |

Se quiere: **auto-update real** en Windows y AppImage, y **check + link** (lo actual) en `.deb`/`makepkg`.

## Proposed change

- **`electron-updater`** como dependencia y **config `publish`** (provider `github`, owner/repo) en
  electron-builder.
- **Detección de modo** en el main:
  - `auto`: empaquetada **y** (Windows **o** `process.env.APPIMAGE` seteado).
  - `link`: el resto.
- **Modo auto**: `autoUpdater.checkForUpdates()` + eventos → UI con estados:
  - hay update → botón **Descargar** (arranca la descarga);
  - `download-progress` → “Descargando… X%”;
  - `update-downloaded` → **Reiniciar para actualizar** (`autoUpdater.quitAndInstall()`);
  - errores → se loguean, sin romper.
- **Modo link**: se mantiene el comportamiento actual (footer/enlace + “Buscar actualización” abre el
  release en GitHub).
- **Workflow de release**: además de los instaladores, **generar y subir `latest.yml` (Win) y
  `latest-linux.yml` (AppImage)** — sin esos metadatos electron-updater no encuentra la actualización.
- **Sin firma** (decisión): SmartScreen puede seguir avisando en Windows; el updater NO verifica firma.
- **Dev**: se omite (`!app.isPackaged`).
- `autoUpdater` inyectable en el servicio para testear sin red.

## Scope

In scope:

- Dependencia `electron-updater` + config `publish` (github) en `package.json`.
- Servicio `updates`/nuevo módulo que detecta el modo y encapsula `autoUpdater` (check, download,
  events, `quitAndInstall`); inyectable para tests.
- IPC/UI: en modo auto, el footer/Settings muestran **Descargar** y el progreso, y **Reiniciar para
  actualizar**; en modo link, lo actual.
- Workflow `release.yml`: publicar `latest.yml`/`latest-linux.yml` junto a los artefactos.
- Tests: detección de modo; el flujo auto con `autoUpdater` fake (check → downloading → downloaded →
  quitAndInstall); en modo link no se usa el updater.
- Docs (`README`/`docs/desktop.md`): qué canales se auto-actualizan y cuáles no; SmartScreen en Windows.

Out of scope:

- **Firma de código** (sin opción gratuita; app de uso personal). No se firma ni se verifica firma.
- macOS (requiere firma + notarización de Apple; no distribuimos mac).
- Auto-update en `.deb`/`makepkg` (los maneja el gestor de paquetes).
- Reinicio **silencioso** sin aviso: siempre se pide reiniciar (o se ofrece “Más tarde”).

## Risks

- **SmartScreen en Windows**: sin firma, el instalador nuevo puede volver a mostrar la advertencia.
  Mitigación: se documenta; el auto-update igual funciona.
- **Canales sin auto-update** (deb/makepkg): el usuario sigue con `makepkg -si`. Mitigación: el modo
  link se mantiene y se documenta.
- **Metadata faltante**: si el workflow no sube `latest.yml`, el updater no encuentra nada. Mitigación:
  task explícita + verificación en un release.
- **Releases draft**: electron-updater solo ve releases **publicadas** (ya publicamos).
- **Fallos de red/descarga**: se loguean y se reintenta; no rompen la app.
- **AppImage en `/opt`**: el modo auto solo aplica si `$APPIMAGE` está seteado (corrido directo); en
  `/opt` cae a link.

## Decisiones

- **Sin firma** (no hay opción gratuita; uso personal).
- **Canales con auto-update**: Windows (NSIS) + AppImage directo; `.deb`/`makepkg` → link.
- Siempre con **confirmación/reinicio** del usuario (no instalar en silencio).
