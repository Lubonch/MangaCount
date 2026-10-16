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

### Requirement: Layout responsive sin espacio vacío

The system SHALL ocupar el ancho disponible de la ventana sin dejar un hueco vacío a la derecha ni
scroll horizontal, tanto en pantalla completa como en ventana angosta.

#### Scenario: Ventana ancha

- **WHEN** la ventana tiene ancho de sobra (p. ej. pantalla completa)
- **THEN** el contenido ocupa el ancho disponible y no queda espacio vacío a la derecha

#### Scenario: Ventana angosta

- **WHEN** la ventana es angosta
- **THEN** no aparece scroll horizontal de página y el contenido se adapta al ancho
