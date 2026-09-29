---
name: writing-plans
description: Use when the user asks for a written implementation plan or a saved plan artifact for a multi-step task
---

# Writing Plans

## Overview

Write implementation plans that are as detailed as needed for the requested task, assuming the engineer has zero context for our codebase and questionable taste. Include file targets, constraints, verification, and any requested documentation or Git follow-up, but do not add tests, commits, or extra artifacts unless the user explicitly asked for them.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md` only when the user explicitly asks for a persistent plan artifact. Otherwise, provide the plan in chat or use ephemeral scratch outside the repo and delete that scratch before completion.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Inspect the controlling file or symbol" - step
- "Implement the scoped change" - step
- "Run the narrowest permitted verification" - step
- "Review the diff or output" - step
- "Suggest next Git steps if requested" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For the agent:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Review: `exact/path/to/existing.py:123-145`

**Step 1: Inspect the target implementation surface**

Read: `exact/path/to/existing.py`
Expected: identify the smallest owning code path for the requested behavior.

**Step 2: Implement the scoped change**

Modify only the listed files and preserve existing patterns.

**Step 3: Run the narrowest permitted verification**

Run the cheapest verification allowed by the current user instruction.

Examples:

- `git diff -- exact/path/to/existing.py`
- A build, lint, or test command only if the user explicitly requested that validation

**Step 4: Record outcome**

Summarize what changed, what was verified, and any remaining open questions.

**Optional Step 5: Tests or Git actions**

Only include these steps when the user explicitly requested tests, commits, push, PR creation, or other Git integration actions.
````

## Remember
- Exact file paths always
- Concrete implementation guidance when needed, not vague placeholders
- Exact commands with expected output when commands are allowed by the user's request
- Reference relevant skills with @ syntax
- DRY and YAGNI always; TDD and Git actions only when explicitly requested

## Execution Handoff

After saving the plan, use a single execution path:

**"Plan complete and saved to `docs/plans/<filename>.md`.**
**Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode."**

If the user asked only for the plan and not for execution, stop after delivering the plan.

Execution requirements:
- **Entry workflow:** `.agent/workflows/execute-plan.md`
- **Execution skill:** `.agent/skills/executing-plans/SKILL.md`
- **Enforced execution model:** `.agent/skills/single-flow-task-execution/SKILL.md`
- **Tracking:** report progress in chat or, if temporary scratch is needed, keep it outside the repo and delete it before completion
