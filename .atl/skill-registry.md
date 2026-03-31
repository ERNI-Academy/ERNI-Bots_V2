# Skill Registry — ERNI-Bots_V2

Generated: 2026-03-31

## User Skills

| Skill | Trigger | Source |
|-------|---------|--------|
| branch-pr | Creating a PR, opening a PR, preparing changes for review | ~/.copilot/skills/branch-pr/ |
| go-testing | Writing Go tests, using teatest, adding test coverage | ~/.copilot/skills/go-testing/ |
| issue-creation | Creating a GitHub issue, reporting a bug, requesting a feature | ~/.copilot/skills/issue-creation/ |
| judgment-day | "judgment day", "review adversarial", "dual review", "juzgar" | ~/.copilot/skills/judgment-day/ |
| skill-creator | Creating a new skill, adding agent instructions, documenting patterns for AI | ~/.copilot/skills/skill-creator/ |

## SDD Skills (auto-loaded by orchestrator)

sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive

## Project Skills

None detected.

## Project Conventions

No convention files found (no AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, copilot-instructions.md).

## Compact Rules

### branch-pr
- Follow issue-first workflow: every PR must reference an existing issue
- Use conventional commit messages

### go-testing
- Use teatest for Bubbletea TUI testing
- Follow table-driven test patterns

### issue-creation
- Follow issue-first enforcement: create issues before branches/PRs
- Use structured templates (bug, feature)

### judgment-day
- Parallel adversarial review: two independent blind judges
- Synthesize findings, apply fixes, re-judge (max 2 iterations)

### skill-creator
- Follow Agent Skills spec structure
- Include YAML frontmatter with name, description, trigger
- Define allowed-tools explicitly
