# Superpowers Agent Profile

You have superpowers.

This profile adapts Superpowers workflows for a strict single-flow execution environment.

## Core Rules

1. Prefer local skills in `.agent/skills/<skill-name>/SKILL.md`.
2. Execute one core task at a time with `task_boundary`.
3. Use `browser_subagent` only for browser automation tasks.
4. Track progress in chat. If temporary scratch notes are truly needed, keep them outside the repo in an ephemeral location and delete them before completion.
5. Do not create persistent documentation, tests, or Git integration actions unless the user explicitly requests them.
6. Keep changes scoped to the requested task and verify before completion claims.
7. Ignore `.agent/FOR_THE_HUMAN.md` unless the user explicitly asks to read or edit it. That file is for human maintainers, not for agent execution.

## Project Policy Overrides

- Persistent repo artifacts are opt-in. Create plans, PR guides, specs, or other documentation files only when the user explicitly asks for them.
- User-requested artifacts are allowed and should be kept in the repository when that is what the user asked for.
- Default scratch location is outside the repository, for example `%TEMP%/agent-scratch/<repo-name>/`.
- Do not run `git commit`, `git push`, create pull requests, merge branches, discard work, or perform other Git integration actions without explicit user instruction.
- Do not create tests or run tests unless the user explicitly requests that work.

## Tool Translation Contract

When source skills reference legacy tool names, map them to equivalent capabilities in the current platform. The exact tool names can vary by IDE, agent host, or CLI.

- Legacy assistant/platform names -> `the current agent`
- `Task` tool -> `browser_subagent` for browser tasks, otherwise sequential `task_boundary`
- `Skill` tool -> read the project-local `.agent/skills/<skill-name>/SKILL.md`; if your platform supports a personal skill library, that can be a fallback
- `TodoWrite` -> report progress in chat; if a temporary checklist is required, keep it in ephemeral scratch outside the repo and delete it before completion
- File operations -> `view_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`
- Directory listing -> `list_dir`
- Code structure -> `view_file_outline`, `view_code_item`
- Search -> `grep_search`, `find_by_name`
- Shell -> `run_command`
- Web fetch -> `read_url_content`
- Web search -> `search_web`
- Image generation -> `generate_image`
- User communication during tasks -> `notify_user`
- MCP tools -> `mcp_*` tool family

## Skill Loading

- First preference: project skills at `.agent/skills`.
- Second preference: user-level skills only if the platform supports a personal skill library.
- If both exist, project-local skills win for this profile.
- Optional parity assets may exist at `.agent/workflows/*` and `.agent/agents/*` as entrypoint shims/reference profiles.
- Do not read human-only reference files unless the user explicitly asks for them.
- These assets do not change the strict single-flow execution requirements in this file.

## Single-Flow Execution Model

- Do not dispatch multiple coding agents in parallel.
- Decompose large work into ordered, explicit steps.
- Keep exactly one active task at a time and report status in chat.
- If browser work is required, isolate it in a dedicated browser step.

## Verification Discipline

Before saying a task is done:

1. Run the relevant verification command(s).
2. Confirm exit status and key output.
3. Report verification evidence in chat or in a user-requested artifact.
4. Report evidence, then claim completion.
