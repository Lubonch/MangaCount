# Tasks: Protocolo de rama — `main` solo por PR desde `develop`

## Fase 1 — Workflow de enforcement

- [ ] Crear `.github/workflows/branch-enforcement.yml` con el job `Require develop source` (falla si
      `github.head_ref !== 'develop'`) disparado en `pull_request` hacia `main`.

## Fase 2 — Poner el workflow en `main` (antes de activar el ruleset)

- [ ] Commitear el workflow en `develop` y mergear vía PR `develop → main`.
- [ ] Confirmar que el check `Require develop source` corre y pasa en ese PR.

## Fase 3 — Activar y ajustar el ruleset “PR only”

- [ ] Aplicar el ruleset con `gh api -X PUT repos/Lubonch/MangaCount/rulesets/6828738` (enforcement
      `active`, `deletion`, `non_fast_forward`, `pull_request` con 0 approvals y merge, y
      `required_status_checks` con los 4 checks de CI + `Require develop source`; `bypass_actors: []`).
- [ ] Verificar que el ruleset quedó `active` con las reglas y contextos esperados.

## Fase 4 — Documentación

- [ ] `README.md` (Contribuir): describir el protocolo (`main` solo por PR desde `develop`, checks
      requeridos, sin force-push/borrado, hotfix = desactivar el ruleset manualmente).
- [ ] `AGENTS.md`: misma regla para agentes (no pushear a `main`; siempre `develop` → PR).

## Fase 5 — Verificación end-to-end

- [ ] Push directo a `main` → rechazado.
- [ ] PR de prueba desde una rama `test/*` hacia `main` → `Require develop source` falla; cerrarlo sin mergear.
- [ ] PR desde `develop` → pasa y se puede mergear.
- [ ] Tag `v*` → sigue disparando el release (el ruleset no afecta tags).
