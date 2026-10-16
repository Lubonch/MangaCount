## ADDED Requirements

### Requirement: Referencia externa de manga (vínculo con AniList)

The system SHALL permitir **vincular** cada manga de la colección con una entrada externa de AniList a
través de un identificador propio, **manteniendo el nombre local** del manga. El vínculo SHALL
guardarse separado del registro del manga y SHALL poder resolverse automáticamente por título (probando
variantes) al agregar/editar o, cuando el resultado no sea único, elegirse manualmente por el usuario
desde una lista de candidatos (con portada y títulos). El vínculo SHALL poder quitarse y rehacerse.

#### Scenario: Vincular manualmente

- **WHEN** el usuario busca en AniList y elige un candidato para un manga
- **THEN** el sistema guarda el vínculo externo y el nombre local del manga NO cambia

#### Scenario: Resolución automática

- **WHEN** se agrega o edita un manga y el título resuelve a una única entrada
- **THEN** el sistema guarda el vínculo automáticamente

#### Scenario: Coincidencia ambigua o inexistente

- **WHEN** el título no coincide con ninguna entrada o coincide con varias
- **THEN** el sistema NO vincula y ofrece al usuario buscar y elegir manualmente

### Requirement: Portada del manga con fallback

The system SHALL obtener la portada del manga a partir de la referencia externa, **cachearla localmente**
y servirla al renderer por el protocolo propio de la app; cuando no haya vínculo o no haya red SHALL
mostrar una **portada generada** (sin depender de la red). La descarga SHALL validar que el contenido sea
una imagen y SHALL guardarla con un nombre de archivo seguro.

#### Scenario: Descargar y cachear la portada

- **WHEN** se vincula un manga que tiene portada disponible
- **THEN** el sistema la descarga, la guarda localmente y la muestra en la colección

#### Scenario: Sin vínculo o sin red

- **WHEN** un manga no tiene vínculo externo o la red no está disponible
- **THEN** el sistema muestra una portada generada y la colección sigue funcionando

#### Scenario: Contenido no válido

- **WHEN** lo descargado no es una imagen o excede el tamaño máximo permitido
- **THEN** el sistema lo descarta y usa la portada generada

#### Scenario: Funciona offline

- **WHEN** la app se usa sin conexión y la portada ya fue cacheada
- **THEN** la portada cacheada se sigue mostrando
