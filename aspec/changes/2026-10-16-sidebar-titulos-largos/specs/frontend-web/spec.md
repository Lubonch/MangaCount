## ADDED Requirements

### Requirement: Títulos largos en la Biblioteca del sidebar no desplazan los iconos

The system SHALL mostrar en la lista **Biblioteca** del sidebar el nombre de cada manga **completo**, envolviendo en varias líneas cuando no entre, **incluido** un título de una sola palabra sin espacios. El nombre NO SHALL desbordar su caja ni empujar los botones de acción del ítem (portada, editar, eliminar), que SHALL permanecer alineados a la derecha del ítem. La lista NO SHALL provocar scroll horizontal.

#### Scenario: Título de una sola palabra larga

- **WHEN** un manga de la Biblioteca tiene un nombre de una sola palabra que excede el ancho disponible (p. ej. "Gokushufudo")
- **THEN** el nombre envuelve dentro de su caja (sin desbordar) y los tres botones de acción quedan alineados a la derecha del ítem

#### Scenario: Título de varias palabras

- **WHEN** un manga de la Biblioteca tiene un nombre de varias palabras que excede el ancho disponible
- **THEN** el nombre envuelve por los espacios y los botones de acción quedan alineados a la derecha, sin cambios respecto del comportamiento actual

#### Scenario: Título corto sin cambios

- **WHEN** un manga de la Biblioteca tiene un nombre que entra en una línea
- **THEN** el ítem se ve igual que antes, con el nombre en una sola línea y los iconos a la derecha

#### Scenario: Sin scroll horizontal

- **WHEN** la Biblioteca contiene títulos largos de una sola palabra
- **THEN** la lista y la página no generan scroll horizontal
