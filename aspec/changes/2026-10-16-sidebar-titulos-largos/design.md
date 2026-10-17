# Design: Títulos largos en la Biblioteca del sidebar

## Approach

Cambio mínimo y acotado a `Sidebar.css`, sin tocar JSX ni lógica. Se atacan las dos causas de la cadena
de flexbox descrita en el proposal:

- **`.manga-info`**: pasar de `flex: 1` a `flex: 1; min-width: 0;`. Esto quita el `min-width:auto`
  implícito de los flex items y permite que la caja del título encoja por debajo de su ancho `min-content`
  (la palabra completa), devolviendo el espacio a `.manga-actions`.
- **`.manga-name`**: agregar `overflow-wrap: break-word;` (ver alternativa abajo) para que una palabra sin
  espacios que no entre se parta dentro de la palabra en lugar de desbordar su caja.
- **`.manga-actions`**: sin cambios (sigue `flex-shrink:0`), garantizando que los tres iconos queden
  alineados a la derecha del ítem en cualquier caso.

Se sigue el patrón ya usado en el repo para títulos: `CollectionView.css:471-472` aplica
`word-wrap: break-word; overflow-wrap: break-word;` sobre `.manga-title`. Aquí basta `overflow-wrap` porque
el problema específico es el ancho mínimo en un contenedor flex; igualmente se puede acompañar de
`word-wrap: break-word` por consistencia entre navegadores.

Qué se mantiene a propósito (evitar regresiones):

- `align-items: center` de `.manga-item` no se toca; los iconos quedan centrados verticalmente aunque el
  título ocupe dos líneas.
- No se agrega `-webkit-line-clamp` ni ellipsis: el título de la Biblioteca se muestra completo.

Mapa de decisión de corte (alternativas evaluadas):

| Opción                                   | Efecto                                                                 | Decisión |
|------------------------------------------|------------------------------------------------------------------------|----------|
| `overflow-wrap: break-word`              | Corta solo si la palabra no entra; no altera títulos con espacios       | **Elegida** |
| `overflow-wrap: anywhere`                | Además reduce el ancho mínimo intrínseco (corte más agresivo posible)  | Descartada (más fea para casos normales) |
| `word-break: break-all`                  | Parte en cualquier carácter incluso si entra mal repartido              | Descartada (corta títulos legibles innecesariamente) |
| `-webkit-line-clamp: 2` + ellipsis       | Recorta el título                                                       | Descartada (oculta títulos de la biblioteca) |

## Architecture

Sin cambios de contrato ni de componentes; solo declaraciones CSS en un archivo.

```
Sidebar.jsx (sin cambios)
  .manga-item ── flex, space-between, align-items:center
     ├─ .manga-info   { flex:1 }  ──►  { flex:1; min-width:0 }        ← libera el ancho mínimo
     │     └─ .manga-name            ──►  + { overflow-wrap: break-word } ← corta la palabra larga
     └─ .manga-actions { display:flex; flex-shrink:0 }   (sin cambios)  ← iconos siempre a la derecha
```

Antes (título de una sola palabra larga):

```
┌──────────── .manga-item (260px) ────────────┐
│ Gokushufudo…               [🖼️][✏️][🗑️]      │   .manga-info ancho = palabra completa
│  ^ no envuelve: min-width:auto la mantiene   │   → empuja los iconos / descuadra
└──────────────────────────────────────────────┘
```

Después:

```
┌──────────── .manga-item (260px) ────────────┐
│ Gokushu-            [🖼️][✏️][🗑️]            │   min-width:0 permite encoger;
│ fudo                                         │   overflow-wrap parte la palabra
│ 12 volumes                                   │   → iconos fijos a la derecha
└──────────────────────────────────────────────┘
```

Archivos:

- **Modificar**: `mangacount.client/src/components/Sidebar.css`
- **Modificar**: `mangacount.client/src/test/components/Sidebar.test.jsx`
- **NO tocar**: `mangacount.client/src/components/Sidebar.jsx` (ni ningún otro componente)

## Validation

- **Regresión estructural (vitest + Testing Library)**: renderizar la Biblioteca con un título de una
  sola palabra larga (p. ej. `"Gokushufudo"`) y verificar que:
  - el nombre se muestra completo (sin truncado),
  - coexisten los tres botones de acción del ítem (portada, editar, eliminar) con sus `aria-label`/`title`.
- **Verificación visual** (jsdom no calcula layout): con la sidebar a 260px, comprobar en tema claro y
  oscuro que:
  - un título de una sola palabra larga envuelve y los tres iconos quedan alineados a la derecha del ítem,
  - los títulos de varias palabras y los cortos se siguen viendo igual que antes,
  - no aparece scroll horizontal en la página ni en la lista.
- **Gates**: `npm run lint:renderer` sin errores; `npm run test:renderer:coverage` en verde (≥90%);
  `npm run test:coverage` (main) en verde; `npm run build:renderer` sin errores.
- **Reconciliación de specs**: al archivar, incorporar el requirement `ADDED` de este change a
  `aspec/specs/frontend-web/spec.md` (complementa "Navegación lateral (sidebar) modernizada").
