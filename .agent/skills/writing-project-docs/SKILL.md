---
name: writing-project-docs
description: Use when generating documentation for a feature, PR, or implementation — especially when docs are too long, hard to read, or need to be understood by non-technical reviewers, testers, or team leads
---

# Writing Project Docs

## Overview

**Documentation must be readable by a human in a single sitting.**

The default failure mode is generating exhaustive, internally consistent documentation that no one reads. The goal is a single concise document that covers everything a person needs to know, do, and verify — nothing more.

## When to Use

Use this skill when:
- Generating documentation for a PR, feature, or implementation
- Existing docs are too long (multiple large files, 500+ lines, duplicated content)
- A reviewer, tester, or team lead needs to understand what was done without reading all the code
- You are consolidating multiple documentation files into one

**Do NOT use for:**
- Internal code comments or docstrings
- Architecture decision records (ADRs)
- API reference docs (those should be exhaustive)

## Core Pattern — One Document, Human Scale

```
❌ BAD: 6 separate files × 300+ lines each = no one reads any of them
✅ GOOD: 1 file × ~150 lines = a person reads it in 5 minutes and knows what to do
```

**Maximum length target:** ~150–200 lines for a feature or PR doc.  
If it's longer, cut it — don't add a summary on top.

## Document Structure (use this order)

```markdown
# [Feature name] — [One-line description]
### [System] · [Context] · [Branch/PR]

## ¿Qué hace? / What does it do?
[3–5 lines max. Problem → Solution → Benefit]

## Archivos modificados / Files changed
[Table: Layer | File | What changed — one line per file]

## [Key concept] — [any modes, states, or rules]
[Table or small diagram. No prose.]

## Cómo instalar / How to install
[Numbered steps. Commands ready to copy-paste. Verification query included.]

## Pruebas / Tests
[One subsection per scenario. Format: Who, Steps (numbered, short), Expected result, Verification SQL if needed]

## Criterios de aprobación / Approval criteria
[Two lists: Mandatory (blocking) | Recommended]

## Commit
[Copy-paste ready git command]

## Rollback
[Copy-paste ready SQL/command]

## Problemas comunes / Common issues
[Table: Problem | Cause | Fix]
```

## Rules

### Cut ruthlessly
- One doc, not six. If you produced multiple docs, merge them.
- Each section must add information not present elsewhere.
- No "executive summary" on top of a document that is already short.
- No "notes for the tester" section that repeats what's already in the test scenarios.

### Tables over prose
Every time you want to write a paragraph, ask: "Is this a table?"

```
❌  "The system has four operating modes. In CARGA mode the user..."
✅  | Mode | When | Title | Buttons | Fields |
    |------|------|-------|---------|--------|
```

### Commands must be copy-paste ready
```
❌  "Run the appropriate msbuild command with Debug configuration"
✅  npm run build
```

### Test scenarios: Who + Steps + Result + SQL
Each scenario must answer exactly four questions:
1. **Who** is logged in?
2. **What steps** does the tester follow? (numbered, ≤ 8 steps)
3. **What is the expected result?** (visible behavior + message)
4. **How to verify in the DB?** (copy-paste SQL when relevant)

### Language
Write in the language of the project team. Match the team's default language for headings and explanatory text. Keep file names, commands, SQL, and code in their native syntax.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Generating 5+ files for one feature | Merge into one GUIA-RAPIDA PR {PR_NUMBER}.md |
| Writing "Resumen ejecutivo" + detailed sections | Choose one — the detail IS the summary |
| Listing files without saying what changed | Add a "What changed" column |
| Test scenarios without DB verification | Add the SQL query |
| Long prose in "How to install" | Convert to numbered steps with commands |
| Documenting edge cases no one will test | Move to "Known limitations" in 2 lines |
| Repeating the approval criteria in 3 places | One list, at the end |

## Quick Reference

| Question | Answer |
|----------|--------|
| Max length? | ~150–200 lines |
| How many files? | One per feature/PR (`GUIA-RAPIDA PR {PR, feature, or implementation_NUMBER}.md`) |
| Language for headers? | Project team language |
| Language for code/SQL? | English |
| Test format? | Who · Steps · Result · SQL |
| Commands format? | Copy-paste ready, no placeholders |
| When to use tables? | Always, instead of prose lists |

## Example — Test Scenario (good)

```markdown
### Escenario 3 — Invitación de usuario ✅ *(crítico)*
**Quién:** Administrador con permisos para alta de usuarios

1. Ir a Administración → Usuarios
2. Hacer clic en **Invitar usuario**
3. Completar email y rol
4. Confirmar la acción

**Resultado esperado:**
```sql
SELECT email, status FROM user_invites
WHERE email = 'alice@example.com';
-- email = 'alice@example.com', status = 'pending'
```
```

## Real-World Impact

In one rollout, a documentation folder had 6 files totalling ~86 KB and ~2,250 lines. After applying this pattern: one file, ~200 lines, covering the test scenarios, installation steps, critical review points, commit command, and rollback. A reviewer could read it in under 5 minutes.
