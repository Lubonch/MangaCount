
### Requirement: Logging diario backend y bot

The system SHALL escribir logs diarios y rotarlos al cambiar el día solo si el archivo actual tiene
contenido; en desktop los logs van a `<userData>/logs/` con la misma política de rotación diaria. El
log del bot de Discord también va a `<userData>/logs/` con esa política, porque el bot corre dentro
del proceso main; el bot de WhatsApp se retira. En cada arranque SHALL registrar una línea de contexto
con la versión de la app, plataforma/arch y locale.

#### Scenario: Logging local de la app desktop y del bot de Discord

- **WHEN** la app desktop o el bot de Discord escriben logs
- **THEN** los guardan en `<userData>/logs/` con rotación diaria y la misma política (rotar solo si hay contenido)

#### Scenario: Contexto de la sesión en el log

- **WHEN** la app arranca
- **THEN** la primera línea del log incluye la versión de la app, plataforma/arch y locale

### Requirement: Configuración sin secretos en frontend

The system SHALL configurar la app desktop con almacenamiento local (JSON en `userData`, más
localStorage para tema y perfil activo), sin `appsettings*.json`, connection strings,
`deployment/deploy.sh` ni schema PostgreSQL. La configuración del bot de Discord (`startInTray`,
`bot.enabled`, `bot.guildId`, `bot.allowedUserIds`) SHALL vivir en `userData` y el token de Discord
SHALL cifrarse con `safeStorage`, nunca en texto plano. Esta configuración SÍ se incluye con la app
empaquetada.

#### Scenario: Configuración 100% local sin servidor

- **WHEN** la app desktop necesita configuración o preferencias, incluida la del bot
- **THEN** usa almacenamiento local en `userData` (con el token cifrado con `safeStorage`) y no existen `appsettings*.json`, connection strings, `deployment/deploy.sh` ni schema PostgreSQL

### Requirement: Captura global de errores

The system SHALL registrar en el log las excepciones no capturadas y las promesas rechazadas del
proceso main (`uncaughtException`, `unhandledRejection`), la finalización de procesos
(`render-process-gone`, `child-process-gone`) y los errores del renderer (`window.onerror`,
`unhandledrejection` y el `ErrorBoundary`) vía el canal IPC `log:error`. NO SHALL registrar secretos
(por ejemplo, el token del bot).

#### Scenario: Error no capturado en el main

- **WHEN** ocurre una excepción no capturada o una promesa rechazada en el proceso main
- **THEN** se escribe en `<userData>/logs/` con nivel de error y la app no falla en silencio

#### Scenario: Error en el renderer

- **WHEN** el renderer lanza un error no manejado o el ErrorBoundary captura uno de render
- **THEN** el error se envía por `log:error` y queda en el log con su componente/stack

### Requirement: Exportar diagnóstico

The system SHALL exponer el canal IPC `diagnostics:copy`, que arma un texto con la versión de la app,
plataforma/arch, locale y las **últimas N líneas** de `app.txt`, y lo copia al portapapeles
(`clipboard.writeText`); SHALL devolver `{ copied, preview }`. SHALL exponer también
`diagnostics:open-logs` (abre `<userData>/logs`). El texto NO SHALL incluir secretos (por ejemplo, el
token del bot).

#### Scenario: Copiar diagnóstico

- **WHEN** el usuario pide copiar el diagnóstico
- **THEN** se copia al portapapeles un texto con versión/OS y las últimas N líneas del log, y se confirma "Copiado"

#### Scenario: Abrir carpeta de logs

- **WHEN** el usuario pide abrir los logs
- **THEN** se abre `<userData>/logs` en el explorador de archivos


### Requirement: Idioma de la interfaz (ES/EN)

The system SHALL soportar **inglés y español** con **inglés por defecto**. La preferencia de idioma
SHALL persistir en `userData` (`prefs.language`) y SHALL poder elegirse desde Settings. El idioma SHALL
aplicarse a la **interfaz del renderer**, a los **mensajes del proceso main** visibles por IPC (errores,
menú del tray, diálogos nativos, avisos de update) y a las **respuestas del bot**. Los textos SHALL usar
interpolación simple y los diccionarios SHALL mantener **paridad de claves** entre ambos idiomas (sin
claves sin traducir). El diccionario en español SHALL conservar los textos actuales.

#### Scenario: Instalación nueva en inglés

- **WHEN** se abre la app en una instalación nueva sin preferencia de idioma
- **THEN** la interfaz, los mensajes del main y las respuestas del bot se muestran en inglés

#### Scenario: Cambio de idioma persistente

- **WHEN** el usuario elige “Español” en Settings
- **THEN** la interfaz y los mensajes del main pasan a español sin recargar y la preferencia queda en `preferences.json` (y sobrevive a un reinicio)

#### Scenario: Mensajes del proceso main y del bot en el idioma elegido

- **WHEN** el idioma es español y una operación del main devuelve un error visible, o el bot responde un comando
- **THEN** el mensaje y la respuesta se muestran en español

#### Scenario: Paridad de claves entre idiomas

- **WHEN** se comparan los diccionarios ES y EN
- **THEN** no hay claves presentes en un idioma y ausentes en el otro
