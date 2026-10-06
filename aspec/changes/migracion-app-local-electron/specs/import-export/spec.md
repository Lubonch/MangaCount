## MODIFIED Requirements

### Requirement: Importación y exportación TSV

The system SHALL importar y exportar la colección en TSV con columnas `Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial`; en desktop la lógica porteada de `EntryService` corre en el proceso main y se expone por el canal IPC `entry:import` (y `entry:export`, nuevo), sin `ImportController`. La columna `Completa` se parsea pero no se persiste (el estado se deriva de `quantity`/`volumes`), igual que en el backend original. El export no tiene UI en este change.

#### Scenario: Importar colección desde TSV vía IPC local

- **WHEN** el usuario importa un TSV válido con las 8 columnas (`Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial`) desde la app desktop
- **THEN** el proceso main (lógica porteada de `EntryService`) crea o actualiza mangas y entries en SQLite y permite exportar el mismo formato de vuelta, sin `ImportController`
