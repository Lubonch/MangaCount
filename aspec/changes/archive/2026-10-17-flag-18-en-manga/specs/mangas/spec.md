## ADDED Requirements

### Requirement: Indicador de contenido adulto en la entidad manga

The system SHALL persistir el indicador de contenido adulto como una columna `IsAdult`
(`INTEGER NOT NULL DEFAULT 0`) de la tabla `Manga`, y SHALL ser la fuente de verdad del flag +18 para la
interfaz. El DTO de manga SHALL exponer `isAdult` y las operaciones de alta/edición SHALL aceptarlo. El
esquema SHALL evolucionar de forma idempotente y aditiva desde la versión anterior, con un backfill que
marque los mangas cuyo vínculo de portada activo sea +18.

#### Scenario: Alta o edición manual del flag

- **WHEN** el usuario crea o edita un manga marcando contenido +18
- **THEN** el manga queda persistido con `IsAdult` en verdadero y su DTO expone `isAdult: true`

#### Scenario: Backfill al migrar una base existente

- **WHEN** la app abre una base anterior a la columna y un manga tiene un vínculo de portada con `IsAdult` verdadero
- **THEN** ese manga queda con `IsAdult` en verdadero, los demás quedan en falso y la migración es idempotente

#### Scenario: Base nueva

- **WHEN** la app abre una base nueva
- **THEN** la tabla `Manga` incluye la columna del indicador con valor por defecto falso

## MODIFIED Requirements

### Requirement: Persistencia del indicador de contenido adulto de la portada

The system SHALL persistir, junto al vínculo de portada de un manga, si esa portada corresponde a
contenido para adultos (+18) en una columna `IsAdult` (`INTEGER NOT NULL DEFAULT 0`) de
`MangaExternalRef`, pero el flag que la interfaz usa para difuminar SHALL ser el de la entidad
`Manga`. Al vincular una portada remota (AniList) cuyo candidato es +18 el sistema SHALL promover
`Manga.IsAdult` a verdadero y SHALL NOT apagarlo automáticamente; al vincular una portada local SHALL NOT
modificar `Manga.IsAdult`. Las portadas ya vinculadas antes de incorporar el indicador SHALL quedar sin
marcar en el vínculo (no adulto), **sin backfill** por AniList.

#### Scenario: Vincular una portada +18 desde AniList

- **WHEN** el usuario vincula un candidato de AniList cuyo `isAdult` es verdadero
- **THEN** el vínculo se persiste con el indicador de contenido adulto en verdadero y el manga queda marcado +18

#### Scenario: Vincular una portada no adulta

- **WHEN** el usuario vincula un candidato de AniList con `isAdult` falso, o elige una imagen local, sobre un manga ya marcado +18
- **THEN** el manga conserva `IsAdult` en verdadero

### Requirement: Mapa de portadas con indicador de contenido adulto

The system SHALL exponer, para pintar la colección sin una llamada por manga, un mapa de portadas
indexado por `mangaId` cuyos valores SHALL incluir la URL de la portada y si esa portada debe
difuminarse (`{ url, isAdult }`). El mapa SHALL ser provider-agnóstico y SHALL derivar el indicador de
la entidad `Manga`, no del vínculo de portada.

#### Scenario: Mapa con portada adulta y no adulta

- **WHEN** el renderer pide el mapa de portadas y hay un manga marcado +18 y otro sin marcar
- **THEN** cada entrada del mapa incluye su URL y el indicador de contenido adulto del manga

#### Scenario: Portada no adulta de un manga marcado +18

- **WHEN** un manga está marcado +18 pero su portada (por ejemplo local) no provino de un candidato adulto
- **THEN** el mapa reporta esa portada como de contenido adulto
