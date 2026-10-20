
### Requirement: Entradas de colección por perfil

The system SHALL gestionar entradas (comprados/total/pendiente/completa/prioridad) por perfil persistiendo en SQLite embebida vía canales IPC (`entry:list`, `entry:get-by-id`, `entry:upsert`, `entry:used-formats`, `entry:used-publishers`), conservando la constraint UNIQUE `ProfileId+MangaId`, sin `EntryController`/`EntryRepository` ni ORM. Los canales de filtros devuelven `{id,name,count}[]`, igual que el controller original.

#### Scenario: Actualizar progreso de un entry vía IPC local

- **WHEN** el renderer invoca el canal IPC de entries actualizando `Comprados`
- **THEN** el proceso main persiste el cambio asociado al perfil en SQLite y lo refleja en las consultas, conservando la constraint UNIQUE `ProfileId+MangaId`

#### Scenario: Filtros de formato y editorial con conteo

- **WHEN** el renderer pide los formatos y editoriales usados por un perfil
- **THEN** el proceso main devuelve arreglos de `{id,name,count}` ordenados por nombre, consumibles por los `<select>` de `CollectionView`

### Requirement: Prioridad solo en series incompletas

The system SHALL considerar una entry **completa** cuando `manga.volumes > 0` y
`entry.quantity >= manga.volumes`, y SHALL garantizar que una serie completa **no** esté marcada como
prioridad. La garantía SHALL aplicarse en la capa de datos, no solo en la interfaz: al leer entries el
sistema SHALL exponer `priority: false` para series completas; al crear o actualizar una entry que queda
completa SHALL persistir `IsPriority = 0`; y al cambiar el `TotalVolumes` de un manga SHALL limpiar la
prioridad de las entries que quedaron completas. Una serie sin total conocido (`volumes === 0`) SHALL
seguir pudiendo marcarse como prioridad. El sistema SHALL limpiar también las prioridades ya persistidas
de series completas mediante una migración de esquema idempotente. La prioridad limpiada NO SHALL
restaurarse automáticamente si la serie vuelve a quedar incompleta.

#### Scenario: Completar una serie que era prioridad

- **WHEN** una entry con prioridad activa se actualiza a una cantidad mayor o igual al total de tomos
- **THEN** la entry queda completa y el sistema persiste y devuelve `priority: false`

#### Scenario: Cambiar el total de tomos de un manga

- **WHEN** se actualiza el `TotalVolumes` de un manga y una entry con prioridad queda completa
- **THEN** esa entry deja de estar marcada como prioridad, mientras las entries incompletas conservan su prioridad

#### Scenario: Serie sin total conocido

- **WHEN** una entry pertenece a un manga con `TotalVolumes = 0`
- **THEN** la entry se considera incompleta y conserva la prioridad que tenga marcada

#### Scenario: Datos existentes de una serie completa

- **WHEN** la aplicación abre una base con una entry completa que tenía `IsPriority` activo
- **THEN** la migración limpia ese flag y la entry se lee y exporta con prioridad falsa

#### Scenario: La serie vuelve a quedar incompleta

- **WHEN** una serie completada sin prioridad vuelve a quedar incompleta por un cambio de cantidad o de total
- **THEN** el sistema NO la marca como prioridad automáticamente; el usuario puede volver a marcarla
