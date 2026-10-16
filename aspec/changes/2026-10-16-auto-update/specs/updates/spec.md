## ADDED Requirements

### Requirement: Auto-update por canal con link en el resto

The system SHALL, cuando esté empaquetada y el canal lo soporte (**Windows NSIS** o **AppImage** corrido
con `$APPIMAGE` seteado), **descargar e instalar** la actualización dentro de la app con
`electron-updater`, ofreciendo **Descargar** y luego **Reiniciar para actualizar**. En los canales donde
el ejecutable lo maneja el gestor de paquetes (`.deb`) o no hay `$APPIMAGE` (instalación de `makepkg`
en `/opt`), y en desarrollo, SHALL mantener el comportamiento de **avisar y linkear** a la release en
GitHub. El modo SHALL resolverse en runtime.

#### Scenario: Auto-update disponible (Windows/AppImage)

- **WHEN** hay una versión nueva y el modo es `auto`
- **THEN** el sistema ofrece **Descargar**, muestra el progreso y al terminar ofrece **Reiniciar para actualizar**

#### Scenario: Canal sin auto-update (deb/makepkg/dev)

- **WHEN** el modo es `link` (por ejemplo instalación de `makepkg` en `/opt`)
- **THEN** el sistema muestra el enlace `vX → vY` a GitHub y no intenta descargar ni instalar

#### Scenario: Error de descarga

- **WHEN** la descarga de la actualización falla
- **THEN** se registra en el log y la app sigue funcionando (sin romperse)
