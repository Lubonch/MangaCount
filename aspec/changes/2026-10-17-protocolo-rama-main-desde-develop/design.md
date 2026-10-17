# Design: Enforcement de `main` solo por PR desde `develop`

## Approach

Dos capas que se complementan:

1. **Regla del repo (ruleset)**: exige PR + checks verdes + sin force-push/borrado. GitHub **no** puede
   restringir la rama de origen de un PR, así que esto solo garantiza “se entra por PR”.
2. **Check de origen (workflow)**: `branch-enforcement.yml` falla si el PR hacia `main` no viene de
   `develop`. Al ser un check **requerido**, cierra el hueco de la capa 1.

### Workflow `.github/workflows/branch-enforcement.yml`

```yaml
name: Branch enforcement

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  require-develop-source:
    name: Require develop source
    runs-on: ubuntu-latest
    steps:
      - name: Check head branch
        run: |
          if [ "${{ github.head_ref }}" != "develop" ]; then
            echo "Los PRs a main deben venir de 'develop' (head: '${{ github.head_ref }}')."
            exit 1
          fi
          echo "Origen válido: develop"
```

- El nombre del job (`Require develop source`) es el **contexto** del check requerido.
- Para PRs desde `develop` pasa; desde cualquier otra rama falla.

### Ruleset `PR only` (id 6828738)

Payload a aplicar con `gh api -X PUT repos/Lubonch/MangaCount/rulesets/6828738`:

```json
{
  "name": "PR only",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Main (node --test + coverage ≥90%)" },
          { "context": "Renderer (vitest + coverage ≥90% + lint)" },
          { "context": "npm audit (.)" },
          { "context": "npm audit (mangacount.client)" },
          { "context": "Require develop source" }
        ]
      }
    }
  ]
}
```

Notas:

- `required_approving_review_count: 0`: el PR es obligatorio pero no exige aprobación (repo de un dev).
- `allowed_merge_methods: ["merge"]`: mantener el estilo de merge actual (merge commit).
- `bypass_actors: []` + `enforcement: active`: nadie saltea la regla.
- Los contextos de check deben coincidir **exactamente** con los nombres de job de `test.yml`/`audit.yml`
  y con el nuevo job.

## Architecture

```
PR  ──►  main
 │
 ├─ ruleset "PR only" (active)
 │    ├─ pull_request (obligatorio, 0 approvals, merge)
 │    ├─ non_fast_forward / deletion
 │    └─ required_status_checks ──► Tests + Audit + "Require develop source"
 │
 └─ workflow branch-enforcement.yml
      └─ job "Require develop source" ── falla si head_ref != develop
```

Archivos:

- **Nuevo**: `.github/workflows/branch-enforcement.yml`.
- **Modificar**: `README.md` (sección Contribuir) y/o `AGENTS.md`.
- **Config externa**: ruleset `6828738` (GitHub API).

## Validation

- **PR desde `develop`** → `Require develop source` pasa.
- **PR desde otra rama** (p. ej. `fix/x`) → `Require develop source` **falla** y el merge queda bloqueado.
- **Push directo a `main`** → rechazado por el ruleset (`pull_request` rule).
- **Force-push / borrado de `main`** → rechazado.
- **Tag `v*`** → sigue funcionando (el ruleset apunta a la rama, no a tags).
- **Prueba end-to-end**: crear un PR de prueba desde una rama `test/*` hacia `main` y confirmar que el
  check falla; cerrarlo sin mergear.
- **Documentación**: el protocolo queda descrito en el README/AGENTS.
