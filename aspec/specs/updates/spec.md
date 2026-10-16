
### Requirement: Chequeo de actualizaciones contra GitHub Releases

The system SHALL exponer el canal IPC `update:check`, que consulta la última release publicada de
`github.com/Lubonch/MangaCount` (excluyendo drafts/prereleases), compara su versión con
`app.getVersion()` (semver) y devuelve `{ current, latest, hasUpdate, url, name, publishedAt }`. En
error de red SHALL devolver `hasUpdate:false` con el error y NO SHALL romper la app; en desarrollo
(`!app.isPackaged`) SHALL devolver `skipped:true`. El sistema SHALL exponer además `app:info`
(`version`, `platform`, `arch`, `packaged`).

#### Scenario: Hay una versión nueva

- **WHEN** la última release publicada es mayor que la versión actual
- **THEN** `update:check` devuelve `hasUpdate:true` con `latest` y `url`

#### Scenario: Sin red o error de la API

- **WHEN** la consulta a GitHub falla
- **THEN** `update:check` devuelve `hasUpdate:false` con el error, se loguea y la app sigue funcionando

### Requirement: Chequeo automático al iniciar y manual en Settings

The system SHALL chequear actualizaciones automáticamente **una vez al abrir la app** cuando la
preferencia `updateCheck` (default `true`) está habilitada, y SHALL ofrecer un **botón manual**
("Buscar actualización") en Settings que verifica al apretarlo. NO SHALL chequear automáticamente al
entrar a Settings.

#### Scenario: Chequeo al abrir la app

- **WHEN** la app abre con `updateCheck` habilitado
- **THEN** se consulta si hay una versión nueva

#### Scenario: Chequeo deshabilitado

- **WHEN** `updateCheck` está deshabilitado
- **THEN** no se hace el chequeo automático al abrir la app

#### Scenario: Botón manual en Settings

- **WHEN** el usuario aprieta "Buscar actualización"
- **THEN** el sistema verifica y muestra "Estás al día" o "vY disponible"

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
