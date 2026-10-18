## ADDED Requirements

### Requirement: Edición del pending por modal y atajo al sumar tomo

The system SHALL permitir editar el campo `pending` (texto libre) mediante un **Modal de Discord
precargado** con el valor actual, y SHALL ofrecer desde la confirmación de `/tomo`, cuando la entry tiene
`pending` no vacío, un atajo que aplique el `+1` y abra ese Modal. Un envío vacío SHALL limpiar el
`pending`. El modal SHALL respetar la allowlist.

#### Scenario: Editar el pending con modal precargado

- **WHEN** el usuario ejecuta `/pending <serie>` sin un texto nuevo
- **THEN** el bot abre un Modal con el `pending` actual precargado y, al enviarlo, guarda el texto ingresado

#### Scenario: Limpiar el pending

- **WHEN** el usuario envía el Modal con el campo vacío
- **THEN** el `pending` de la serie queda vacío (`null`)

#### Scenario: Sumar un tomo y editar la nota

- **WHEN** el usuario confirma `/tomo <serie>` en una serie con `pending` no vacío y elige el atajo
- **THEN** el bot aplica el `+1` y abre el Modal con la nota actual
