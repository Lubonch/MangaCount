## ADDED Requirements

### Requirement: Footer con versión y aviso de actualización

The system SHALL mostrar un footer con la versión actual de la app (`MangaCount vX`). Cuando haya una
versión nueva disponible, el footer SHALL mostrarla como un enlace `vX → vY` que abre la página del
release.

#### Scenario: Sin actualización

- **WHEN** no hay versión nueva
- **THEN** el footer muestra solo la versión actual

#### Scenario: Con actualización

- **WHEN** `update:check` reporta una versión nueva
- **THEN** el footer muestra `vX → vY` como enlace que abre el release

### Requirement: Layout sin scroll horizontal

The system SHALL mostrar la colección sin scroll horizontal de página (también en pantalla completa),
escalando el contenido; la tabla SHALL scrollear dentro de su propio contenedor cuando no entre.

#### Scenario: Ventana angosta o pantalla completa

- **WHEN** la ventana es angosta o está en pantalla completa
- **THEN** no aparece scroll horizontal de página y la tabla scrollea dentro de su contenedor
