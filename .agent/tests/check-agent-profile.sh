#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "  [PASS] $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "  [FAIL] $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

require_file() {
  local path="$1"
  if [ -f "$path" ]; then
    pass "File exists: $path"
  else
    fail "Missing file: $path"
  fi
}

search_pattern() {
  local pattern="$1"
  shift

  if command -v rg >/dev/null 2>&1; then
    rg -q -- "$pattern" "$@"
  else
    grep -ERqs -- "$pattern" "$@"
  fi
}

echo "========================================"
echo " Agent Profile Checks"
echo "========================================"
echo ""

echo "Checking required files..."

required_files=(
  "$AGENT_DIR/AGENTS.md"
  "$AGENT_DIR/FOR_THE_HUMAN.md"
  "$AGENT_DIR/INSTALL.md"
  "$AGENT_DIR/task.md"
  "$AGENT_DIR/workflows/brainstorm.md"
  "$AGENT_DIR/workflows/write-plan.md"
  "$AGENT_DIR/workflows/execute-plan.md"
  "$AGENT_DIR/agents/code-reviewer.md"
  "$SCRIPT_DIR/check-agent-profile.sh"
  "$SCRIPT_DIR/run-tests.sh"
)

for file in "${required_files[@]}"; do
  require_file "$file"
done

required_skills=(
  "brainstorming"
  "executing-plans"
  "finishing-a-development-branch"
  "receiving-code-review"
  "requesting-code-review"
  "systematic-debugging"
  "test-driven-development"
  "using-git-worktrees"
  "using-superpowers"
  "verification-before-completion"
  "writing-plans"
  "writing-skills"
  "single-flow-task-execution"
)

for skill in "${required_skills[@]}"; do
  require_file "$AGENT_DIR/skills/$skill/SKILL.md"
done

require_file "$AGENT_DIR/skills/single-flow-task-execution/implementer-prompt.md"
require_file "$AGENT_DIR/skills/single-flow-task-execution/spec-reviewer-prompt.md"
require_file "$AGENT_DIR/skills/single-flow-task-execution/code-quality-reviewer-prompt.md"

echo ""
echo "Checking frontmatter..."

for skill in "${required_skills[@]}"; do
  file="$AGENT_DIR/skills/$skill/SKILL.md"

  if search_pattern '^---$' "$file"; then
    pass "$skill has frontmatter delimiters"
  else
    fail "$skill missing frontmatter delimiters"
  fi

  if search_pattern '^name:\s*[^[:space:]].*$' "$file"; then
    pass "$skill has name field"
  else
    fail "$skill missing name field"
  fi

  if search_pattern '^description:\s*[^[:space:]].*$' "$file"; then
    pass "$skill has description field"
  else
    fail "$skill missing description field"
  fi
done

echo ""
echo "Checking for unsupported legacy instructions..."

legacy_patterns=(
  'Skill tool'
  'Task tool with'
  'Task\("'
  'Dispatch implementer subagent'
  'Dispatch code-reviewer subagent'
  'Create TodoWrite'
  'Mark task complete in TodoWrite'
  'Use TodoWrite'
  'superpowers:'
)

for pattern in "${legacy_patterns[@]}"; do
  if search_pattern "$pattern" "$AGENT_DIR/skills"; then
    fail "Legacy pattern found in skills: $pattern"
  else
    pass "Legacy pattern absent: $pattern"
  fi
done

echo ""
echo "Checking AGENTS mapping contract..."

mapping_checks=(
  'Task.*task_boundary'
  'browser_subagent'
  'Skill.*project-local `.agent/skills'
  'TodoWrite.*progress in chat'
  'run_command'
  'grep_search'
  'find_by_name'
  'mcp_\*'
)

for pattern in "${mapping_checks[@]}"; do
  if search_pattern "$pattern" "$AGENT_DIR/AGENTS.md"; then
    pass "AGENTS includes mapping: $pattern"
  else
    fail "AGENTS missing mapping: $pattern"
  fi
done

echo ""
echo "Checking project policy overrides..."

policy_checks=(
  'Persistent repo artifacts are opt-in'
  'outside the repository'
  'Do not run.*git commit.*git push'
  'Do not create tests or run tests unless the user explicitly requests'
  'Ignore `.agent/FOR_THE_HUMAN.md`'
)

for pattern in "${policy_checks[@]}"; do
  if search_pattern "$pattern" "$AGENT_DIR/AGENTS.md"; then
    pass "AGENTS includes project policy: $pattern"
  else
    fail "AGENTS missing project policy: $pattern"
  fi
done

echo ""
echo "Checking core runtime skills for deprecated repo tracker instructions..."

runtime_skill_files=(
  "$AGENT_DIR/skills/using-superpowers/SKILL.md"
  "$AGENT_DIR/skills/brainstorming/SKILL.md"
  "$AGENT_DIR/skills/writing-plans/SKILL.md"
  "$AGENT_DIR/skills/executing-plans/SKILL.md"
  "$AGENT_DIR/skills/single-flow-task-execution/SKILL.md"
  "$AGENT_DIR/skills/single-flow-task-execution/implementer-prompt.md"
)

for file in "${runtime_skill_files[@]}"; do
  if search_pattern 'docs/plans/task\.md' "$file"; then
    fail "Deprecated tracker instruction found in: $file"
  else
    pass "No deprecated tracker instruction in: $file"
  fi
done

echo ""
echo "Checking for platform-branding leftovers..."

if search_pattern '[Aa]ntigravity' "$AGENT_DIR"; then
  fail "Platform-branding references still present under .agent"
else
  pass "No platform-branding references present under .agent"
fi

echo ""
echo "========================================"
echo " Summary"
echo "========================================"
echo "  Passed: $PASS_COUNT"
echo "  Failed: $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "STATUS: FAILED"
  exit 1
fi

echo "STATUS: PASSED"