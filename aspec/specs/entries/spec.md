
### Requirement: Entradas de colección por perfil

The system SHALL gestionar entradas (comprados/total/pendiente/completa/prioridad) por perfil vía `EntryController` + `EntryService` + `EntryRepository`.

#### Scenario: Actualizar progreso de un entry

- **WHEN** el cliente actualiza `Comprados` de un entry existente
- **THEN** el sistema persiste el cambio asociado al perfil y lo refleja en las consultas de colección
