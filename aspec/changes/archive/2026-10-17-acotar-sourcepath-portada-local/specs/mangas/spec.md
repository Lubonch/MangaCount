## MODIFIED Requirements

### Requirement: Canal IPC de portada local

The system SHALL exponer un canal IPC `cover:local` que acepta `{ mangaId, sourcePath }` y devuelve
`{ ref, coverUrl }`, registrado en el preload y consumible por el renderer a través del adaptador. El
`sourcePath` SHALL ser una ruta devuelta por `dialog:pick-file` en la misma sesión del proceso main; el
handler SHALL consumir ese permiso (un solo uso) antes de leer el archivo y SHALL rechazar cualquier
ruta no otorgada por el diálogo sin leerla.

#### Scenario: Invocar el vínculo local vía IPC

- **WHEN** el renderer invoca `cover:local` con un `mangaId` y un `sourcePath` válidos, elegidos antes por el diálogo
- **THEN** el proceso main ejecuta el vínculo de portada local y devuelve el ref y la URL de la portada

#### Scenario: Ruta no elegida por el diálogo

- **WHEN** el renderer invoca `cover:local` con un `sourcePath` que no fue devuelto por `dialog:pick-file` en esta sesión
- **THEN** el proceso main rechaza la operación con un error y no lee el archivo

#### Scenario: Permiso de un solo uso

- **WHEN** el renderer vuelve a invocar `cover:local` con la misma ruta de una vinculación previa
- **THEN** el proceso main rechaza la operación hasta que el usuario vuelva a elegir el archivo por el diálogo
