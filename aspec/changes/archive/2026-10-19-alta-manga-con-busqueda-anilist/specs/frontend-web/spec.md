## ADDED Requirements

### Requirement: Búsqueda de títulos en el modal de alta de manga

The system SHALL ofrecer en el renderer, dentro del modal de alta de manga y **sólo en modo creación**,
un buscador de títulos que consuma el canal `cover:search` a través de `localAdapter.js`, muestre los
candidatos con portada, título, fuente y metadatos, y permita seleccionar uno. Al seleccionarlo el
modal SHALL prefijar el nombre (editable), los volúmenes y el indicador +18 desde el candidato, y al
confirmar SHALL crear el manga y su portada con un único llamado a `manga:create-from-candidate`. Sin
candidato seleccionado, el modal SHALL conservar el alta manual por `manga:upsert`. El modal de edición
NO SHALL mostrar el buscador. Todas las cadenas nuevas SHALL existir en ES y EN con paridad de claves.
El modal SHALL mostrar estados de búsqueda (buscando, sin resultados, error) y SHALL avisar, de forma
no bloqueante, cuando el título ya existe en la colección.

#### Scenario: Buscar y elegir un candidato en el modal

- **WHEN** el usuario busca un título en el modal de alta y elige un candidato
- **THEN** el modal prefija nombre, volúmenes y +18 del candidato y muestra la portada elegida

#### Scenario: Confirmar el alta desde un candidato

- **WHEN** el usuario confirma el alta con un candidato seleccionado
- **THEN** el renderer invoca `manga:create-from-candidate` una sola vez con el candidato y los datos
  del formulario, y refresca la colección

#### Scenario: Alta manual sin candidato

- **WHEN** el usuario no selecciona ningún candidato
- **THEN** el modal crea el manga por `manga:upsert` como hoy, sin cambios de comportamiento

#### Scenario: Estados de búsqueda

- **WHEN** la búsqueda no devuelve candidatos o falla por red
- **THEN** el modal muestra el estado correspondiente (sin resultados / error) con su texto i18n y el
  alta manual sigue disponible

#### Scenario: Aviso de duplicado

- **WHEN** el nombre del formulario coincide con un manga existente de la colección
- **THEN** el modal muestra un aviso no bloqueante antes de crear

#### Scenario: Sin buscador en edición

- **WHEN** el modal se abre para editar un manga existente
- **THEN** el buscador de AniList no se muestra y el formulario se comporta como hoy
