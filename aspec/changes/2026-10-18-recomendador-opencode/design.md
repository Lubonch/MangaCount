# Design: Recomendador opcional con opencode local (servidor HTTP)

## Approach

Reutilizar el punto de extensión que ya existe en `getRecommendations`
(`electron/main/services/recommendations.js`): un array de `providers` donde cada uno expone
`rerank({ entries, baseItems, inferredCountry, limit }) => items[] | null`. El change agrega **un**
provider concreto (`opencode`) que habla con el servidor local de opencode, y lo inyecta desde el
handler según las preferencias, sin tocar el motor local ni `shared/recommendations`.

Regla de oro: **el motor local siempre corre primero**; el provider remoto sólo puede reordenar o
recortar candidatas que el motor local ya consideró válidas para el mercado del usuario. Si el
provider devuelve `null`, un array vacío, un no-array, o tira una excepción, el flujo cae al resultado
local (`provider: 'local'`), igual que el `catch` actual.

Config: por defecto `enabled: false`. Con `enabled: false` el comportamiento es idéntico al actual
(el handler no arma providers). No hay API key ni secretos.

## Architecture

### Config no secreta — `electron/main/services/prefs.js`

Nuevo bloque en `DEFAULT_PREFS`:

```js
recommendations: {
  enabled: false,
  baseUrl: 'http://127.0.0.1:4096',
  model: '', // opcional, formato "provider/model"; vacío = default de opencode
},
```

`resolvePrefs` agrega el merge por bloque (`recommendations: { ...DEFAULT, ...(prefs.recommendations ?? {}) }`).

No se usa `secrets.js`: no hay credenciales que guardar (el servidor local, por defecto, no pide auth).

### Provider — `electron/main/services/opencode-provider.js` (nuevo)

```js
export function createOpencodeProvider({ baseUrl, model, fetchImpl = fetch, timeoutMs = 20000 }) {
  return {
    name: 'opencode',
    async rerank({ entries, baseItems, inferredCountry, limit }) { ... },
  };
}
```

`rerank` (usando `AbortController` + `timeoutMs` en cada request):

1. Si `baseItems` está vacío → `return null` (fallback local).
2. Arma el prompt: colección del usuario (títulos + editoriales, sin datos personales) y la lista
   numerada de candidatas (`id`, `title`, `publisher`, `format`, `demographic`, `genres`, `themes`),
   pidiendo **JSON estricto**: `{ "picks": [{ "id": <id local>, "reason": "<texto>" }] }`, como máximo
   `limit`, sólo de la lista dada.
3. `POST {baseUrl}/session` → `{ id }`. Si falla (servidor caído) → `throw` (el handler cae a local).
4. `POST {baseUrl}/session/{id}/message` con
   `{ model?, parts: [{ type: 'text', text: <prompt> }] }`; `model` se omite si no está configurado
   (opencode usa su default) y, si viene como `"provider/model"`, se envía como
   `{ providerID, modelID }`.
5. Extrae el texto concatenando las `parts` de tipo `text` de la respuesta.
6. `DELETE {baseUrl}/session/{id}` en un `finally` (higiene; error ignorado).
7. Parsea el JSON (tolera fences ```json). **Valida cada `pick.id` contra el set de ids de
   `baseItems`**; descarta ids desconocidos y duplicados. Mapea a objetos item (copiando los campos de
   la candidata + `reason` del modelo, truncado).
8. Si no queda ningún pick válido → `return null`.

Errores HTTP/no-`2xx`, timeouts y JSON no parseable → `throw` o `null` según el caso, siempre
habilitando el fallback local. El provider no conoce la DB: sólo recibe datos ya resueltos, así que es
trivial de testear con un `fetchImpl` falso.

### Cableado — `electron/main/ipc/handlers.js`

- Helper `buildRecommendationProviders(ctx)` que lee `loadResolvedPrefs(ctx.dataDir).recommendations`;
  si `enabled` es falso → `[]`; si no → `[createOpencodeProvider({ baseUrl, model })]`.
- `'recommendation:get'` pasa `{ providers: buildRecommendationProviders(ctx) }` a
  `getRecommendations(db, profileId, limit, { providers })`.
- Nuevos canales (patrón `bot:*`):
  - `'recommendation:config-get'` → `{ ...recommendations }`.
  - `'recommendation:config-set'` → valida `baseUrl` (http/https) y persiste en prefs; `model`, si
    viene, se normaliza a string.
  - `'recommendation:test'` → `GET {baseUrl}/global/health`; devuelve `{ ok: true, version }` o
    `{ ok: false, error }` (no tira, para poder mostrarlo en la UI).

### UI — `mangacount.client/src/components/SettingsModal.jsx`

Nueva sección **Recomendaciones**: toggle "Usar opencode local", input `baseUrl`, input `model`
(opcional), botón **Probar conexión** con mensaje de estado, siguiendo el patrón de la sección Bot.
Wrappers en `mangacount.client/src/api/localAdapter.js`:

- `recommendationConfigGet()`, `recommendationConfigSet(config)`, `recommendationTest()`,
- y las entradas correspondientes en el shim de fetch.

El `RecommendationModal` ya muestra `provider`, así que cuando el reranking corre se verá
`Provider: opencode` sin cambios adicionales.

### i18n — `shared/i18n/en.js` y `es.js`

Nuevas claves `rec.*` (config) y `err.*` (validaciones). El test `i18n.test.js` exige paridad de
claves entre idiomas, así que ambas tablas se actualizan juntas.

## Validation

- **Provider unit tests** (`opencode-provider.test.js`, `node --test`) con `fetchImpl` falso:
  - `baseItems` vacío → `null`;
  - respuesta válida (parts con JSON) → reordena y conserva campos de la candidata + `reason`;
  - ids inventados / duplicados → filtrados; si todos inválidos → `null`;
  - `POST /session` con error HTTP y timeout → `throw` (el handler cae a local);
  - verifica que se llama `DELETE /session/{id}` al terminar.
- **Handler tests** (`recommendations.test.js` / `handlers.test.js`):
  - con `recommendations.enabled=false` (default) → mismo resultado que hoy, `provider: 'local'`;
  - con config habilitada y provider que devuelve picks → `provider: 'opencode'`;
  - `recommendation:config-set` valida `baseUrl`; `recommendation:test` con health OK y con error.
- **Regresión**: los tests existentes de recomendaciones siguen verdes.
- **Verificación manual**: `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer`,
  `npm run build:renderer` (comandos del `AGENTS.md`). Prueba funcional: con `opencode serve`
  corriendo + habilitado → `Provider: opencode` con razones del modelo; sin servidor → recomendaciones
  locales sin error visible; "Probar conexión" refleja el estado.
