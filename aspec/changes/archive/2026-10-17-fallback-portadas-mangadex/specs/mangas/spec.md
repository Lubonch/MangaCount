## ADDED Requirements

### Requirement: Fuente secundaria de portadas (MangaDex)

The system SHALL usar **MangaDex** como fuente secundaria de portadas: cuando la búsqueda en AniList no
devuelva candidatos, SHALL consultar la API pública de MangaDex y exponer sus resultados con la misma
forma de candidato, indicando la **fuente**. El indicador de contenido adulto SHALL derivarse del
`contentRating` de MangaDex (`erotica`/`pornographic` → adulto) y SHALL respetar la preferencia de
contenido adulto. El vínculo SHALL persistir la **procedencia** del candidato elegido. El auto-match
SHALL usar MangaDex solo si AniList no produjo un match único.

#### Scenario: Fallback cuando AniList no devuelve nada

- **WHEN** el usuario busca una portada y AniList no devuelve candidatos
- **THEN** el sistema consulta MangaDex y muestra sus candidatos indicando la fuente

#### Scenario: Sin fallback cuando AniList devuelve resultados

- **WHEN** el usuario busca una portada y AniList devuelve al menos un candidato
- **THEN** el sistema no consulta MangaDex

#### Scenario: Contenido adulto según MangaDex

- **WHEN** la preferencia de contenido adulto está desactivada y se consulta MangaDex
- **THEN** el sistema no incluye resultados con `contentRating` `erotica` o `pornographic`, y con la preferencia activa los marca como adultos

#### Scenario: Vínculo con procedencia MangaDex

- **WHEN** el usuario vincula un candidato de MangaDex
- **THEN** el vínculo se persiste con la procedencia MangaDex y la portada aparece en la colección

#### Scenario: Auto-match con MangaDex

- **WHEN** el auto-match no encuentra un match único en AniList y MangaDex tiene un único match por título normalizado
- **THEN** el sistema vincula esa portada; si hay 0 o más de un match, no vincula
