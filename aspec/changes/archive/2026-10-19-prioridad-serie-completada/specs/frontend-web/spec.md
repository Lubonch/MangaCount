## ADDED Requirements

### Requirement: Prioridad visible solo en series incompletas

The system SHALL tratar como **sin prioridad** a toda entry cuya serie esté completa
(`manga.volumes > 0 && quantity >= volumes`), aun si el objeto de la entry trae `priority: true` por datos
viejos. En la colección, los indicadores ⚡/⭐, el badge de prioridad, el filtro **Priority Only**, el
conteo de prioridad y el orden por prioridad NO SHALL incluir series completas. En el modal de alta o
edición de entry, el control de prioridad SHALL deshabilitarse cuando la cantidad seleccionada complete
la serie, SHALL mostrarse sin marcar en ese caso y SHALL enviar `priority: false`; el modal SHALL explicar
la regla con un texto localizado.

#### Scenario: Serie completa con prioridad heredada

- **WHEN** la colección recibe una entry completa con `priority: true`
- **THEN** no muestra el indicador ni el badge de prioridad para esa entry

#### Scenario: Filtrar por prioridad

- **WHEN** el usuario elige el filtro **Priority Only**
- **THEN** el resultado incluye solo series incompletas marcadas como prioridad, nunca series completas

#### Scenario: Ordenar por prioridad

- **WHEN** el usuario ordena la colección por prioridad
- **THEN** las series completas no se tratan como prioritarias

#### Scenario: Editar una entry que completa la serie

- **WHEN** el usuario ingresa en el modal una cantidad mayor o igual al total de tomos
- **THEN** el checkbox de prioridad queda deshabilitado y el envío usa `priority: false`
