## ADDED Requirements

### Requirement: Reranking opcional con un servidor local de opencode

The system SHALL soportar un provider de reranking `opencode` que consuma el servidor HTTP local de
opencode (`opencode serve`, default `http://127.0.0.1:4096`) usando la cuenta y el modelo que el
usuario ya tenga configurados en opencode, sin requerir API key propia. El provider SHALL recibir la
colección del usuario y la lista local de candidatas, y SHALL devolver ítems cuyo `id` coincida con
una candidata entregada, con una razón textual; los `id` desconocidos o duplicados SHALL descartarse.
El provider NO SHALL reemplazar al motor local: sólo SHALL reordenar o recortar las candidatas que el
motor local ya consideró válidas para el mercado inferido.

#### Scenario: Reranking con el servidor local disponible

- **WHEN** la config de recomendaciones está `enabled` y `opencode serve` responde en `baseUrl`
- **THEN** `recommendation:get` ejecuta el provider `opencode` sobre las candidatas locales y la
  respuesta usa `provider: 'opencode'` con los ítems reordenados y su `reason`

#### Scenario: Picks inválidos se descartan

- **WHEN** el modelo devuelve un `id` que no corresponde a ninguna candidata local, o repite un `id`
- **THEN** ese pick se descarta y, si no queda ninguno válido, la respuesta cae al resultado local

### Requirement: Fallback local obligatorio sin servidor o ante error

The system SHALL mantener el motor local como respuesta obligatoria cuando el servidor de opencode no
esté habilitado, no responda o falle. Si la config está deshabilitada, el servidor no está corriendo,
el request supera el timeout, la respuesta HTTP no es `2xx` o el cuerpo no es un JSON parseable, el
resultado SHALL ser el del motor local con `provider: 'local'`, sin propagar el error al consumidor.

#### Scenario: Servidor no configurado

- **WHEN** la config de recomendaciones está deshabilitada
- **THEN** no se arma ningún provider remoto, no se hace request de red y la respuesta es idéntica al
  comportamiento local actual (`provider: 'local'`)

#### Scenario: Servidor caído o respuesta inválida

- **WHEN** `opencode serve` no responde, tira timeout, devuelve un error HTTP o un cuerpo no parseable
- **THEN** la respuesta sigue siendo el resultado local (`provider: 'local'`) y el error no se propaga

### Requirement: Configuración del recomendador opencode

The system SHALL exponer en Settings una configuración de recomendaciones con `enabled`, `baseUrl`
(default `http://127.0.0.1:4096`) y `model` opcional (`provider/model`; vacío usa el default de
opencode), persistida en `preferences.json` sin secretos, y SHALL ofrecer una prueba de conexión
(`GET /global/health`). Los canales IPC SHALL validar que `baseUrl` sea http/https.

#### Scenario: Guardar config válida

- **WHEN** el usuario habilita el recomendador con un `baseUrl` http/https
- **THEN** la config queda en `preferences.json` y `recommendation:config-get` la devuelve

#### Scenario: Prueba de conexión

- **WHEN** el usuario pulsa "Probar conexión"
- **THEN** `recommendation:test` consulta `GET {baseUrl}/global/health` y devuelve `{ ok: true, version }`
  o `{ ok: false, error }` sin lanzar excepción

#### Scenario: Config inválida rechazada

- **WHEN** se intenta guardar con un `baseUrl` que no es http/https
- **THEN** `recommendation:config-set` rechaza la operación con un error de validación y no persiste
