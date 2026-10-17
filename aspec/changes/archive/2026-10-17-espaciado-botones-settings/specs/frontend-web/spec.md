## ADDED Requirements

### Requirement: Espaciado del pie del modal de Settings

The system SHALL mostrar el botón **“Cerrar”** del modal de Settings con un espaciado propio respecto
de los bordes del modal, sin heredar el `.modal-actions` global sin padding. El cuerpo del modal SHALL
ocupar el alto disponible y scrollear, de modo que el pie permanezca visible. Los demás modales SHALL
conservar su espaciado actual.

#### Scenario: Botón de cierre con aire

- **WHEN** el usuario abre Settings
- **THEN** el botón “Cerrar” queda separado de los bordes inferior y derecho del modal (mismo padding que el header y el cuerpo)

#### Scenario: Contenido largo sin empujar el pie

- **WHEN** el contenido del modal supera el alto disponible
- **THEN** el cuerpo scrollea y el pie con “Cerrar” permanece visible dentro del modal

#### Scenario: Otros modales sin cambios

- **WHEN** el usuario abre el alta/edición de entry, manga o perfil
- **THEN** el espaciado de esos modales no cambia respecto del actual
