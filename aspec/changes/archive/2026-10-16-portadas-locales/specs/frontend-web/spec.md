## ADDED Requirements

### Requirement: Elección de portada local desde el modal

The system SHALL exponer en el modal de portada (`LinkCoverModal`) un botón **“Buscar en mi PC…”** que
abre el diálogo nativo de archivos con filtro de imágenes (`png`, `jpg`, `jpeg`, `webp`, `gif`) y, al
elegir un archivo, vincula esa imagen como portada del manga vía el canal `cover:local`. El modal SHALL
reflejar la **procedencia** de la portada actual (**“Portada local”** vs AniList) y SHALL mostrar un
**thumbnail** de la portada vigente cuando exista.

#### Scenario: Elegir una imagen local desde el modal

- **WHEN** el usuario pulsa “Buscar en mi PC…”, elige una imagen válida y confirma
- **THEN** el modal invoca el vínculo local, notifica el cambio al llamador y la colección muestra la nueva portada

#### Scenario: Cancelar el diálogo

- **WHEN** el usuario abre el diálogo de archivos y lo cancela
- **THEN** el modal no intenta vincular ninguna imagen y no muestra error

#### Scenario: Archivo local inválido

- **WHEN** el archivo elegido no es una imagen soportada o supera el tamaño máximo
- **THEN** el modal muestra un mensaje de error y la portada vigente no cambia

#### Scenario: Procedencia y thumbnail

- **WHEN** el manga ya tiene una portada (local o de AniList) y el usuario abre el modal
- **THEN** el modal muestra la procedencia correspondiente (“Portada local” o AniList) y un thumbnail de la portada actual
