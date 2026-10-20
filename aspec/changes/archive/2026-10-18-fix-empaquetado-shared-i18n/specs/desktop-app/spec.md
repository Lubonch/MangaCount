## ADDED Requirements

### Requirement: El paquete incluye todo módulo que el main importa en runtime

The system SHALL empaquetar en el `app.asar` todo archivo del repo que el proceso main importe o lea en
runtime, de modo que la app empaquetada arranque igual que desde el repo. La lista de archivos del
empaquetado SHALL cubrir por defecto los directorios compartidos (`shared/**`) y NO SHALL incluir los
archivos de test. Un import de runtime no cubierto SHALL detectarse en los tests automáticos, no en
producción.

#### Scenario: Directorio compartido nuevo queda empaquetado

- **WHEN** el main importa un módulo de un directorio compartido incluido en `build.files`
- **THEN** ese módulo está presente en el `app.asar` y la app empaquetada arranca sin `ERR_MODULE_NOT_FOUND`

#### Scenario: Un import no empaquetado falla en los tests

- **WHEN** un import de runtime del main resuelve a un archivo que `build.files` no cubre
- **THEN** el test de empaquetado falla nombrando el archivo faltante

#### Scenario: Los tests no se empaquetan

- **WHEN** se construye el paquete
- **THEN** los archivos `*.test.js` de los directorios compartidos no forman parte del `app.asar`

### Requirement: Verificación del paquete antes de publicar una release

The system SHALL verificar, antes de publicar una release, que la app **empaquetada** arranca: se SHALL
construir el paquete y **ejecutarlo**, y SHALL fallar si el proceso termina solo o si la salida contiene
un error de arranque (`ERR_MODULE_NOT_FOUND`, `Cannot find module` o un error de JavaScript en el
proceso main). La verificación SHALL ejecutarse en los PRs hacia `main` y estar disponible como comando
local.

#### Scenario: El paquete roto no llega a la release

- **WHEN** el paquete no arranca (por ejemplo, un módulo importado que no se empaquetó)
- **THEN** la verificación del paquete falla y el PR hacia `main` no puede mergearse

#### Scenario: El paquete sano pasa la verificación

- **WHEN** el paquete arranca y permanece vivo durante la ventana de verificación
- **THEN** la verificación pasa sin errores de arranque en la salida
