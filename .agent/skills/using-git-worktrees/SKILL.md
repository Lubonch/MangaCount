---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 2. Check AGENTS.md

```bash
grep -i "worktree.*director" .agent/AGENTS.md 2>/dev/null
```

**If preference specified:** Use it without asking.

### 3. Ask User

If no directory exists and no AGENTS.md preference:

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify directory is ignored before creating worktree:**

```bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:**

Do not commit ignore changes automatically.

1. Prefer a location that is already ignored or outside the repository
2. If neither is available, ask the user whether to update ignore rules or switch to a global location
3. Proceed only after the location is safe

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Global Directory (~/.config/superpowers/worktrees)

No .gitignore verification needed - outside project entirely.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. Optional Baseline Verification

Only run baseline verification if the user explicitly asks for it:

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
```

**If verification fails:** Report failures, ask whether to proceed or investigate.

**If verification passes, or if no baseline verification was requested:** Report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Verification: <not requested / requested and passed>
Ready to implement <feature-name>
```

## Quick Reference

| Situation                  | Action                              |
| -------------------------- | ----------------------------------- |
| `.worktrees/` exists       | Use it (verify ignored)             |
| `worktrees/` exists        | Use it (verify ignored)             |
| Both exist                 | Use `.worktrees/`                   |
| Neither exists             | Check `.agent/AGENTS.md` → Ask user |
| Directory not ignored      | Ask user or switch to safe location |
| Baseline verification fails | Report failures + ask              |
| No package.json/Cargo.toml | Skip dependency install             |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > `.agent/AGENTS.md` > ask

### Running unrequested tests

- **Problem:** Violates the project's default policy and may waste time
- **Fix:** Run baseline verification only when the user explicitly asks for it

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]

Worktree ready at /Users/jesse/myproject/.worktrees/auth
Verification: not requested
Ready to implement auth feature
```

## Red Flags

**Never:**

- Create worktree without verifying it's ignored (project-local)
- Run baseline verification without user approval
- Proceed with failing requested verification without asking
- Assume directory location when ambiguous
- Skip `.agent/AGENTS.md` check

**Always:**

- Follow directory priority: existing > `.agent/AGENTS.md` > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify a clean baseline only when the user explicitly asks for it

## Integration

**Called by:**

- **brainstorming** (Phase 4) - REQUIRED when design is approved and implementation follows
- **single-flow-task-execution** - REQUIRED before executing any tasks
- **executing-plans** - REQUIRED before executing any tasks
- Any skill needing isolated workspace

**Pairs with:**

- **finishing-a-development-branch** - REQUIRED for cleanup after work complete
