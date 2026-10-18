
### Requirement: Modo residente en bandeja

The system SHALL permanecer residente en la bandeja del sistema: cerrar la ventana la oculta en
lugar de cerrar la app, y el menú del tray SHALL ofrecer *Abrir*, *Estado del bot*, *Iniciar con el
sistema* y *Salir*. El único camino a `app.quit()` SHALL ser el ítem *Salir*.

#### Scenario: Cerrar la ventana

- **WHEN** el usuario cierra la ventana de la app
- **THEN** la ventana se oculta y el proceso (y el bot) siguen vivos

#### Scenario: Salir desde el tray

- **WHEN** el usuario elige *Salir* en el menú del tray
- **THEN** el bot se detiene, la base se cierra y la app termina

### Requirement: Arranque en bandeja por defecto

The system SHALL arrancar en la bandeja por defecto (preferencia `startInTray: true`), incluido el
arranque con el sistema mediante el argumento `--hidden`, sin mostrar la ventana.

#### Scenario: Arranque por defecto

- **WHEN** la app arranca sin argumentos
- **THEN** no muestra la ventana y queda residente en el tray

### Requirement: Instancia única

The system SHALL garantizar una única instancia: un segundo lanzamiento (por ejemplo autostart más
apertura manual) SHALL enfocar la instancia existente en lugar de crear otro proceso, evitando dos
conexiones de bot y dos escritores SQLite.

#### Scenario: Segundo lanzamiento

- **WHEN** se lanza la app con una instancia ya en ejecución
- **THEN** la segunda instancia sale y la primera muestra la ventana

### Requirement: Autostart opcional por sistema operativo

The system SHALL ofrecer un toggle de inicio con el sistema, apagado por defecto. En Windows y macOS
SHALL usar `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })`; en Linux SHALL
escribir o eliminar `~/.config/autostart/mangacount.desktop` resolviendo la ruta real del ejecutable
(`process.env.APPIMAGE` para AppImage, o el binario del `.deb`). El estado mostrado SHALL reflejar
la configuración real del sistema.

#### Scenario: Activar autostart en Linux

- **WHEN** el usuario activa *Iniciar con el sistema* en Linux
- **THEN** se crea `~/.config/autostart/mangacount.desktop` apuntando a la ruta real del ejecutable

#### Scenario: Desactivar autostart

- **WHEN** el usuario desactiva la opción
- **THEN** el archivo `.desktop` (o el login item) se elimina y el estado queda apagado


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
