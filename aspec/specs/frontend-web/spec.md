
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
"Restaurar…"), **Intercambio** (Import TSV y Export TSV), **Bot** (toggle, token, guild ID,
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
- **THEN** el Sidebar ya no muestra el bloque "Import Collection" y el acceso a Settings queda disponible para Backup, Intercambio y Bot

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
