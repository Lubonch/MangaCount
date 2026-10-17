# Proposal: Re-chequear el tamaño de la portada local después de leerla (TOCTOU)

**Issue:** [#97](https://github.com/Lubonch/MangaCount/issues/97) · **Severidad:** Low (auditoría batch 2.2.0)

## Problem

En `linkLocalCover` (`electron/main/services/covers.js:298` y `:302`) el `stat` que aplica el cap de
8 MB y el `readFile` posterior **no son atómicos**. Si el archivo cambia entre ambas llamadas, el
tamaño leído puede superar `MAX_COVER_BYTES` aunque el `stat` haya pasado. El impacto es local y
dirigido por el usuario (Low), pero el cap deja de ser una garantía.

## Proposed change

Re-chequear el tamaño **después** de leer: si `buffer.length > MAX_COVER_BYTES`, rechazar con el mismo
error `imagen demasiado grande` y no escribir nada. Extraer la comprobación a un helper
`assertCoverSize(bytes)` usado tanto con `info.size` como con `buffer.length`, para testearlo
directamente.

No cambia el contrato IPC ni el comportamiento visible: una imagen dentro del cap sigue vinculándose
igual; una que crece por encima del cap se rechaza.

**Specs:** no aplica — no altera comportamiento especificado, solo refuerza un invariante interno de
seguridad.

## Scope

**In scope**

- `electron/main/services/covers.js`: helper `assertCoverSize` + re-chequeo tras `readFile`.
- `electron/main/services/covers.test.js`: test del helper y confirmación de que el flujo normal sigue
  funcionando.

**Out of scope**

- Lectura atómica por file descriptor, streaming o `O_NOFOLLOW`.
- Acotar el `sourcePath` a rutas del diálogo (eso es el change
  `2026-10-17-acotar-sourcepath-portada-local`).
- Cambiar el cap de 8 MB o el formato del error.

## Risks

- **Doble lectura innecesaria**: mitigación → el re-chequeo es una comparación de longitud en memoria,
  sin I/O extra.
- **Romper la rama de error esperada**: mitigación → se reutiliza el mismo mensaje `imagen demasiado
  grande` que ya consumen los tests y la UI.
- **Cobertura de la nueva rama**: mitigación → el helper exportado se testea con un tamaño mayor al cap.
