# AGENTS.md

Reglas para agentes que trabajan en este repositorio.

## Ramas y PRs

- `main` es la rama de release: **solo entra por PR desde `develop`**.
- **Nunca** pushear directo a `main`, ni force-push, ni borrar la rama.
- El workflow [`branch-enforcement.yml`](.github/workflows/branch-enforcement.yml) falla si un PR hacia
  `main` no viene de `develop`, y el ruleset **“PR only”** exige PR + checks de CI + el check
  `Require develop source`.
- Flujo normal: rama de trabajo → merge a `develop` → PR `develop → main` → release por tag `v*`.

## Cambios (aspec)

- Los cambios se documentan con el flujo **aspec** en `aspec/changes/` (proposal, design, tasks y delta
  specs); los completados se archivan en `aspec/changes/archive/`.
- Todo change abierto tiene un **issue de GitHub** con el marcador oculto
  `<!-- aspec-change: <nombre-del-change> -->`.
- No dar un issue por completado hasta que el change esté **archivado** y la release esté **deployada**.

## Verificación antes de terminar

```bash
npm test
npm run test:renderer:coverage
npm run lint:renderer
npm run build:renderer
```
