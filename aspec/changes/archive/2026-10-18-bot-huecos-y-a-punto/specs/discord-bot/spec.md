## ADDED Requirements

### Requirement: Filtros rápidos de pendientes

The system SHALL exponer los comandos de consulta `/huecos` (series con `pending` no vacío, mostrando la
nota) y `/a-punto` (series con total conocido a las que les faltan 1 o 2 tomos), paginados como los
listados largos y disponibles para usuarios autorizados.

#### Scenario: Series con huecos

- **WHEN** el usuario ejecuta `/huecos`
- **THEN** el bot lista solo las series cuyo `pending` no está vacío, mostrando la nota de cada una

#### Scenario: Series a punto de completarse

- **WHEN** el usuario ejecuta `/a-punto`
- **THEN** el bot lista solo las series con `total > 0`, `cantidad < total` y faltante de 1 o 2 tomos

#### Scenario: Lista larga

- **WHEN** el resultado de `/huecos` o `/a-punto` supera el tamaño de página
- **THEN** el bot lo pagina (o lo reparte en varios mensajes) sin truncarlo
