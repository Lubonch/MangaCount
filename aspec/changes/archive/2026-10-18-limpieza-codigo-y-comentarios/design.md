# Design: Limpieza de código y comentarios innecesarios

## Approach

Regla única para decidir el destino de cada comentario:

1. **Explica el *por qué*** (invariante, límite externo, workaround, seguridad, decisión de diseño no
   evidente) → **se conserva y se traduce al inglés**.
2. **Repite el *qué*** (nombre de la función/variable siguiente, paso obvio, banner de sección) →
   **se borra**.
3. **Código comentado** → **se borra** (el historial de git lo conserva).
4. **Referencia a un issue/change** en un comentario → se conserva; solo se traduce el texto que la
   rodea.

Barrido en tres pasadas por área para mantener el diff revisable:

- **Pasada 1 — `electron/`**: `main/services/*`, `main/db/*`, `main/ipc/*`, `lifecycle.js`,
  `index.js`, `preload.cjs`. Es donde están los comentarios con más carga técnica (migraciones
  versionadas en `db/client.js`, rate limit de AniList en `covers.js`, timeouts del bot en
  `discord-bot.js`, TOCTOU/tamaño en portadas locales).
- **Pasada 2 — `mangacount.client/src/`**: componentes, contexts, api, styles. Acá está la mayor
  proporción de comentarios redundantes (`// Load publishers`, `// Edit modal states`,
  `// Enhanced filtering logic`) que se borran; los comentarios de comportamiento no obvio (reveal +18,
  shim de `fetch`, identidad visual sin portada) se traducen.
- **Pasada 3 — `shared/` + `scripts/` + configs**: comentarios de sección y de cabecera de archivo.

Después del barrido de comentarios, una pasada de **código muerto** verificable: imports y variables sin
referencias (detectables con ESLint en el renderer y con búsqueda `rg` en `electron/`), helpers sin
llamadas y bloques comentados. No se toca nada con efecto observable.

## Architecture

No cambia estructura, APIs, rutas, esquema ni contratos IPC. Es un change de solo-source: el diff se
limita a líneas de comentario y a declaraciones sin uso, sin tocar la lógica que las rodea.

Convención de comentario resultante:

- Inglés, en una sola línea cuando alcanza; sin separadores decorativos (`// ----`, banners con `====`).
- Sin emojis.
- Se mantienen intactos los nombres del dominio y los términos técnicos (`profile`, `entry`, `cover`,
  `pending`, `user_version`, `ensureColumn`).

## Validation

- `npm test` (main, `node --test`) verde.
- `npm run test:coverage` verde con umbral ≥90%.
- `npm run test:renderer:coverage` verde y `npm run lint:renderer` sin errores (incluye `no-unused-vars`).
- `npm run build:renderer` compila.
- Revisión del diff: no hay cambios en líneas ejecutables salvo eliminación de declaraciones sin uso; no
  quedan comentarios en español en el código de la app (`rg` por caracteres acentuados en comentarios).
- Los comentarios conservados explican el *por qué* y están en inglés.
