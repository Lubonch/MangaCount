## ADDED Requirements

### Requirement: Sección Diagnóstico toggleable en Settings

The system SHALL mostrar en Settings una sección **Diagnóstico** con un **toggle** (default ON) que
habilita los botones **Copiar diagnóstico** y **Abrir carpeta de logs**; con el toggle OFF, los botones
quedan ocultos/deshabilitados. La preferencia SHALL persistir en `userData`.

#### Scenario: Diagnóstico habilitado

- **WHEN** el toggle "Habilitar diagnóstico" está ON
- **THEN** se muestran los botones y "Copiar diagnóstico" copia el texto al portapapeles, confirmando "Copiado"

#### Scenario: Diagnóstico deshabilitado

- **WHEN** el toggle está OFF
- **THEN** los botones quedan ocultos/deshabilitados y el valor se persiste
