
### Requirement: Importación y exportación TSV

The system SHALL importar y exportar la colección en TSV con columnas `Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial`; en desktop la lógica porteada de `EntryService` corre en el proceso main y se expone por el canal IPC `entry:import` (y `entry:export`), sin `ImportController`. La columna `Completa` se parsea pero no se persiste (el estado se deriva de `quantity`/`volumes`), igual que en el backend original. El import y el export TSV exponen UI en la sección **Importar / Exportar (TSV)** de la pantalla de Settings (el import deja de vivir en el `Sidebar`); el formato es solo TSV (sin CSV).

#### Scenario: Importar colección desde TSV vía IPC local

- **WHEN** el usuario importa un TSV válido con las 8 columnas (`Titulo, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial`) desde la sección Importar / Exportar (TSV) de Settings
- **THEN** el proceso main (lógica porteada de `EntryService`) crea o actualiza mangas y entries en SQLite, sin `ImportController`

#### Scenario: Exportar la colección desde Settings

- **WHEN** el usuario pide Export TSV para el perfil activo desde Settings
- **THEN** el sistema genera el TSV de 8 columnas vía `entry:export` reutilizando la lógica existente, sin duplicar el formato
