# Tasks: Recomendador opcional con opencode local (servidor HTTP)

## Fase 0 — Preparación (manual del usuario)

- [ ] 0.1 Instalar opencode y dejar `opencode serve` corriendo en `http://127.0.0.1:4096` con un
      modelo configurado. Confirmar con `curl http://127.0.0.1:4096/global/health`. Sin servidor el
      change igual es implementable y testeable (todo el camino sin servidor debe quedar en local).

## Fase 1 — Config

- [ ] 1.1 Agregar el bloque `recommendations` a `DEFAULT_PREFS` en `electron/main/services/prefs.js`
      (`enabled: false`, `baseUrl: 'http://127.0.0.1:4096'`, `model: ''`) y el merge en `resolvePrefs`.
- [ ] 1.2 Tests de `prefs` (defaults del bloque + merge con valores parciales).

## Fase 2 — Provider opencode

- [ ] 2.1 Crear `electron/main/services/opencode-provider.js` con
      `createOpencodeProvider({ baseUrl, model, fetchImpl, timeoutMs })` y
      `rerank({ entries, baseItems, inferredCountry, limit })`.
- [ ] 2.2 Flujo de sesión: `POST /session` → `POST /session/:id/message` con
      `{ model?, parts: [{ type: 'text', text }] }`; extraer el texto de las `parts` tipo `text`.
- [ ] 2.3 Armar el prompt (colección del usuario + candidatas numeradas), pedir JSON estricto
      `{ picks: [{ id, reason }] }`, y parsearlo tolerando fences ```json.
- [ ] 2.4 Validar picks contra los ids de `baseItems` (descartar desconocidos/duplicados), copiar los
      campos de la candidata y truncar `reason`; devolver `null` si no hay picks válidos.
- [ ] 2.5 Timeout con `AbortController`; `throw` en no-2xx/parseo inválido para habilitar el fallback;
      `DELETE /session/:id` en `finally`.
- [ ] 2.6 Tests de `opencode-provider` con `fetchImpl` falso (baseItems vacío, válido, ids inventados,
      duplicados, no-2xx, timeout, y que se llame el DELETE de sesión).

## Fase 3 — Cableado IPC

- [ ] 3.1 Helper `buildRecommendationProviders(ctx)` + inyección en `'recommendation:get'`.
- [ ] 3.2 Canales `'recommendation:config-get'`, `'recommendation:config-set'` (valida `baseUrl`
      http/https) y `'recommendation:test'` (`GET /global/health`, devuelve `{ ok, version|error }`).
- [ ] 3.3 Tests de handlers: default local, config habilitada → `provider: 'opencode'` vía provider
      falso, validaciones de config y `recommendation:test` (OK y error).

## Fase 4 — UI y i18n

- [ ] 4.1 Wrappers en `mangacount.client/src/api/localAdapter.js` y sus entradas en el shim de fetch.
- [ ] 4.2 Sección **Recomendaciones** en `SettingsModal.jsx` (toggle, `baseUrl`, `model`, botón
      Probar conexión, mensajes de estado).
- [ ] 4.3 Claves `rec.*` y `err.*` en `shared/i18n/en.js` y `shared/i18n/es.js` (paridad).
- [ ] 4.4 Ajustar/añadir `SettingsModal.test.jsx` para la nueva sección.

## Fase 5 — Verificación

- [ ] 5.1 `npm test` (incluye tests de main con `node --test`).
- [ ] 5.2 `npm run test:renderer:coverage`.
- [ ] 5.3 `npm run lint:renderer`.
- [ ] 5.4 `npm run build:renderer`.
- [ ] 5.5 Prueba funcional: sin `opencode serve` → recomendaciones locales sin error visible; con
      servidor → `Provider: opencode` con razones del modelo; "Probar conexión" refleja ambos estados.
