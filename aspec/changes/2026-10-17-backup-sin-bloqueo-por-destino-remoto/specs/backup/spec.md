## ADDED Requirements

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
