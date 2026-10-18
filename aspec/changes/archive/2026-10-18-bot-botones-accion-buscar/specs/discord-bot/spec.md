## ADDED Requirements

### Requirement: Botones de acción rápida en `/buscar`

The system SHALL mostrar botones de acción rápida en el resultado de `/buscar` cuando el título resuelve
a una **única** entry y el usuario está autorizado: `[+1 Tomo]`, `[⭐ Prioridad]` y `[📝 Editar Pending]`.
Cada botón SHALL aplicar la acción correspondiente y actualizar el mensaje; con 0 o múltiples
coincidencias NO SHALL mostrar botones.

#### Scenario: Acciones rápidas con coincidencia única

- **WHEN** `/buscar` resuelve a una única serie y el usuario está en la allowlist
- **THEN** el bot muestra los botones `[+1 Tomo]`, `[⭐ Prioridad]` y `[📝 Editar Pending]`

#### Scenario: Sumar un tomo desde el resultado

- **WHEN** el usuario pulsa `[+1 Tomo]` y confirma
- **THEN** el bot incrementa la cantidad y el mensaje queda actualizado

#### Scenario: Alternar prioridad

- **WHEN** el usuario pulsa `[⭐ Prioridad]`
- **THEN** el bot alterna la prioridad de la serie y actualiza el mensaje

#### Scenario: Sin coincidencia única

- **WHEN** `/buscar` no encuentra la serie o encuentra varias
- **THEN** el bot responde con el texto de desambiguación y no muestra botones de acción
