
### Requirement: Catálogos de formato y editorial

The system SHALL exponer CRUD de formatos y editoriales vía `FormatController`/`PublisherController` con sus servicios y repositorios.

#### Scenario: Listar catálogos para alta de manga

- **WHEN** el cliente solicita formatos y editoriales
- **THEN** el sistema devuelve los catálogos persistidos en PostgreSQL para su uso en mangas y entries
