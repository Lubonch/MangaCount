## ADDED Requirements

### Requirement: Alta de manga desde la búsqueda de títulos de AniList

The system SHALL permitir, durante el alta de un manga, buscar títulos en AniList (con el fallback de
fuente ya existente) y, al elegir un candidato, SHALL crear el manga con el **título elegido por el
usuario** (prefijado desde el candidato y editable) vinculando la **portada** y la **referencia externa**
de ese candidato en la misma operación, sin requerir una segunda búsqueda ni una pantalla aparte. El
sistema SHALL respetar la preferencia de contenido adulto en la búsqueda y SHALL marcar los candidatos
+18. El sistema SHALL exponer un canal IPC `manga:create-from-candidate` que devuelve
`{ manga, coverUrl, coverError }`. El alta manual por `manga:upsert` SHALL permanecer disponible y sin
cambios cuando el usuario no selecciona ningún candidato. El vínculo SHALL promover `Manga.IsAdult`
cuando el candidato es +18, de forma consistente con el vínculo de portada existente.

#### Scenario: Buscar títulos al crear un manga

- **WHEN** el usuario escribe un título en el modal de alta y lo busca
- **THEN** el sistema consulta AniList y muestra candidatos con portada y metadatos (año, volúmenes,
  fuente), sin abrir otra pantalla y sin repetir la búsqueda

#### Scenario: Seleccionar un candidato y crear con portada

- **WHEN** el usuario elige un candidato y confirma el alta
- **THEN** el sistema crea el manga y deja vinculadas la portada y la referencia externa del candidato
  en el mismo paso

#### Scenario: Título prefijado y editable

- **WHEN** el usuario elige un candidato
- **THEN** el campo de nombre se prefija con el título del candidato y el usuario puede editarlo antes
  de confirmar

#### Scenario: Alta manual cuando no hay coincidencia

- **WHEN** el usuario no busca o no encuentra el título en AniList
- **THEN** el sistema crea el manga de forma manual como hoy, sin vínculo externo

#### Scenario: Fallo de descarga de la portada

- **WHEN** se crea un manga desde un candidato y la descarga de la portada falla
- **THEN** el manga queda creado sin portada y el sistema lo informa (`coverError`), sin perder el alta

#### Scenario: Contenido adulto

- **WHEN** el candidato elegido es +18 y la preferencia de contenido adulto está desactivada
- **THEN** el candidato sólo se muestra tras confirmarlo y, al elegirlo, el manga queda marcado +18

#### Scenario: Título duplicado

- **WHEN** el usuario intenta crear un manga cuyo título ya existe en la colección (normalizado)
- **THEN** el sistema avisa de forma no bloqueante antes de crear
