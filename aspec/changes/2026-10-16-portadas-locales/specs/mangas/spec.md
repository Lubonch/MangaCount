## ADDED Requirements

### Requirement: Portada desde un archivo local

The system SHALL permitir vincular la portada de un manga desde un archivo de imagen elegido por el
usuario en su equipo, copiándolo al mismo cache de portadas (`<userData>/covers/`) y sirviéndolo por el
protocolo propio de la app, sin depender de que el manga exista en AniList. El sistema SHALL validar el
contenido por **magic bytes** (PNG/JPEG/WEBP/GIF), NO SHALL confiar en la extensión declarada, SHALL
rechazar contenidos no soportados (incluido SVG) y SHALL imponer un tamaño máximo antes de escribir. El
archivo SHALL guardarse con un nombre generado a partir del manga (`<mangaId>.<ext>`), sin path traversal.

#### Scenario: Elegir una imagen del equipo

- **WHEN** el usuario elige un archivo de imagen válido de su equipo para un manga que no existe en AniList
- **THEN** el sistema lo copia al cache de portadas con la extensión real detectada, deja el vínculo y lo sirve por el protocolo propio

#### Scenario: Extensión no confiable

- **WHEN** el archivo elegido declara una extensión de imagen pero su contenido no coincide con ningún formato soportado
- **THEN** el sistema lo rechaza y no escribe nada en el cache

#### Scenario: Formato no soportado

- **WHEN** el archivo elegido es SVG o un contenido que no es PNG/JPEG/WEBP/GIF
- **THEN** el sistema lo rechaza con un mensaje y la portada existente no cambia

#### Scenario: Archivo demasiado grande

- **WHEN** el archivo elegido supera el tamaño máximo permitido
- **THEN** el sistema lo rechaza sin leerlo ni copiarlo

### Requirement: Un solo cover activo por manga con procedencia

The system SHALL mantener un único vínculo de portada activo por manga. Al vincular una portada (por
AniList o local), el sistema SHALL reemplazar cualquier vínculo previo del manga, incluidos los de otros
proveedores, eliminando el registro previo y su archivo. El proveedor del vínculo SHALL registrar la
**procedencia** de la portada. Las consultas de estado, desvínculo y mapa de portadas SHALL ser
provider-agnósticas (SHALL resolver el vínculo del manga sin fijar un proveedor), y el vínculo automático
por AniList NO SHALL pisar una portada ya vinculada por otra vía.

#### Scenario: Portada local reemplaza a la de AniList

- **WHEN** un manga ya tiene portada de AniList y el usuario vincula una imagen local
- **THEN** el sistema guarda la procedencia local, elimina el vínculo y el archivo de AniList, y muestra la portada local

#### Scenario: Portada de AniList reemplaza a la local

- **WHEN** un manga tiene portada local y el usuario elige un candidato de AniList
- **THEN** el sistema guarda la procedencia AniList y elimina el vínculo y el archivo local

#### Scenario: Estado y desvínculo provider-agnósticos

- **WHEN** un manga tiene portada local y se consulta su estado o se desvincula
- **THEN** el sistema reporta la procedencia correcta y, al desvincular, elimina el vínculo y el archivo de esa portada

#### Scenario: El auto-match no pisa una portada local

- **WHEN** un manga tiene una portada local y corre el vínculo automático por AniList
- **THEN** el sistema conserva la portada local sin reemplazarla

### Requirement: Canal IPC de portada local

The system SHALL exponer un canal IPC `cover:local` que acepta `{ mangaId, sourcePath }` y devuelve
`{ ref, coverUrl }`, registrado en el preload y consumible por el renderer a través del adaptador.

#### Scenario: Invocar el vínculo local vía IPC

- **WHEN** el renderer invoca `cover:local` con un `mangaId` y un `sourcePath` válidos
- **THEN** el proceso main ejecuta el vínculo de portada local y devuelve el ref y la URL de la portada

## MODIFIED Requirements

### Requirement: Portada del manga con fallback

The system SHALL obtener la portada del manga a partir de su vínculo activo —procedente de AniList **o de
un archivo local del usuario**—, **cachearla localmente** y servirla al renderer por el protocolo propio
de la app; cuando no haya vínculo o no haya red SHALL mostrar una **portada generada** (sin depender de la
red). La descarga desde AniList SHALL validar que el contenido sea una imagen y SHALL guardarla con un
nombre de archivo seguro; el vínculo local SHALL validar el contenido por magic bytes y el tamaño máximo.

#### Scenario: Descargar y cachear la portada

- **WHEN** se vincula un manga que tiene portada disponible en AniList
- **THEN** el sistema la descarga, la guarda localmente y la muestra en la colección

#### Scenario: Usar una portada local

- **WHEN** un manga no existe en AniList pero el usuario eligió una imagen de su equipo
- **THEN** el sistema copia la imagen al cache, la sirve por el protocolo propio y la muestra en la colección

#### Scenario: Sin vínculo o sin red

- **WHEN** un manga no tiene vínculo activo o la red no está disponible
- **THEN** el sistema muestra una portada generada y la colección sigue funcionando

#### Scenario: Contenido no válido

- **WHEN** lo descargado no es una imagen o excede el tamaño máximo permitido, o el archivo local elegido no es una imagen soportada o excede el tamaño máximo
- **THEN** el sistema lo descarta y mantiene la portada generada o la portada previa

#### Scenario: Funciona offline

- **WHEN** la app se usa sin conexión y la portada ya fue cacheada (por AniList o local)
- **THEN** la portada cacheada se sigue mostrando
