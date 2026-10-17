# Tasks: Títulos largos en la Biblioteca del sidebar no desplazan los iconos

## Fase 1 — CSS (Sidebar.css)

- [x] `.manga-info`: agregar `min-width: 0` (junto a `flex: 1`) para permitir que encoja por debajo de su
      ancho intrínseco.
- [x] `.manga-name`: agregar `overflow-wrap: break-word` (y `word-wrap: break-word` por consistencia con
      `CollectionView.css`) para que una palabra sin espacios que no entre se parta en lugar de desbordar.
- [x] Confirmar que `.manga-actions` conserva `flex-shrink: 0` y que NO se toca `align-items` de
      `.manga-item` (evitar regresión en títulos cortos).

## Fase 2 — Tests (Sidebar.test.jsx)

- [x] Agregar un test de regresión que renderice la Biblioteca con un manga de nombre de una sola palabra
      larga (p. ej. `"Gokushufudo"`) y verifique que el nombre se muestra completo (sin truncado) y que
      coexisten los tres botones de acción del ítem (buscar portada / editar / eliminar) con sus
      `aria-label`/`title`.
- [x] Mantener en verde los tests existentes de la lista (filtro, volúmenes, eliminar, portada).

## Fase 3 — Gates y verificación

- [ ] `npm run lint:renderer` sin errores (mirar la línea resumen completa de ESLint).
- [ ] `npm run test:renderer:coverage` en verde (≥90% stmts/branches/funcs/lines).
- [ ] `npm run test:coverage` (main) en verde (≥90%).
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación visual de la Biblioteca (sidebar 260px, tema claro y oscuro): título de una sola
      palabra larga envuelve con los iconos alineados a la derecha; títulos cortos y de varias palabras
      sin cambios; sin scroll horizontal.
- [ ] `ancleto-security` + verificación cruzada contra proposal/design/specs.
- [ ] Al archivar, incorporar el requirement `ADDED` a `aspec/specs/frontend-web/spec.md`.
