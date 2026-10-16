## ADDED Requirements

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
