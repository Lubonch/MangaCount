
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

### Requirement: Retención de los últimos cinco backups

The system SHALL conservar únicamente los 5 backups más recientes en el destino, podando solo los
archivos que coincidan con el patrón propio `mangacount-backup-*.zip` y sin tocar archivos ajenos.

#### Scenario: Podar backups excedentes

- **WHEN** existe un sexto backup en el destino tras crear uno nuevo
- **THEN** el sistema elimina el más antiguo de los propios y deja exactamente 5, sin borrar archivos de otros programas

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

### Requirement: Listado de backups bajo demanda y sin bloquear la interfaz

The system SHALL NOT ejecutar I/O del directorio de destino de backup en el hilo principal de la
aplicación. El canal `backup:list` SHALL ser asíncrono y SHALL devolver `{ backups, status }` con
`status` en `unset | ok | unresponsive`. La pantalla de Settings NO SHALL pedir la lista al abrirse:
SHALL cargarla bajo demanda (al expandir la sección Backup o con una acción explícita de refresco) y
SHALL mantener visible la última lista conocida mientras carga. Si el destino no responde dentro del
timeout, el sistema SHALL mantener la interfaz operativa, conservar la última lista y avisar al usuario.

#### Scenario: Abrir Settings no toca el destino

- **WHEN** el usuario abre Settings con un destino de backup configurado en un montaje lento
- **THEN** la pantalla aparece de inmediato y no se consulta el directorio de destino

#### Scenario: Listar con el destino disponible

- **WHEN** el usuario expande la sección Backup (o pulsa Refrescar) y el destino responde
- **THEN** el sistema devuelve `{ backups, status: 'ok' }` con nombre, tamaño y fecha de cada backup

#### Scenario: Destino que no responde

- **WHEN** el directorio de destino no responde dentro del timeout
- **THEN** el sistema devuelve `{ status: 'unresponsive' }`, la app sigue respondiendo, se mantiene la última lista conocida y se muestra un aviso

#### Scenario: Sin destino configurado

- **WHEN** no hay `destinationDir` configurado
- **THEN** el sistema devuelve `{ backups: [], status: 'unset' }` sin tocar el filesystem


### Requirement: Operaciones de backup con destino remoto no bloquean la app

The system SHALL ejecutar el I/O del directorio de destino (crear, escribir, renombrar y podar el
backup) fuera del hilo principal, con un timeout, tanto en el backup manual como en el automático. Un
destino lento o que no responde SHALL NOT congelar la interfaz.

#### Scenario: Backup manual con destino lento

- **WHEN** el usuario pide "Backup ahora" con un destino lento
- **THEN** la interfaz sigue respondiendo mientras se escribe el zip en el destino

#### Scenario: Backup automático con destino lento

- **WHEN** el backup automático (`onStartup` o `whileRunning`) escribe en un destino lento
- **THEN** la app permanece operativa y el resultado (OK o error) queda en el indicador de estado

#### Scenario: Timeout del destino

- **WHEN** una operación del destino supera el timeout
- **THEN** el sistema la reporta como error de destino sin bloquear el hilo principal
