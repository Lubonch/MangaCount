
### Requirement: Importación y exportación TSV

The system SHALL importar y exportar la colección en TSV con columnas `Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial` vía `ImportController`.

#### Scenario: Importar colección desde TSV

- **WHEN** el cliente sube un TSV válido con las columnas definidas
- **THEN** el sistema crea o actualiza mangas y entries y permite exportar el mismo formato de vuelta
