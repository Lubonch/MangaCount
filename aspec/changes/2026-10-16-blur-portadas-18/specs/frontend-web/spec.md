## ADDED Requirements

### Requirement: Blur y badge de las portadas +18

The system SHALL difuminar (**blur**) las miniaturas de portada marcadas como +18 y SHALL superponerles
un **badge `+18`**, de forma **siempre activa e independiente** de la preferencia de búsqueda
`showAdultCovers`. El blur SHALL aplicarse en los **candidatos** del modal de portada y en la **portada
de la entry** (`card`) de la colección. Los modos `table` y `compact` —que no muestran portada— quedan
fuera de alcance.

#### Scenario: Candidato +18 difuminado con badge

- **WHEN** el modal de portada lista un candidato con contenido adulto
- **THEN** su miniatura se muestra difuminada y con el badge `+18`, con la preferencia de búsqueda encendida o apagada

#### Scenario: Card de la colección con portada +18

- **WHEN** una entry tiene una portada vinculada cuyo indicador de contenido adulto es verdadero
- **THEN** la portada de la card se muestra difuminada con el badge `+18`

#### Scenario: Portada no adulta sin blur ni badge

- **WHEN** una entry o un candidato no es de contenido adulto
- **THEN** su portada se muestra nítida y sin badge

### Requirement: Revelado de las portadas +18

The system SHALL permitir revelar (quitar el blur) una portada +18 según la preferencia
`showAdultCovers`: con la preferencia **encendida**, el revelado SHALL ocurrir al **pasar el cursor**
(hover, momentáneo); con la preferencia **apagada**, el revelado SHALL requerir un **click** y SHALL
mantenerse hasta que el usuario lo deshaga. The system SHALL obtener la preferencia desde el proceso main
y SHALL refrescarla cuando cambia en Settings, sin recargar la aplicación.

#### Scenario: Revelado por hover con la preferencia encendida

- **WHEN** la preferencia de contenido adulto está encendida y el usuario pasa el cursor sobre una portada +18 difuminada
- **THEN** la portada se revela mientras el cursor permanece encima y vuelve a difuminarse al salir

#### Scenario: Revelado por click con la preferencia apagada

- **WHEN** la preferencia de contenido adulto está apagada y el usuario hace click sobre una portada +18 difuminada
- **THEN** la portada se revela y permanece revelada

#### Scenario: Refresco de la preferencia tras Settings

- **WHEN** el usuario cambia la preferencia de contenido adulto en Settings y cierra la pantalla
- **THEN** el renderer relee la preferencia y aplica el modo de revelado correspondiente sin recargar la aplicación

## MODIFIED Requirements

### Requirement: Preferencia de contenido adulto en Settings

The system SHALL exponer en la sección de portadas de Settings un control (toggle) para habilitar los
resultados +18 en la búsqueda de portadas de AniList, con **default desactivado**, y SHALL persistir la
preferencia en `userData` a través de los canales `app:config-get` / `app:config-set`. La misma
preferencia SHALL gobernar el **modo de revelado** de las portadas +18 en la interfaz: con la preferencia
encendida el revelado SHALL ser por **hover** (momentáneo) y con la preferencia apagada SHALL ser por
**click** (revela y queda).

#### Scenario: Toggle por defecto desactivado

- **WHEN** el usuario abre Settings y no cambió la preferencia
- **THEN** el control de contenido +18 aparece desactivado y los resultados +18 quedan ocultos en las búsquedas

#### Scenario: Cambio persistente del toggle

- **WHEN** el usuario habilita el control de contenido +18
- **THEN** la preferencia se guarda en `userData` y las siguientes búsquedas incluyen los resultados +18

#### Scenario: La preferencia define el modo de revelado

- **WHEN** el usuario cambia el control de contenido +18 y cierra Settings
- **THEN** las portadas +18 pasan a revelarse por hover (preferencia encendida) o por click (preferencia apagada)
