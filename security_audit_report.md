# Security Audit Report — MangaCount

**Fecha:** 2026-10-16 · **Alcance:** app de escritorio Electron (main + renderer) a la altura de la 2.0.8
**Método:** ESLint (`0 errors`) + revisión manual dirigida (SQL, XSS, secretos, command injection, path traversal, protocolo custom, red saliente) + `npm audit`.

## Resumen

Sin hallazgos **Critical/High**. La app es local-first, no carga contenido remoto en el renderer
(`loadFile`), usa SQL parametrizado y no evalúa input. Se listan oportunidades de endurecimiento (Low).

## Verificaciones realizadas

| Categoría | Resultado | Evidencia |
|---|---|---|
| **SQL injection** | OK | `db.prepare(...)` con valores por `?`. Las interpolaciones son constantes (`SELECT`/`COLS`/`JOIN`) o el nombre de tabla fijo del closure (`Format`/`Publisher`), nunca input del usuario. |
| **XSS** | OK | Renderer React (escapa por defecto); sin `dangerouslySetInnerHTML` ni `eval`/`new Function`. |
| **Secretos hardcodeados** | OK | Sin tokens/keys en el código. El token del bot se guarda cifrado (`safeStorage`) en `userData`. |
| **Command injection** | OK | Sin `exec`/`spawn` con input del usuario. El único `spawnSync` usa binarios fijos (`update-desktop-database`, `gtk-update-icon-cache`) y args fijos. |
| **Path traversal** | OK | `mangacount://` (hosts `profiles`/`covers`) y las portadas usan `path.basename` + nombre generado (`<id>.<ext>`). |
| **Zip-slip (restore)** | OK | `backup.js:183-186`: descarta segmentos `..`/vacíos y valida que el destino quede dentro de `profiles/` (`target.startsWith(profilesPath + sep)`). |
| **SSRF (portadas)** | OK | `covers.js` restringe a URLs **https** (`isAllowedCoverUrl`) y valida `content-type` de imagen + tamaño máximo antes de escribir. |
| **IPC (superficie)** | OK | Whitelist de canales en `preload.cjs`; handlers validan ids (`profileId`/`mangaId`); `contextIsolation: true`, `nodeIntegration: false`, `sandbox` default. |
| **Dependencias** | OK | `npm audit --audit-level=high` (workflow `audit.yml`) + overrides de paquetes transitivos. |
| **Integridad de backup** | OK | `integrity_check` de SQLite + validación de `manifest` (app y `schemaVersion`) antes de restaurar. |

## Oportunidades de endurecimiento (Low)

1. **Sin CSP** en el renderer. No hay vector de inyección conocido (sin `innerHTML`, React escapa), pero
   definir una `Content-Security-Policy` restrictiva (permitir solo `self`, `mangacount:`, `data:` e
   imágenes `https://*.anilist.co`) reduce la superficie si apareciera un XSS. *(Backlog.)*
2. **Protocolo `mangacount://`**: sirve cualquier archivo de `userData/<host>/<basename>`. Acotado por
   host (`profiles`/`covers`) y `basename`; sin impacto práctico, pero podría restringirse a extensiones
   de imagen. *(Backlog.)*
3. **Imágenes remotas de AniList** (por diseño): el renderer carga miniaturas `https` de AniList, lo que
   revela la IP del usuario a ese CDN. Aceptable para la feature; documentado.

## Conclusión

**Aprobado.** No hay vulnerabilidades explotables en el modelo de amenaza (app local de un solo usuario,
sin servidor, sin contenido remoto en el renderer). Los ítems Low son mejoras opcionales.
