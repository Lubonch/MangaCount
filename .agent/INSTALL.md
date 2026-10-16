# Install Superpowers Agent Profile

This package is a standalone agent profile. It does not modify the original Superpowers source workflows.

## Prerequisites

- A compatible agent environment
- Shell access
- This repository available locally

## Install

From your project root:

```bash
mkdir -p .agent
cp -R /path/to/profile-template/.agent/* .agent/
```

If your project already has `.agent/skills`, merge carefully and keep the versions you want.

## What Gets Installed

- `.agent/AGENTS.md`
- `.agent/task.md` (template only)
- `.agent/skills/*`
- `.agent/workflows/*`
- `.agent/agents/*`
- `.agent/tests/*`

Runtime scratch:

- No tracking file is required in the target project root.
- If temporary scratch notes are needed at runtime, keep them outside the repository and delete them before completion.

## Verify Profile

From your target project root:

```bash
bash .agent/tests/run-tests.sh
```

Expected result: all checks pass with zero failures.

Use any compatible POSIX shell available in your environment, such as Git Bash, WSL, or another `bash`-compatible shell.

## Usage Notes

- This profile uses strict single-flow task execution.
- Generic coding subagents are intentionally not used.
- Browser automation can use `browser_subagent` when needed.
- Skill references are local to `.agent/skills`.
- Persistent documentation is opt-in and should only be created when the user explicitly requests it.
- Git integration actions and testing are opt-in and should only be executed when the user explicitly requests them.

## Update

Re-run the CLI init with `--force` to update, then rerun validation:

```bash
bash .agent/tests/run-tests.sh
```
