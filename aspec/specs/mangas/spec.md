
### Requirement: CRUD de mangas

The system SHALL crear, consultar y actualizar mangas persistiendo en SQLite embebida vía canales IPC (`manga:list`, `manga:get`, `manga:upsert`), conservando el mismo modelo `Profile→Entry→Manga→Format/Publisher` y los mismos DTOs, sin `MangaController`/`MangaRepository` ni ORM.

#### Scenario: Alta y consulta de manga vía IPC local

- **WHEN** el renderer invoca el canal IPC de mangas con un manga válido
- **THEN** el proceso main lo persiste en SQLite (mismo modelo Profile→Entry→Manga→Format/Publisher y mismos DTOs) y lo devuelve, sin `MangaController` ni ORM

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

### Requirement: Persistencia del indicador de contenido adulto de la portada

The system SHALL persistir, junto al vínculo de portada de un manga, si esa portada corresponde a
contenido para adultos (+18). El indicador SHALL guardarse en una columna `IsAdult`
(`INTEGER NOT NULL DEFAULT 0`) de `MangaExternalRef` y SHALL viajar en el DTO del vínculo. Al vincular
una portada remota (AniList) el indicador SHALL tomarse del campo `isAdult` del candidato; al vincular
una portada local SHALL guardarse en `false`. Las portadas ya vinculadas antes de incorporar el
indicador SHALL quedar en `false` (no adulto) **sin backfill** (SHALL NOT re-consultarse AniList). El
esquema SHALL evolucionar de forma **idempotente y segura** sobre bases existentes, agregando la columna
con valor por defecto sin perder datos.

#### Scenario: Vincular una portada +18 desde AniList

- **WHEN** el usuario vincula un candidato de AniList cuyo `isAdult` es verdadero
- **THEN** el vínculo se persiste con el indicador de contenido adulto en verdadero

#### Scenario: Vincular una portada no adulta

- **WHEN** el usuario vincula un candidato de AniList con `isAdult` falso o elige una imagen local de su equipo
- **THEN** el vínculo se persiste con el indicador de contenido adulto en falso

#### Scenario: Migración de una base existente

- **WHEN** la app abre una base creada antes de existir la columna y su versión de esquema es anterior
- **THEN** la columna se agrega con valor por defecto falso, la versión de esquema se actualiza y la migración es idempotente (no falla si la columna ya existe)

#### Scenario: Base nueva

- **WHEN** la app abre una base nueva
- **THEN** la tabla de vínculos incluye la columna del indicador de contenido adulto con valor por defecto falso

### Requirement: Mapa de portadas con indicador de contenido adulto

The system SHALL exponer, para pintar la colección sin una llamada por manga, un mapa de portadas
indexado por `mangaId` cuyos valores SHALL incluir la URL de la portada y si esa portada es de
contenido adulto (`{ url, isAdult }`). El mapa SHALL ser provider-agnóstico y SHALL derivar el
indicador del vínculo activo de cada manga.

#### Scenario: Mapa con portada adulta y no adulta

- **WHEN** el renderer pide el mapa de portadas y hay un manga con portada +18 y otro con portada no adulta
- **THEN** cada entrada del mapa incluye su URL y el indicador de contenido adulto correspondiente

### Requirement: Filtro de contenido para adultos en la búsqueda de portadas

The system SHALL excluir por defecto el contenido marcado como +18 (adulto) en la búsqueda de portadas
de AniList, y SHALL permitir incluirlo mediante una preferencia del usuario. Cuando la inclusión está
habilitada, cada candidato adulto SHALL identificarse como tal en la lista de resultados. El filtro
SHALL aplicar por igual a la búsqueda manual, al auto-match y al proceso masivo de portadas faltantes.

#### Scenario: Búsqueda por defecto sin contenido +18

- **WHEN** el usuario busca una portada y la preferencia de contenido adulto está desactivada
- **THEN** los resultados no incluyen entradas marcadas como `isAdult` en AniList

#### Scenario: Inclusión de contenido +18 habilitada

- **WHEN** el usuario habilita la preferencia de contenido adulto y busca una portada
- **THEN** los resultados incluyen las entradas +18 y cada una se marca con un indicador `+18`

#### Scenario: El filtro aplica al auto-match y al proceso masivo

- **WHEN** corren el auto-match al agregar o el proceso masivo de portadas faltantes con la preferencia
  desactivada
- **THEN** ninguna entrada +18 se usa para vincular una portada
