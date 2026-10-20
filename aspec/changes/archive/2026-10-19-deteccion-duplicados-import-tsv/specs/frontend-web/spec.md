## ADDED Requirements

### Requirement: Pantalla de revisión de duplicados en la importación TSV

The system SHALL mostrar, al final de la selección de un archivo TSV en Settings, una pantalla de
revisión cuando la previsualización detecte posibles duplicados. La pantalla SHALL mostrar cada par como
un card con la fila del archivo (título, comprados/total, pendiente, formato y editorial) y el candidato
(manga existente con sus tomos, formato, editorial y la entry del perfil si existe, o la fila anterior del
archivo). Cada card SHALL ofrecer las opciones mutuamente excluyentes **“Son lo mismo”** y
**“No son lo mismo”**, SHALL indicar el progreso de resolución y NO SHALL permitir confirmar la
importación hasta que todos los candidatos estén resueltos. Cancelar SHALL cerrar la revisión sin
escribir. Al confirmar, la pantalla SHALL aplicar el import y mostrar un resumen con la cantidad de
series importadas, fusionadas y creadas. Todos los textos SHALL estar localizados en ES/EN con paridad.

#### Scenario: Abrir la revisión después de elegir el archivo

- **WHEN** el usuario elige un TSV y la previsualización encuentra posibles duplicados
- **THEN** Settings muestra la pantalla de revisión con los pares detectados y no aplica el import todavía

#### Scenario: Confirmar deshabilitado hasta resolver todo

- **WHEN** el usuario resolvió solo algunos de los candidatos
- **THEN** el botón de importar permanece deshabilitado y se muestra cuántos faltan

#### Scenario: Confirmar la importación

- **WHEN** el usuario resolvió todos los candidatos y confirma
- **THEN** el sistema aplica el import con las decisiones y muestra el resumen de importadas, fusionadas y creadas

#### Scenario: Cancelar la revisión

- **WHEN** el usuario cancela la pantalla de revisión
- **THEN** la pantalla se cierra, se informa que no se guardó nada y la colección no cambia

#### Scenario: Import sin duplicados

- **WHEN** el usuario elige un TSV y la previsualización no encuentra candidatos
- **THEN** el sistema importa directamente y muestra el resumen de éxito
