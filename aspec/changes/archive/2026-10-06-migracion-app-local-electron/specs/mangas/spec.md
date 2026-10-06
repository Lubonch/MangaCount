## MODIFIED Requirements

### Requirement: CRUD de mangas

The system SHALL crear, consultar y actualizar mangas persistiendo en SQLite embebida vía canales IPC (`manga:list`, `manga:get`, `manga:upsert`), conservando el mismo modelo `Profile→Entry→Manga→Format/Publisher` y los mismos DTOs, sin `MangaController`/`MangaRepository` ni Dapper.

#### Scenario: Alta y consulta de manga vía IPC local

- **WHEN** el renderer invoca el canal IPC de mangas con un manga válido
- **THEN** el proceso main lo persiste en SQLite (mismo modelo Profile→Entry→Manga→Format/Publisher y mismos DTOs) y lo devuelve, sin `MangaController` ni Dapper
