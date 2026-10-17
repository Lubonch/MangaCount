## ADDED Requirements

### Requirement: Edición manual del flag +18 en el alta/edición de manga

The system SHALL exponer un control (checkbox **“Contenido +18”**) en el modal de alta y edición de
manga (`AddMangaModal`) que permita marcar o desmarcar el contenido adulto de la serie. El control
SHALL precargarse con el valor del manga en edición y SHALL viajar en el payload de `manga:upsert`.

#### Scenario: Marcar un manga nuevo como +18

- **WHEN** el usuario crea un manga y activa “Contenido +18”
- **THEN** el manga se guarda marcado como +18

#### Scenario: Precarga al editar

- **WHEN** el usuario abre la edición de un manga marcado como +18
- **THEN** el checkbox aparece activado y, si lo desmarca, el manga queda sin marcar al guardar

## MODIFIED Requirements

### Requirement: Blur y badge de las portadas +18

The system SHALL difuminar (**blur**) las miniaturas de portada de los mangas marcados como +18 y SHALL
superponerles un **badge `+18`**, de forma **siempre activa e independiente** de la preferencia de
búsqueda `showAdultCovers`. El indicador SHALL provenir de la **entidad manga**, no del vínculo de
portada. El blur SHALL aplicarse en los **candidatos** del modal de portada y en la **portada de la
entry** (`card`) de la colección. Los modos `table` y `compact` —que no muestran portada— quedan fuera
de alcance.

#### Scenario: Card de la colección con portada +18

- **WHEN** una entry pertenece a un manga marcado como +18 y tiene portada vinculada
- **THEN** la portada de la card se muestra difuminada con el badge `+18`

#### Scenario: Manga marcado +18 con portada local

- **WHEN** un manga está marcado como +18 y su portada se subió desde el equipo (sin indicador de AniList)
- **THEN** la portada se difumina igualmente y muestra el badge `+18`
