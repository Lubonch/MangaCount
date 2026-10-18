## ADDED Requirements

### Requirement: Autocomplete del parámetro de serie

The system SHALL ofrecer **autocomplete** en el parámetro de serie de los comandos del bot que lo usan,
respondiendo a las interacciones de autocomplete con hasta 25 títulos de la biblioteca del perfil activo
que coincidan con el texto tipeado, sin bloquear ni fallar cuando no haya perfil o coincidencias.

#### Scenario: Sugerencias al tipear

- **WHEN** el usuario empieza a tipear el título de una serie en un comando que lo acepta
- **THEN** el bot ofrece hasta 25 títulos de su biblioteca que coinciden, priorizando los que empiezan con el texto

#### Scenario: Sin coincidencias o sin perfil

- **WHEN** el texto no coincide con ninguna serie o no hay perfil activo
- **THEN** el bot responde con una lista vacía de sugerencias y no muestra error
