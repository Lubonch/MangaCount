## ADDED Requirements

### Requirement: Prioridad no aplicable a series completas en el bot

The bot SHALL tratar la prioridad como no aplicable cuando la serie esté completa
(`manga.volumes > 0 && quantity >= volumes`). `/buscar` NO SHALL prefijar ⭐ a una serie completa.
`/prioridad` SHALL responder que la serie está completa y no SHALL proponer ni ejecutar una escritura.
El botón `[⭐ Prioridad]` de `/buscar` SHALL aplicar la misma regla: SHALL informar que no aplica y NO
SHALL modificar la entry. La respuesta SHALL estar localizada en ES/EN con paridad.

#### Scenario: Buscar una serie completa que tenía prioridad

- **WHEN** el usuario ejecuta `/buscar` y la serie está completa
- **THEN** el resultado no muestra ⭐ de prioridad

#### Scenario: Intentar priorizar una serie completa por comando

- **WHEN** el usuario ejecuta `/prioridad` sobre una serie completa
- **THEN** el bot responde que la prioridad no aplica y no arma una confirmación de escritura

#### Scenario: Intentar priorizar una serie completa desde el botón

- **WHEN** el usuario pulsa `[⭐ Prioridad]` sobre una serie completa
- **THEN** el bot responde que no aplica y la entry queda sin cambios
