## ADDED Requirements

### Requirement: Visualización de series sin total de tomos

The system SHALL mostrar, en las tres vistas de la colección (tabla, compacta y cards) y en el modal de
entrada, `owned / total` con barra de progreso y porcentaje para las series **con** total de tomos, y
`owned / ??` (sin barra ni porcentaje) para las series **sin** total de tomos. El sistema NO SHALL
renderizar un `0` suelto por usar un flag numérico como condición de render.

#### Scenario: Serie sin total de tomos

- **WHEN** una entry tiene `manga.volumes` igual a 0 (serie en publicación)
- **THEN** la UI muestra `owned / ??` y no muestra barra ni porcentaje ni un `0` suelto

#### Scenario: Progreso con total y cero tomos

- **WHEN** una entry tiene total de tomos y `quantity` 0
- **THEN** la UI muestra el porcentaje `0%` (no un `0` sin signo de porcentaje)
