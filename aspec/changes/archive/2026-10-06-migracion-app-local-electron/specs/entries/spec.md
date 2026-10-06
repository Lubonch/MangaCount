## MODIFIED Requirements

### Requirement: Entradas de colección por perfil

The system SHALL gestionar entradas (comprados/total/pendiente/completa/prioridad) por perfil persistiendo en SQLite embebida vía canales IPC (`entry:list`, `entry:get-by-id`, `entry:upsert`, `entry:used-formats`, `entry:used-publishers`), conservando la constraint UNIQUE `ProfileId+MangaId`, sin `EntryController`/`EntryRepository` ni Dapper. Los canales de filtros devuelven `{id,name,count}[]`, igual que el controller original.

#### Scenario: Actualizar progreso de un entry vía IPC local

- **WHEN** el renderer invoca el canal IPC de entries actualizando `Comprados`
- **THEN** el proceso main persiste el cambio asociado al perfil en SQLite y lo refleja en las consultas, conservando la constraint UNIQUE `ProfileId+MangaId`

#### Scenario: Filtros de formato y editorial con conteo

- **WHEN** el renderer pide los formatos y editoriales usados por un perfil
- **THEN** el proceso main devuelve arreglos de `{id,name,count}` ordenados por nombre, consumibles por los `<select>` de `CollectionView`
