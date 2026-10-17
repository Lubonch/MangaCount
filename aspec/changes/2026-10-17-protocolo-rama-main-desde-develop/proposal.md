# Proposal: Protocolo de rama — `main` solo por PR desde `develop`

## Problem

Hoy `main` **no está protegido** y nada impide:

- **pushear directo a `main`** (se hizo varias veces en esta sesión: commits de release y merges);
- **mergear PRs desde cualquier rama** (`feat/*`, `fix/*`, `docs/*`) — pasó con #96, #100, #101, #102;
- **force-push** o borrado de `main`;
- mergear sin que corran los checks.

Existe un ruleset **“PR only”** (id `6828738`) que apunta a la rama por defecto, pero está
**`enforcement: disabled`** y sólo tiene `non_fast_forward` + `pull_request` con 1 aprobación
requerida (en un repo de un solo dev eso bloquea todo: no se puede auto-aprobar). No exige checks ni
restringe la rama de origen.

## Proposed change

Un protocolo de dos piezas: **regla de GitHub** + **check que valida el origen**.

1. **Workflow `branch-enforcement.yml`** (nuevo): en `pull_request` hacia `main`, falla si
   `github.head_ref !== 'develop'`. Es el único modo de exigir “PR desde `develop`”, porque las reglas
   de rama de GitHub no restringen la rama de origen de un PR.
2. **Ruleset “PR only”** (activar y ajustar, target `~DEFAULT_BRANCH`):
   - `pull_request`: `required_approving_review_count: 0` (repo de un dev; el PR sigue siendo
     obligatorio), `required_review_thread_resolution: true`, `allowed_merge_methods: ['merge']`.
   - `non_fast_forward` (sin force-push) y `deletion` (no se puede borrar `main`).
   - `required_status_checks`: los checks de CI (`Tests`, `Dependency Audit`) **+** `Require develop source`.
   - `bypass_actors: []` → nadie saltea, ni el admin.
3. **Documentar** el protocolo en `README.md` (Contribuir) y en `docs/desktop.md` o `AGENTS.md`.

### Orden de aplicación (importante)

1. Mergear primero el workflow `branch-enforcement.yml` a `main` (vía PR desde `develop`).
2. Recién después activar el ruleset con `Require develop source` como check requerido; si se activa
   antes, el check nunca corre y **bloquea todos los PRs**.

## Scope

**In scope**

- `.github/workflows/branch-enforcement.yml` (nuevo).
- Configuración del ruleset `6828738` vía API (`gh api`): enforcement `active`, reglas y checks.
- Documentación del protocolo (README y/o `AGENTS.md`).

**Out of scope**

- Reglas para otras ramas (`develop` queda sin protección por ahora).
- Exigir revisores/code owners (repo personal de un dev).
- Cambiar los workflows de CI existentes (`test.yml`, `audit.yml`, `release.yml`).
- Migrar a un flujo de release distinto.

## Risks

- **Hotfix urgente**: con el protocolo, todo va por `develop` → `main`. Mitigación → si hace falta, se
  desactiva el ruleset temporalmente (acción manual documentada).
- **Check requerido que no corre**: si `Require develop source` no está en `main` cuando se activa el
  ruleset, todo PR queda bloqueado. Mitigación → orden de aplicación de arriba.
- **Merge de release por tag**: el workflow de release corre por tag, no por PR; el ruleset sólo aplica
  a la rama `main`, así que los tags siguen funcionando.
- **Auto-merge / admin**: `bypass_actors: []` impide saltear la regla incluso como admin; es lo pedido.
- **PRs desde `develop` con checks en rojo**: mitigación → los checks de CI ya son requeridos y bloquean.
