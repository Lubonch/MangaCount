## MODIFIED Requirements

### Requirement: Backup completo del sistema en zip

The system SHALL crear un backup del estado completo de la aplicación como un archivo `.zip` que
contenga un snapshot consistente de `mangacount.db` (tomado con `db.backup()` de better-sqlite3,
nunca copiando el `.db` vivo con WAL), las carpetas `profiles/` y `covers/` (con sus subdirectorios)
y un `manifest.json` con `app`, `schemaVersion` y `createdAt`; el `preferences.json` y los `logs/`
NO se incluyen.

#### Scenario: Crear un backup manual

- **WHEN** el usuario pide "Backup ahora" desde Settings con un destino válido
- **THEN** el sistema escribe `mangacount-backup-<timestamp>.zip` en el destino con `manifest.json`, `mangacount.db`, `profiles/` y `covers/`, y el `.db` del backup pasa `PRAGMA integrity_check`

#### Scenario: Backup de un manga con portada

- **WHEN** existe un manga con portada cacheada en `<userData>/covers/<mangaId>.<ext>`
- **THEN** el `.zip` incluye esa portada bajo `covers/<mangaId>.<ext>`

### Requirement: Restore que reemplaza todo el estado

The system SHALL restaurar un backup `.zip` reemplazando por completo `mangacount.db`, `profiles/` y
`covers/` para dejar el sistema idéntico al momento del backup, validando el `manifest.json` y
`PRAGMA integrity_check` antes de tocar datos, generando un backup de seguridad del estado actual y
limpiando los sidecar `-wal`/`-shm` antes de reemplazar.

#### Scenario: Restaurar un backup válido

- **WHEN** el usuario elige un backup válido y confirma el restore destructivo
- **THEN** el sistema genera un backup de seguridad del estado actual, reemplaza `mangacount.db`, `profiles/` y `covers/`, reabre la base y el estado queda idéntico al del backup

#### Scenario: Restaurar en otra PC conserva las imágenes

- **WHEN** se restaura un backup creado por esta versión en otra instalación
- **THEN** las fotos de perfil y las portadas quedan disponibles sin volver a vincularlas

#### Scenario: Restaurar un backup viejo sin portadas

- **WHEN** se restaura un `.zip` creado antes de este cambio (sin entradas `covers/`)
- **THEN** el restore completa sin error y deja el cache de portadas vacío, consistente con el snapshot
