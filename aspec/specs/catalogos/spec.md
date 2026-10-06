
### Requirement: Catálogos de formato y editorial

The system SHALL devolver y crear catálogos de formato y editorial con el mismo seed inicial (5 formatos, 5 editoriales) desde SQLite embebida vía canales IPC (`format:list`, `format:create`, `publisher:list`, `publisher:create`), sin `FormatController`/`PublisherController`.

#### Scenario: Listar catálogos vía IPC local con seed inicial

- **WHEN** el renderer invoca los canales IPC de formatos y editoriales
- **THEN** el proceso main devuelve los catálogos desde SQLite, poblados con el mismo seed (5 formatos, 5 editoriales), sin `FormatController`/`PublisherController`
