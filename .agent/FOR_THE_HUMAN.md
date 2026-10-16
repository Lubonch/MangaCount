# For the Human

This file is a human-only reference.

Agents should ignore it unless you explicitly ask them to read or edit it.

## What This `.agent` Folder Is

This folder is a portable skill profile for a coding agent. It is meant to work across different environments.

What matters is the behavior, not the product name:

- VS Code, a browser-based agent, a CLI agent, or another IDE can all use the same skill set
- Tool names may change between platforms
- The project-local `.agent/skills` directory is the real source of truth

## How The Profile Is Organized

| Path | Purpose |
| --- | --- |
| `.agent/AGENTS.md` | Global rules and behavior defaults for the agent |
| `.agent/skills/<skill>/SKILL.md` | The actual skills the agent should load and follow |
| `.agent/workflows/*` | Entrypoints or shortcuts for common flows like brainstorm, write plan, and execute plan |
| `.agent/agents/*` | Support prompts/templates for specialized review roles |
| `.agent/tests/*` | Validation scripts for checking that the local agent profile is internally consistent |
| `.agent/task.md` | Reference task template, not a required runtime tracker |
| `.agent/FOR_THE_HUMAN.md` | Human-only orientation guide |

## How Skills Work

Every skill is a small instruction package.

Typical structure:

1. A `name` in the frontmatter
2. A `description` that tells the agent when the skill should be loaded
3. A `SKILL.md` body with the actual workflow, rules, and validation steps
4. Optional support files with examples, prompts, or reference material

The normal lifecycle is:

1. The agent receives a task
2. It checks whether any skill applies
3. It reads the relevant `SKILL.md`
4. It follows that workflow while doing the work

The agent should prefer project-local skills over user-global ones.

## How To Use This In Any IDE Or Agent

You do not need a specific IDE for this profile.

Any environment can use it if it supports the following capabilities:

| Capability | What it means |
| --- | --- |
| Read files | Open `AGENTS.md` and the relevant `SKILL.md` files |
| Search files | Find matching skills by name, description, or keywords |
| Edit files | Apply the requested code or documentation changes |
| Run commands | Validate behavior when shell access exists |
| Ask questions | Clarify ambiguity when necessary |
| Browser automation | Optional, only for browser tasks |

Practical setup in any environment:

1. Put the `.agent` folder in the project root
2. Make sure the agent can read `.agent/AGENTS.md` at the start of work
3. Treat `.agent/skills/*/SKILL.md` as the canonical playbooks
4. Map platform-specific tool names to equivalent capabilities in that environment
5. Keep project-local rules above any global or personal skill library

If a platform supports a personal skill library, that is optional. A project should still work with only the local `.agent` folder.

## Using This With Visual Studio

Visual Studio (the full IDE, not VS Code) is more solution-centric than folder-centric.

That matters because `.agent` usually lives at the repository root, while Visual Studio often shows only:

- projects included in the `.sln`
- files included in each project
- explicit `Solution Items`

So there are two separate questions:

1. Does the `.agent` folder exist on disk in the repository root?
2. Does Visual Studio show that folder inside Solution Explorer?

Those are not the same thing.

Important practical rule:

- The profile works because the files exist in the repository
- They do not need to be compiled
- They do not need to be part of a `.csproj`
- But some agent integrations may expose or prioritize only what Visual Studio has opened or surfaced

What to expect in Visual Studio:

- If `.agent` is not part of a project, it may not appear in Solution Explorer
- If `.agent` is not added as `Solution Items`, a human may forget it exists
- If an agent integration only reads the currently opened solution surface, visibility can matter in practice even though the files are present on disk

Recommended ways to work with it in Visual Studio:

### Option 1: Keep `.agent` only on disk

Use this if your agent/tooling can read repository files even when they are not shown in the solution.

This is the cleanest option when:

- the agent can access the repo root directly
- the team is comfortable editing `.agent` outside Solution Explorer
- you do not want solution metadata changes just to expose helper files

### Option 2: Add key `.agent` files as `Solution Items`

Use this if you want the files to be visible from Visual Studio.

Typical candidates:

- `.agent/AGENTS.md`
- `.agent/FOR_THE_HUMAN.md`
- optionally the most important skill files under `.agent/skills/`

This helps when:

- humans need to open and review the profile from Solution Explorer
- the IDE integration behaves better with visible files
- you want the existence of the profile to be obvious to everyone using the solution

### Option 3: Open the repository root outside the solution flow

Use this if the `.sln` is too restrictive.

Examples:

- open the repo folder in a file explorer and edit `.agent` directly
- use terminal commands from the repo root
- use an editor or agent host that works at folder level instead of solution level

Practical recommendation:

- Keep `.agent` at the repository root
- Do not move it under a specific application project just to make Visual Studio show it
- If visibility is a problem, add the important files as `Solution Items`
- If visibility is not a problem, leave `.agent` outside the project structure

The main idea is simple:

- `.agent` is repository configuration for the agent workflow
- it is not application code
- Visual Studio may hide it unless you surface it deliberately
- hiding it in Solution Explorer does not mean it stopped existing or stopped mattering

## Current Behavior Defaults In This Profile

This profile currently assumes:

- One core task at a time
- No persistent documentation unless explicitly requested
- No tests created or run unless explicitly requested
- No `git commit`, `git push`, PR creation, merge, or discard actions unless explicitly requested
- Verification before claiming completion
- Temporary scratch, if needed, stays outside the repository and gets deleted

## How The `.agent/tests` Scripts Work

The `.agent/tests` folder is not for application tests of the host application itself.

It exists to validate the agent profile under `.agent`.

Today it has this structure:

| File | Purpose |
| --- | --- |
| `.agent/tests/run-tests.sh` | Entry point. Runs the profile validation in one command. |
| `.agent/tests/check-agent-profile.sh` | Main checker. Verifies that the profile files, skill metadata, policy rules, and de-branding constraints are still intact. |

What each script does:

1. `run-tests.sh` is just a wrapper. It prints a header and delegates to `check-agent-profile.sh`.
2. `check-agent-profile.sh` performs the actual checks. It validates things like:
	- required files exist
	- required skills still have frontmatter (`name`, `description`)
	- old legacy instructions did not come back
	- `AGENTS.md` still contains the expected policy contract
	- runtime skills do not depend on the old repo-local tracker
	- no leftover platform-branding references remain under `.agent`

When a human would use these scripts:

- After editing `AGENTS.md`
- After changing a skill under `.agent/skills/`
- After updating the local profile from another source
- Before considering the `.agent` profile aligned and ready to use

How to run them:

```bash
bash .agent/tests/run-tests.sh
```

On Windows, that means using a compatible POSIX shell such as Git Bash, WSL, or another `bash`-compatible shell.

How to read the result:

- `PASS` means that specific profile check succeeded
- `FAIL` means the checker found a contract drift or missing file
- Final `STATUS: PASSED` means the profile is internally consistent
- Final `STATUS: FAILED` means the profile should be reviewed before trusting it

Important limitation:

- These scripts validate the agent profile only
- They do not compile the host application
- They do not run business or UI tests
- They do not verify application behavior outside `.agent`

## Skill Catalog

| Skill | When to use it | What it does |
| --- | --- | --- |
| `using-superpowers` | At the start of a task or conversation | Forces the agent to check whether a skill applies before acting |
| `brainstorming` | Before creative or design-heavy work | Clarifies intent, requirements, tradeoffs, and design direction |
| `writing-plans` | When a written plan is explicitly requested | Produces a saved implementation plan for a multi-step task |
| `executing-plans` | When there is already a written plan | Runs that plan in order and reports progress/checkpoints |
| `single-flow-task-execution` | When work must happen sequentially | Breaks work into one-task-at-a-time execution with review gates |
| `verification-before-completion` | Before saying something is done or fixed | Requires evidence before completion claims |
| `systematic-debugging` | For bugs, failures, and unexpected behavior | Forces root-cause analysis before proposing fixes |
| `test-driven-development` | Only when TDD or tests are explicitly requested | Enforces red-green-refactor for test-first work |
| `requesting-code-review` | When a structured review is needed | Reviews the diff against requirements before follow-up |
| `receiving-code-review` | When review feedback arrives | Helps decide what to accept, reject, or question |
| `finishing-a-development-branch` | Only when branch integration is explicitly requested | Guides branch wrap-up, preservation, or disposal choices |
| `using-git-worktrees` | When isolated branch workspaces are needed | Sets up a safe worktree without assuming automatic Git actions |
| `writing-project-docs` | When the user explicitly wants human-readable docs | Produces concise project or PR documentation |
| `writing-skills` | When creating or refining skills | Explains how to author and improve skills themselves |

## How A Human Should Ask For These Skills

You do not need to know the underlying platform. Ask for outcomes.

Examples:

- "Antes de implementar, brainstormeá opciones y tradeoffs"
- "Armá un plan escrito y guardalo"
- "Ejecutá este plan de a una tarea por vez"
- "Hacé una revisión del diff antes de seguir"
- "Debuggeá esto de forma sistemática"
- "Documentá esto para reviewers no técnicos"
- "No hagas tests ni git salvo que te lo pida"

If the agent is following the profile correctly, it should choose the right skill from the request.

## Important Boundaries

- This file is for humans. It is not part of the agent's runtime workflow.
- If you update this file, the agent should not automatically consume the new content.
- If you want the agent's behavior to change, update `AGENTS.md` or the relevant skill under `.agent/skills/`.
- If you want a human explanation to stay human-only, keep it outside `.agent/skills/` and mark it clearly, like this file.

## Validation Note

At the time this file was created, a workspace-wide search confirmed there were no remaining platform-branding references under `.agent`.