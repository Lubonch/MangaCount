## ADDED Requirements

### Requirement: Layout responsive sin espacio vacío

The system SHALL ocupar el ancho disponible de la ventana sin dejar un hueco vacío a la derecha ni
scroll horizontal, tanto en pantalla completa como en ventana angosta.

#### Scenario: Ventana ancha

- **WHEN** la ventana tiene ancho de sobra (p. ej. pantalla completa)
- **THEN** el contenido ocupa el ancho disponible y no queda espacio vacío a la derecha

#### Scenario: Ventana angosta

- **WHEN** la ventana es angosta
- **THEN** no aparece scroll horizontal de página y el contenido se adapta al ancho
