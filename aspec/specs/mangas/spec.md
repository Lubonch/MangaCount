
### Requirement: CRUD de mangas

The system SHALL proveer CRUD de mangas vía `MangaController` + `MangaService` + `MangaRepository` con DTOs y AutoMapper.

#### Scenario: Alta y consulta de manga

- **WHEN** el cliente envía un manga válido
- **THEN** el sistema lo persiste normalizado (Profile→Entry→Manga→Format/Publisher) y lo expone por API con Swagger
