# Proposal: El workflow de release publica los metadatos de auto-update (`latest.yml`)

## Problem

El auto-update (change `2026-10-16-auto-update`) usa `electron-updater`, que necesita los **metadatos
de actualización** en la release: `latest.yml` (Windows) y `latest-linux.yml` (AppImage). Hoy
`.github/workflows/release.yml` sube **solo los instaladores** (`.exe`, `.deb`, `.AppImage`), así que
el updater no encuentra la actualización.

Además, este cambio vive bajo `.github/workflows/`, y el token del agente **no tiene el scope
`workflow`**, por lo que no puede pushear modificaciones a workflows: se mantiene **aparte** para
aplicarlo desde una cuenta/credencial con permiso.

## Proposed change

En `.github/workflows/release.yml`, agregar los metadatos a los artefactos de cada job:

```yaml
          - os: ubuntu-latest
            command: npm run dist:linux
            artifacts: |
              release/*.deb
              release/*.AppImage
              release/latest-linux.yml
          - os: windows-latest
            command: npm run dist:win
            artifacts: |
              release/*.exe
              release/latest.yml
```

(El resto del flujo ya está: `electron-builder` genera los `latest*.yml` porque `package.json` tiene
`build.publish` con provider `github`; las releases se publican, no quedan en draft.)

## Scope

In scope:

- Agregar `release/latest-linux.yml` y `release/latest.yml` a los artefactos subidos por el workflow.
- Verificar en la próxima release que ambos archivos quedan publicados.

Out of scope:

- Cambios en `package.json`/código (ya hechos en `2026-10-16-auto-update`).
- Firma de código (fuera de alcance por decisión).

## Risks / Decisiones

- **Scope `workflow`**: el push de `.github/workflows/*` requiere un token con scope `workflow`; se
  hace desde la cuenta del repo.
- Sin estos metadatos, el auto-update queda inerte (solo funciona el check+link).
