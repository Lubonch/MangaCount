# Proposal: Recomendador opcional con opencode local (servidor HTTP)

## Problem

Hoy el motor de recomendaciones (`shared/recommendations/recommendationEngine.js`) es puramente
léxico: puntúa candidatas por similitud coseno de tokens más boosts de editorial/formato/demografía.
Funciona sin red, pero no razona sobre la colección del usuario: no puede ordenar por afinidad
temática real ni explicar en lenguaje natural por qué una obra encaja. El hook de reranking remoto en
`electron/main/services/recommendations.js` (`providers`) ya existe pero no tiene ningún provider
(`providers = []`, ver decisión `recommendation-reranking-deferred`).

Se evaluó usar la API de OpenCode Zen directamente: los modelos "gratis" (`big-pickle`, los `*-free`)
**no se pueden usar sin key desde una app externa** — el gateway responde
`FreeTierError: OpenCode's free tier can only be used from within OpenCode` (verificado con
`Authorization: Bearer public` y varios `User-Agent`). La alternativa sin key es el **servidor local
de opencode** (`opencode serve`), una feature oficial y documentada que usa la cuenta/modelo que el
usuario ya tenga configurado en su opencode.

Se quiere poder usar ese opencode local como recomendador de mangas a partir de lo que el usuario ya
tiene. Si el servidor no está corriendo o falla, la app debe seguir con el motor local actual.

## Proposed change

- Añadir una sección **Recomendaciones** en Settings con: toggle `enabled`, `baseUrl` del servidor
  local (default `http://127.0.0.1:4096`), `model` opcional (`provider/model`; vacío = el default de
  opencode) y un botón **Probar conexión**.
- Implementar un provider `opencode` en `electron/main/services/` que use la API HTTP del servidor
  local: `GET /global/health`, `POST /session`, `POST /session/:id/message` (y limpieza de la sesión),
  extrayendo el texto de `parts`.
- Cablear el provider en el handler `recommendation:get` a partir de las preferencias resueltas,
  reutilizando el hook `providers` existente.
- **Fallback obligatorio**: si `enabled` es falso, el servidor no responde, hay timeout, error HTTP o
  la respuesta no es un JSON válido, la respuesta sigue siendo el resultado local (`provider: 'local'`).
- Nuevos canales IPC para leer/escribir la config y para probar la conexión, siguiendo el patrón de
  `bot:config-*`.

## Scope

**In scope**

- Config de recomendaciones en `preferences.json` (no secreta; sin key, sin secrets).
- Provider `opencode` (reranking contra el servidor local) y su cableado en `recommendation:get`.
- Sección de UI en SettingsModal + botón de prueba de conexión, i18n ES/EN, tests de unidad.
- Validación de la respuesta del modelo contra las candidatas locales (ids conocidos) y clamp de
  `limit` 1–10 (sin cambios).

**Out of scope**

- API de OpenCode Zen / cualquier endpoint remoto con API key (bloqueado sin key para apps externas).
- Autodetectarse/lanzar `opencode serve` automáticamente (el usuario lo arranca; documentarlo).
- Basic auth del servidor (`OPENCODE_SERVER_PASSWORD`): se asume `127.0.0.1` sin password.
- Otros providers (OpenRouter, GitHub Models, etc.), streaming, tool-calls o historial conversacional.
- Usar opencode para otras features (portadas, import/export, diagnóstico).

## Risks

- **Servidor no disponible**: si `opencode serve` no está corriendo, la conexión falla → fallback local
  garantizado; el botón "Probar conexión" da un mensaje claro.
- **Formato no OpenAI-compatible**: la respuesta son `parts` de opencode, no `choices`; el parseo es
  específico y cualquier cambio de formato cae a `null` (fallback local).
- **Respuestas inventadas (alucinación de títulos)**: el provider sólo acepta ítems cuyo `id`
  coincida con una candidata local; el resto se descarta; si no queda ninguno válido → fallback local.
- **Agente con acceso a archivos**: la sesión de opencode corre con las herramientas del agente en su
  cwd. Se envía un prompt de sólo-lectura y no se le pasa ningún path del proyecto; no se usa para
  nada más que devolver JSON. Cerrar la sesión al terminar evita acumular sesiones.
- **Latencia**: sólo se rerankan las candidatas ya filtradas por mercado (≤ `limit` items), con
  `timeout` acotado y `enabled: false` por defecto (comportamiento actual intacto).
- **Regresión del motor local**: los tests existentes de `recommendations.test.js` deben seguir verdes.
