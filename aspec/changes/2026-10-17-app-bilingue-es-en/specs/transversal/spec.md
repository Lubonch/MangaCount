## ADDED Requirements

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
