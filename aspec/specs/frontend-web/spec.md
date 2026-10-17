
### Requirement: App web principal multi-perfil

The system SHALL proveer en `mangacount.client` (React 19 + Vite + CSS Modules) multi-perfil con localStorage, CRUD con modales, filtros básicos, themes claro/oscuro, estados de loading/error y responsive; en desktop el renderer corre dentro de Electron y consume los mismos DTOs vía `localAdapter.js` + IPC (adaptador con contrato tipo `Response` para no reescribir componentes), sin proxy ni hosting del backend, sin el chequeo heredado de arranque, y con las fotos de perfil servidas por el protocolo `mangacount://`.

#### Scenario: Operar colección desde la app desktop

- **WHEN** el usuario crea, edita, filtra o cambia de perfil en Electron
- **THEN** el renderer (React actual) consume los mismos DTOs vía `localAdapter.js` + IPC en vez de `fetch('/api/...')`, conservando multi-perfil, CRUD con modales, filtros, themes, loading/error y responsive, sin proxy ni hosting del backend

#### Scenario: Arranque sin el chequeo heredado

- **WHEN** la app desktop arranca
- **THEN** no existe el chequeo heredado de arranque, ni su endpoint ni su imagen asociada

### Requirement: Pantalla de Settings unificada

The system SHALL exponer en `mangacount.client` una única pantalla de Settings, separada de la vista
principal de la colección y abierta desde un acceso en el `Sidebar`, con secciones
**General** (arranque en bandeja e inicio con el sistema), **Backup** (habilitar automático,
destino, intervalo, disparadores, indicador de último OK/error, botones "Backup ahora" y
"Restaurar…"), **Importar / Exportar (TSV)** (Import TSV y Export TSV), **Bot** (toggle, token, guild ID,
allowlist y estado de conexión) y **Danger Zone** (Nuclear Option / borrado total), consumiendo los
nuevos canales IPC vía `localAdapter.js`. Tras una acción destructiva que re-siembra la base
(Nuclear Option), la pantalla SHALL disparar una recarga de perfiles y re-seleccionar uno válido.

#### Scenario: Guardar configuración de backup válida

- **WHEN** el usuario habilita el backup automático, elige un destino y activa al menos un disparador
- **THEN** la pantalla guarda la configuración vía IPC y la refleja al reabrir, mostrando el destino y el intervalo elegidos

#### Scenario: Restaurar desde Settings con confirmación

- **WHEN** el usuario elige un archivo de backup y confirma la acción destructiva
- **THEN** la pantalla invoca el restore y, al finalizar, refleja que el estado fue reemplazado

#### Scenario: Ver el estado del último backup

- **WHEN** el usuario abre Settings con un backup previo fallido
- **THEN** la pantalla muestra el indicador de fallo con fecha/hora y la app sigue operativa

#### Scenario: Sidebar sin el import de colección

- **WHEN** el usuario abre la app principal
- **THEN** el Sidebar ya no muestra el bloque "Import Collection" y el acceso a Settings queda disponible para Backup, Importar / Exportar (TSV) y Bot

#### Scenario: Nuclear Option desde Settings

- **WHEN** el usuario ejecuta la Nuclear Option (borrado total) desde Settings
- **THEN** la pantalla cierra, la app recarga los perfiles re-sembrados y vuelve a seleccionar uno válido, de modo que un import posterior no falla por un perfil inexistente

### Requirement: Ajustes del bot y arranque en el renderer

The system SHALL permitir desde la pantalla Settings ver y cambiar el toggle del bot, cargar el token
de Discord, editar la allowlist (guild/user IDs), activar o desactivar el inicio con el sistema y el
arranque en bandeja, y ver el estado de conexión del bot, consumiendo los nuevos canales IPC a través
de `localAdapter.js`.

#### Scenario: Configurar el bot desde la UI

- **WHEN** el usuario abre Settings y carga el token y activa el bot
- **THEN** el token se guarda cifrado y el bot se inicia sin reiniciar la app, reflejando el nuevo estado

#### Scenario: Ver el estado del bot

- **WHEN** el usuario abre Settings con el bot apagado, desconectado o sin token
- **THEN** la pantalla muestra el estado correspondiente y la app sigue operativa

### Requirement: Visualización de series sin total de tomos

The system SHALL mostrar, en las tres vistas de la colección (tabla, compacta y cards) y en el modal de
entrada, `owned / total` con barra de progreso y porcentaje para las series **con** total de tomos, y
`owned / ??` (sin barra ni porcentaje) para las series **sin** total de tomos. El sistema NO SHALL
renderizar un `0` suelto por usar un flag numérico como condición de render.

#### Scenario: Serie sin total de tomos

- **WHEN** una entry tiene `manga.volumes` igual a 0 (serie en publicación)
- **THEN** la UI muestra `owned / ??` y no muestra barra ni porcentaje ni un `0` suelto

#### Scenario: Progreso con total y cero tomos

- **WHEN** una entry tiene total de tomos y `quantity` 0
- **THEN** la UI muestra el porcentaje `0%` (no un `0` sin signo de porcentaje)

### Requirement: Footer con versión y aviso de actualización

The system SHALL mostrar un footer con la versión actual de la app (`MangaCount vX`). Cuando haya una
versión nueva disponible, el footer SHALL mostrarla como un enlace `vX → vY` que abre la página del
release.

#### Scenario: Sin actualización

- **WHEN** no hay versión nueva
- **THEN** el footer muestra solo la versión actual

#### Scenario: Con actualización

- **WHEN** `update:check` reporta una versión nueva
- **THEN** el footer muestra `vX → vY` como enlace que abre el release

### Requirement: Layout sin scroll horizontal

The system SHALL mostrar la colección sin scroll horizontal de página (también en pantalla completa),
escalando el contenido; la tabla SHALL scrollear dentro de su propio contenedor cuando no entre.

#### Scenario: Ventana angosta o pantalla completa

- **WHEN** la ventana es angosta o está en pantalla completa
- **THEN** no aparece scroll horizontal de página y la tabla scrollea dentro de su contenedor

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

### Requirement: Design system de la interfaz

The system SHALL definir la apariencia con una capa de **design tokens** (color —incluido un acento de
marca—, tipografía, espaciado, radios, sombras y motion) aplicada por variables CSS, con **temas claro
y oscuro** sobre los mismos tokens, y una tipografía consistente (Inter con fallback al sistema). Los
estilos de los componentes SHALL consumir los tokens en lugar de valores de color hardcodeados.

#### Scenario: Cambio de tema

- **WHEN** el usuario alterna entre tema claro y oscuro
- **THEN** la interfaz cambia usando los mismos tokens, sin colores hardcodeados

#### Scenario: Legibilidad

- **WHEN** se usa la app en cualquier tema
- **THEN** el texto y los controles cumplen contraste legible y foco visible

### Requirement: Identidad visual (logo)

The system SHALL usar un logo propio (monograma **`MC`**) en la aplicación: navegación/header, ícono de
la app, ícono de la bandeja (tray) y favicon, provisto en formato vectorial y en los tamaños/formatos
necesarios (PNG/ICO).

#### Scenario: Ícono de la aplicación

- **WHEN** la app se empaqueta y se instala
- **THEN** usa el logo nuevo como ícono de la app y en la bandeja

#### Scenario: Logo en la navegación

- **WHEN** el usuario abre la app
- **THEN** el logo aparece en la navegación lateral

### Requirement: Navegación lateral (sidebar) modernizada

The system SHALL organizar la navegación principal en una **sidebar agrupada y colapsable** con el logo,
manteniendo el acceso a la colección, recomendaciones, ajustes y estado del bot, y sin provocar scroll
horizontal de página.

#### Scenario: Colapsar y expandir

- **WHEN** el usuario colapsa o expande la sidebar
- **THEN** la navegación se adapta y el contenido ocupa el ancho disponible sin scroll horizontal

### Requirement: Animaciones de la interfaz

The system SHALL usar animaciones sutiles y consistentes (transición de tema, hover de tarjetas, cambio
de vista, apertura de modales, expandir/colapsar sidebar) con duraciones y easing uniformes, y SHALL
respetar `prefers-reduced-motion` desactivándolas cuando el usuario lo pida.

#### Scenario: Movimiento reducido

- **WHEN** el sistema operativo pide `prefers-reduced-motion`
- **THEN** la interfaz no reproduce animaciones (o las reduce al mínimo)

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

### Requirement: Blur y badge de las portadas +18

The system SHALL difuminar (**blur**) las miniaturas de portada de los mangas marcados como +18 y SHALL
superponerles un **badge `+18`**, de forma **siempre activa e independiente** de la preferencia de
búsqueda `showAdultCovers`. El indicador SHALL provenir de la **entidad manga**, no del vínculo de
portada. El blur SHALL aplicarse en los **candidatos** del modal de portada y en la **portada de la
entry** (`card`) de la colección. Los modos `table` y `compact` —que no muestran portada— quedan fuera
de alcance.

#### Scenario: Card de la colección con portada +18

- **WHEN** una entry pertenece a un manga marcado como +18 y tiene portada vinculada
- **THEN** la portada de la card se muestra difuminada con el badge `+18`

#### Scenario: Manga marcado +18 con portada local

- **WHEN** un manga está marcado como +18 y su portada se subió desde el equipo (sin indicador de AniList)
- **THEN** la portada se difumina igualmente y muestra el badge `+18`

#### Scenario: Candidato +18 difuminado con badge

- **WHEN** el modal de portada lista un candidato con contenido adulto
- **THEN** su miniatura se muestra difuminada y con el badge `+18`, con la preferencia de búsqueda encendida o apagada

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

### Requirement: Sección de intercambio TSV con nombre claro en Settings

The system SHALL nombrar la sección de import/export TSV de la pantalla Settings como **"Importar /
Exportar (TSV)"**, reemplazando la etiqueta ambigua **"Intercambio"**. El import y el export TSV SHALL
seguir operando sobre el perfil activo desde esa sección.

#### Scenario: La sección expone su propósito

- **WHEN** el usuario abre Settings
- **THEN** la sección de import/export se titula "Importar / Exportar (TSV)" (no "Intercambio") y los controles de import y export TSV quedan dentro de ella

#### Scenario: Import/export siguen operativos tras el renombre

- **WHEN** el usuario ejecuta el export TSV del perfil activo desde la sección "Importar / Exportar (TSV)"
- **THEN** el sistema genera el TSV del perfil activo y el flujo de import TSV sigue disponible sin cambios de comportamiento

### Requirement: Consistencia visual e idioma del modal Settings

The system SHALL estilizar el modal Settings con clases propias sobre los design tokens, sin reutilizar
las clases del Sidebar (`.action-button`, `.file-input-label`, `.import-section`, `.danger-button`). Los
botones del modal SHALL tener tamaño y padding consistentes y NO SHALL ocupar todo el ancho (`width:100%`)
salvo donde el diseño lo pida explícitamente. El contenido SHALL respetar un padding lateral consistente
(16px) para que las secciones no queden pegadas al borde del modal. Las etiquetas, mensajes y títulos de
sección del modal SHALL mostrarse en español, sin strings sueltos en inglés.

#### Scenario: Botones de tamaño consistente sin full-width forzado

- **WHEN** el usuario abre Settings
- **THEN** los botones del modal (Export TSV, Traer portadas faltantes, Restaurar…, Nuclear Option) usan las clases propias del modal, con tamaño y padding consistentes, y ninguno ocupa todo el ancho salvo que el diseño lo pida

#### Scenario: Padding lateral alineado

- **WHEN** el usuario abre Settings
- **THEN** el contenido del modal respeta un padding lateral consistente de 16px y las secciones no quedan pegadas al borde del modal

#### Scenario: Idioma unificado del modal

- **WHEN** el usuario abre Settings
- **THEN** las etiquetas, los mensajes y los títulos de sección se muestran en español, sin strings sueltos en inglés

### Requirement: Títulos largos en la Biblioteca del sidebar no desplazan los iconos

The system SHALL mostrar en la lista **Biblioteca** del sidebar el nombre de cada manga **completo**, envolviendo en varias líneas cuando no entre, **incluido** un título de una sola palabra sin espacios. El nombre NO SHALL desbordar su caja ni empujar los botones de acción del ítem (portada, editar, eliminar), que SHALL permanecer alineados a la derecha del ítem. La lista NO SHALL provocar scroll horizontal.

#### Scenario: Título de una sola palabra larga

- **WHEN** un manga de la Biblioteca tiene un nombre de una sola palabra que excede el ancho disponible (p. ej. "Gokushufudo")
- **THEN** el nombre envuelve dentro de su caja (sin desbordar) y los tres botones de acción quedan alineados a la derecha del ítem

#### Scenario: Título de varias palabras

- **WHEN** un manga de la Biblioteca tiene un nombre de varias palabras que excede el ancho disponible
- **THEN** el nombre envuelve por los espacios y los botones de acción quedan alineados a la derecha, sin cambios respecto del comportamiento actual

#### Scenario: Título corto sin cambios

- **WHEN** un manga de la Biblioteca tiene un nombre que entra en una línea
- **THEN** el ítem se ve igual que antes, con el nombre en una sola línea y los iconos a la derecha

#### Scenario: Sin scroll horizontal

- **WHEN** la Biblioteca contiene títulos largos de una sola palabra
- **THEN** la lista y la página no generan scroll horizontal

### Requirement: Edición de entries sin volver a pedir perfil

The system SHALL permitir editar una entry de la colección con el perfil activo ya seleccionado, sin mostrar el error `Elegí un perfil antes de guardar` ni solicitar que se elija un perfil. El `profileId` de una edición SHALL resolverse desde la propia entry (`editEntry.profileId`) y, como fallback, desde el perfil activo (`selectedProfile.id`). La creación de entries SHALL seguir exigiendo un perfil activo.

#### Scenario: Editar una entry con perfil activo

- **WHEN** el usuario abre la edición de una entry desde la colección teniendo un perfil activo y confirma el formulario
- **THEN** el modal envía la entry con el `profileId` correcto y la guarda sin mostrar el error de perfil

#### Scenario: Editar una entry con el perfil de la entry

- **WHEN** el modal de edición recibe una entry con `profileId` aunque no reciba `selectedProfile`
- **THEN** usa el `profileId` de la entry para guardar en lugar de bloquear el submit

#### Scenario: Crear una entry sin perfil activo

- **WHEN** el usuario intenta crear una entry sin un perfil activo
- **THEN** el modal muestra el error de perfil y no envía la entry

### Requirement: Edición manual del flag +18 en el alta/edición de manga

The system SHALL exponer un control (checkbox **“Contenido +18”**) en el modal de alta y edición de
manga (`AddMangaModal`) que permita marcar o desmarcar el contenido adulto de la serie. El control
SHALL precargarse con el valor del manga en edición y SHALL viajar en el payload de `manga:upsert`.

#### Scenario: Marcar un manga nuevo como +18

- **WHEN** el usuario crea un manga y activa “Contenido +18”
- **THEN** el manga se guarda marcado como +18

#### Scenario: Precarga al editar

- **WHEN** el usuario abre la edición de un manga marcado como +18
- **THEN** el checkbox aparece activado y, si lo desmarca, el manga queda sin marcar al guardar

## MODIFIED Requirements

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
