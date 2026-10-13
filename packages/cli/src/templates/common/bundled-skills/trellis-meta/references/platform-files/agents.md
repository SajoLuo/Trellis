# Agents

Trellis agent files define specialized roles. Common Trellis agents in a user project are:

- `trellis-research`
- `trellis-implement`
- `trellis-check`

File locations and formats differ by platform, but responsibility boundaries should stay consistent.

## Agent Responsibilities

| Agent | Responsibility |
| --- | --- |
| `trellis-research` | Investigate the question and write findings into the current task's `research/`. |
| `trellis-implement` | Implement against `prd.md`, optional `design.md` / `implement.md`, `implement.jsonl`, and related spec/research. |
| `trellis-check` | Review changes, fix discovered issues, and run necessary checks. |

Agent files should not become generic chat prompts. They should define input sources, write boundaries, whether code may be changed, and how results are reported.

## Common Paths

| Platform | Agent path |
| --- | --- |
| Claude Code | `.claude/agents/trellis-*.md` |
| Cursor | `.cursor/agents/trellis-*.md` |
| OpenCode | `.opencode/agents/trellis-*.md` |
| Codex | `.codex/agents/trellis-*.toml` |
| Kiro | `.kiro/agents/trellis-*.json` |
| Gemini CLI | `.gemini/agents/trellis-*.md` |
| Qoder | `.qoder/agents/trellis-*.md` |
| CodeBuddy | `.codebuddy/agents/trellis-*.md` |
| Factory Droid | `.factory/droids/trellis-*.md` |
| Pi Agent | `.pi/agents/trellis-*.md` |
| Reasonix | `.reasonix/skills/trellis-*/SKILL.md` (subagent frontmatter) |
| ZCode | `.zcode/agents/trellis-*.md` |
| Kimi Code | `.kimi-code/skills/trellis-*/SKILL.md` (agent prompts as skills, dispatched to the built-in `coder`; research needs its file-editing tools to persist findings) |
| DeepSeek Harness | `.dsh/skills/trellis-agent-*/SKILL.md` (child-only role prompts; choose synchronization from the actual tool catalog and schema, not optional plugin presence alone; see the DSH contract below) |

GitHub Copilot agent/prompt support is provided by a combination of directories such as `.github/agents/`, `.github/prompts/`, and `.github/skills/`; inspect the files actually generated in the user project.

Main-session workflow platforms such as Kilo, Antigravity, and Devin may not have Trellis sub-agent files. They usually rely on workflows/skills to guide the main session.

### DeepSeek Harness synchronization

Before dispatching a dependent role, inspect the actual tool catalog and schema.
DSH 0.2.1-alpha.2 returns a `subagentId` immediately and has no
`run_in_background` parameter; a child id is not completion evidence.

- With `trellis_wait`, use the supported continuable `subagent` contract,
  continue independent work, then wait once per dependent child id. Require a
  successful settled outcome and inspect the actual report or transcript before
  advancing. A wait result or end event does not prove a native settlement
  notice was queued or delivered; do not require a separate notice after a
  verified result.
- Without a waiter, use `run_in_background: false` only if the legacy schema
  supports it, and inspect the successful returned outcome and actual report
  or transcript before advancing. Never send this removed parameter to alpha.2.
- Without legacy foreground support, use a verified native notification/yield
  path: yield the parent and consume the actual successful result and report or
  transcript before advancing. Merely expecting a best-effort notice is not a
  verified synchronization path.
- If no reliable synchronization path exists, do the work in the main session,
  loading the task artifacts and specs directly. Do not start an unsynchronizable
  child or load a child-only role skill in the main session.

Unknown, aborted, or failed outcomes block the dependent gate. The SDK
`session/wait` API is not automatically a model-callable tool. Do not simulate
waiting with shell sleep, polling loops, `job_output`, or repeated agent-list
polling. Keep the workflow's active-task context, role boundaries, recursion
guards, and required planning/check/commit gates intact.

## Two Context Loading Modes

### hook push

The platform hook injects task context before the agent starts. The agent file itself can focus more on responsibilities and boundaries.

Common on platforms that support agent hooks.

### agent pull

The agent file instructs the agent to read after startup:

- `python3 ./.trellis/scripts/task.py current --source`
- `implement.jsonl` or `check.jsonl`
- spec/research files referenced by JSONL
- current task `prd.md`
- `design.md` if present
- `implement.md` if present

This mode fits platforms whose hooks cannot reliably rewrite sub-agent prompts.

## Local Change Scenarios

| User need | Edit location |
| --- | --- |
| Implement agent must follow extra restrictions | The platform's `trellis-implement` agent file. |
| Check agent must run project-specific commands | `trellis-check` agent file, and `.trellis/spec/` if needed. |
| Research agent must output a fixed format | `trellis-research` agent file. |
| Agent cannot read task context | Agent prelude or `inject-subagent-context` hook. |
| Add a project-specific agent | Platform agent directory + related workflow/command/skill entry point. |

## Modification Principles

1. **Keep responsibilities single-purpose**. Do not mix research, implement, and check responsibilities into one agent.
2. **Specify the read order**. Agents must know to start from the active task, read jsonl/spec context, then read `prd.md`, `design.md` if present, and `implement.md` if present.
3. **Specify write boundaries**. Research usually only writes `research/`; implement can write code; check can fix issues.
4. **Keep semantics synchronized in multi-platform projects**. If the user configured Claude, Codex, and Cursor together, decide whether changes to one platform's agent also need to be applied to others.

## Do Not Default To Editing Upstream Templates

Local AI should default to modifying platform agent files inside the user project. Discuss upstream template source only when the user explicitly wants to contribute the change back to Trellis.
