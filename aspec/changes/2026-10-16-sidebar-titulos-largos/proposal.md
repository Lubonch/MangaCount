# Proposal: Títulos largos en la Biblioteca del sidebar no desplazan los iconos

## Problem

En el menú lateral derecho, la lista **Biblioteca** (Sidebar) se descuadra cuando un manga tiene un
título largo de **una sola palabra sin espacios** (p. ej. "Gokushufudo"): los botones de acción
(🖼️ portada, ✏️ editar, 🗑️ eliminar) se corren hacia el costado y el ítem se ve mal. Con títulos de
dos o más palabras el formato se ve bien.

Causa (confirmada en el código):

- `Sidebar.css:282` — `.manga-item` es `display:flex; justify-content:space-between; align-items:center`.
- `Sidebar.css:299` — `.manga-info { flex:1 }` con el **`min-width:auto` por defecto** de los flex items.
- `Sidebar.css:303` — `.manga-actions { flex-shrink:0 }` (los iconos no encogen).
- `Sidebar.css:310` — `.manga-name` **no** define `overflow-wrap`.

Con `flex:1` y `min-width:auto`, `.manga-info` no puede encoger por debajo de su **ancho `min-content`**.
Un título de una sola palabra no tiene punto de corte, así que su `min-content` es el ancho completo de
la palabra: eso ensancha `.manga-info`, empuja a `.manga-actions` (que no encoge) hacia el costado y
descuadra el ítem. Con dos palabras el `min-content` es la palabra más larga (corta), por eso esos
títulos envuelven bien. **No es un problema de caracteres, es la falta de un punto de corte.**

## Proposed change

Ajustar los estilos de la lista Biblioteca del sidebar para que el título pueda envolver, incluido el
caso de una sola palabra larga, sin desplazar los iconos:

- `.manga-info` SHALL poder encoger por debajo de su ancho intrínseco (liberar `min-width`).
- `.manga-name` SHALL envolver palabras que no entren (corte dentro de la palabra como último recurso).
- `.manga-actions` mantiene `flex-shrink:0`, de modo que los tres botones quedan siempre alineados a la
  derecha del ítem.

Sin cambios de comportamiento, de lógica ni de datos: es un cambio puramente de presentación en la
Biblioteca del sidebar.

## Scope

**In scope**

- `mangacount.client/src/components/Sidebar.css`: liberar el ancho mínimo de `.manga-info` y permitir el
  corte de `.manga-name`.
- `mangacount.client/src/test/components/Sidebar.test.jsx`: test ligero de regresión que renderiza un
  título de una sola palabra larga y verifica que el nombre se muestra completo y que los tres botones de
  acción siguen presentes (no se agrega truncado/ellipsis).

**Out of scope**

- `Sidebar.jsx`: no requiere cambios de JSX (el nombre ya se renderiza completo en `.manga-name`).
- Truncado / `line-clamp` / ellipsis o tooltip (`title`) para el nombre: se mantiene el título completo.
- Cambios en el comportamiento de colapsar/expandir la sidebar, en la búsqueda/filtro o en la carga de
  portadas.
- `CollectionView` (`.manga-title`, `CollectionView.css:464`): tiene el mismo patrón latente
  (`flex:1` sin `min-width:0`); queda como follow-up, fuera de este change.
- Cambios en tokens de diseño, temas o estilos globales.

## Risks

- **Verificación de layout limitada en tests**: jsdom no calcula layout, así que el arreglo CSS no se
  puede aseverar por `getComputedStyle`. Mitigación → verificación visual (tema claro y oscuro) + test de
  regresión estructural (nombre completo y botones presentes).
- **Regresión visual en títulos cortos**: cambiar `align-items`/alturas podría afectar los ítems de una
  línea. Mitigación → no se toca `align-items` de `.manga-item`; solo se agregan las dos declaraciones.
- **Corte agresivo de palabras**: `overflow-wrap: break-word` solo corta cuando la palabra no entra; no
  altera los títulos que ya envuelven por espacios.
- **Reconciliación de specs**: este requisito es nuevo y complementa "Navegación lateral (sidebar)
  modernizada" de `frontend-web`; al archivar, emitir el delta `ADDED` correspondiente.
