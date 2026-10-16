## ADDED Requirements

### Requirement: Backup completo del sistema en zip

The system SHALL crear un backup del estado completo de la aplicación como un archivo `.zip` que
contenga un snapshot consistente de `mangacount.db` (tomado con `db.backup()` de better-sqlite3,
nunca copiando el `.db` vivo con WAL), la carpeta `profiles/` y un `manifest.json` con `app`,
`schemaVersion` y `createdAt`; el `preferences.json` y los `logs/` NO se incluyen.

#### Scenario: Crear un backup manual

- **WHEN** el usuario pide "Backup ahora" desde Settings con un destino válido
- **THEN** el sistema escribe `mangacount-backup-<timestamp>.zip` en el destino con `manifest.json`, `mangacount.db` y `profiles/`, y el `.db` del backup pasa `PRAGMA integrity_check`

### Requirement: Retención de los últimos cinco backups

The system SHALL conservar únicamente los 5 backups más recientes en el destino, podando solo los
archivos que coincidan con el patrón propio `mangacount-backup-*.zip` y sin tocar archivos ajenos.

#### Scenario: Podar backups excedentes

- **WHEN** existe un sexto backup en el destino tras crear uno nuevo
- **THEN** el sistema elimina el más antiguo de los propios y deja exactamente 5, sin borrar archivos de otros programas

### Requirement: Restore que reemplaza todo el estado

The system SHALL restaurar un backup `.zip` reemplazando por completo `mangacount.db` y `profiles/`
para dejar el sistema idéntico al momento del backup, validando el `manifest.json` y
`PRAGMA integrity_check` antes de tocar datos, generando un backup de seguridad del estado actual y
limpiando los sidecar `-wal`/`-shm` antes de reemplazar.

#### Scenario: Restaurar un backup válido

- **WHEN** el usuario elige un backup válido y confirma el restore destructivo
- **THEN** el sistema genera un backup de seguridad del estado actual, reemplaza `mangacount.db` y `profiles/`, reabre la base y el estado queda idéntico al del backup

#### Scenario: Rechazar un backup inválido

- **WHEN** el archivo elegido no tiene `manifest.json`, o `app` no es "MangaCount", o `schemaVersion` es incompatible
- **THEN** el sistema rechaza el restore con un mensaje claro y no modifica ningún dato

### Requirement: Backup automático configurable con destino obligatorio

The system SHALL permitir configurar un backup automático, deshabilitado por defecto, que al
habilitarse exija un `destinationDir` y al menos un disparador (`onStartup` o `whileRunning`), con
un intervalo configurable en minutos y retención de los últimos 5 backups.

#### Scenario: Habilitar el automático exige configuración

- **WHEN** el usuario intenta habilitar el backup automático sin destino o sin ningún disparador
- **THEN** el sistema impide guardar la configuración y solicita el destino y al menos un disparador

#### Scenario: Disparador al iniciar con intervalo vencido

- **WHEN** la app arranca con el backup automático habilitado, el disparador `onStartup` activo y `now - lastBackupAt` mayor al intervalo
- **THEN** el sistema crea un backup y actualiza `lastBackupAt`

#### Scenario: Disparador mientras la app corre

- **WHEN** la app está abierta con el disparador `whileRunning` activo
- **THEN** el sistema crea un backup cada intervalo mientras la app vive y detiene el temporizador al salir

### Requirement: Indicador de estado del backup

The system SHALL registrar el resultado del último backup (`lastBackupStatus`) y exponerlo en
Settings, de modo que un fallo (destino inexistente, sin permiso) quede visible con fecha/hora y en
el log sin interrumpir la aplicación.

#### Scenario: Fallo de backup visible

- **WHEN** un backup automático o manual falla porque el destino no está disponible
- **THEN** el sistema registra el error en el log y muestra "último backup falló" con fecha/hora en Settings, y la app sigue funcionando
