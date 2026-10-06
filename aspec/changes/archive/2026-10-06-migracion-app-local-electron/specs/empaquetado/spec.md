## ADDED Requirements

### Requirement: Instaladores desktop multiplataforma

The system SHALL distribuirse como aplicación instalable vía `electron-builder`: `nsis` (instalador `.exe` para Windows), `deb` (Debian/Ubuntu) y `AppImage` (Arch y resto de distros). El empaquetado SHALL construir el renderer (`vite build`) antes de ejecutar `electron-builder` y SHALL reconstruir el módulo nativo `better-sqlite3` para el ABI de Electron. Los datos de usuario (SQLite, fotos, logs) van en `app.getPath('userData')` fuera del bundle. La generación de instaladores SHALL correr en CI sobre un tag (`v*`), construir en runners Windows y Linux (no se cross-compila el `.exe`) y adjuntar los artefactos a un GitHub Release draft.

#### Scenario: Instalar y persistir en cada plataforma

- **WHEN** el usuario instala el exe en Windows, el deb en Debian/Ubuntu o ejecuta el AppImage en Arch
- **THEN** la app arranca, la colección persiste entre reinicios, el TSV importa/exporta y la foto de perfil se muestra; la publicación en Microsoft Store, Snap o AUR oficial queda fuera de este change

#### Scenario: Release con artefactos por tag

- **WHEN** se hace push de un tag `v*`
- **THEN** el workflow compila el `.exe` en `windows-latest` y el `.deb`/`.AppImage` en `ubuntu-latest`, los sube como artifacts y crea un GitHub Release en borrador con los tres instaladores, sin publicarlos automáticamente

#### Scenario: Empaquetar sin dist viejo

- **WHEN** se ejecuta el script de distribución
- **THEN** primero se genera `mangacount.client/dist` con el renderer actual y recién después se empaqueta, evitando incluir un bundle desactualizado o inexistente
