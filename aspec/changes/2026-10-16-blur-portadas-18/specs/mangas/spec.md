## ADDED Requirements

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
