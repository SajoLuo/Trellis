# Trellis on DeepSeek Harness (dsh)

dsh is a **class-2 pull-based** Trellis host. It discovers Trellis skills from
the project, uses native continuable sub-agents for isolated implementation and
review roles, and exposes a stable `DSH_SESSION_ID` to every managed shell.

| Capability | Without companion plugin | With `dsh-trellis` |
| --- | --- | --- |
| Shared and entry skills | Works | Works |
| Session-scoped active task | Works through verified `DSH_SHELL=1` + `DSH_SESSION_ID`, including nested launches | Managed per-execution identity can forward a distinct child session |
| Implement/check/research roles | Legacy foreground, verified native yield/result path, or main-session fallback | Native sub-agent with `trellis_wait` when exposed; otherwise the same capability-selected fallback |
| Per-turn workflow breadcrumb | Not available | Injected from `workflow.md` |
| Event-driven child synchronization | No dedicated wait tool; native notification/yield may be available | `trellis_wait` when present in the actual tool catalog; otherwise the same native/foreground/main-session paths |
| Utility commands | Not available | `/trellis-status`, `/trellis-finish` |

## Quick start

```bash
trellis init --dsh -u your-name
dsh web        # or: dsh --profile headless "start a Trellis task for ..."
```

The companion plugin is optional and profile-scoped. Install it only into the
profiles you actually use:

```bash
dsh plugin --profile web add dsh-trellis
dsh plugin --profile headless add dsh-trellis
```

Repeat the command for any additional profile, such as `tui`. `trellis init
--dsh` deliberately does not modify DSH profiles.

In dsh:

1. Describe the work in natural language and load `trellis-start` when a
   session needs explicit Trellis bootstrap.
2. The main session dispatches `trellis-agent-research`,
   `trellis-agent-implement`, and `trellis-agent-check` through DSH's native
   `subagent` tool. Each child loads exactly one matching role skill.
3. Finish through `trellis-finish-work`, which preserves the required order:
   commit, archive, then journal.

## Companion plugin fallback contract

The Trellis adapter does not install a DSH profile plugin. Before dispatching a
role, inspect the actual tool catalog and `subagent` schema, not plugin presence
alone. DSH 0.2.1-alpha.2 returns a `subagentId` immediately and has no
`run_in_background` parameter; a returned child id is not completion evidence.

- If available, use `trellis_wait` with the normal continuable `subagent`
  contract, continue independent work, then call it once per dependent child id.
  Require a successful settled outcome and inspect the actual report or
  transcript before entering the dependent gate. A wait result or end event
  does not prove a native settlement notice was queued or delivered;
  `settlementNoticeQueued: false` means delivery is unverified, not that it
  definitely failed. Do not wait for a separate notice after a verified result.
- If unavailable, use `run_in_background: false` only when the legacy tool
  schema supports it. Inspect the successful returned outcome and actual report
  or transcript before the dependent gate. Never send this removed parameter
  to alpha.2.
- Without a wait tool or legacy foreground support, dispatch only if the host
  exposes a verified native notification/yield path: yield the parent and
  consume the actual successful result and report or transcript before the
  dependent gate. Native settlement notices are best-effort; merely expecting
  one is not a verified synchronization path.
- If no reliable synchronization path exists, do the work in the main session,
  loading the task artifacts and referenced specs directly. Do not start an
  unsynchronizable child or load a child-only role skill in the main session.

Unknown, aborted, or failed outcomes leave the dependent gate blocked or failed.
The SDK `session/wait` API is not automatically a model-callable tool: use only
synchronization tools or native yield behavior actually exposed by the host.

Never replace any path with shell sleep, polling loops, `job_output`, or
repeated agent-list polling.

## Nested host sessions

DSH inherits ordinary environment variables from the process that launches it.
If that outer process is already an active Trellis session,
`TRELLIS_CONTEXT_ID` would otherwise override the inner `DSH_SESSION_ID`.
DSH rebuilds its complete `DSH_*` namespace for each managed shell, so the beta
adapter treats `DSH_SHELL=1` together with `DSH_SESSION_ID` as the current DSH
identity and resolves it before an inherited generic override, even without the
plugin. The optional plugin additionally contributes a trusted
`DSH_TRELLIS_CONTEXT_ID` when it must forward a child identity that differs
from the shell's own session id.

## File map

- `.agents/skills/` — shared workflow and bundled skills, byte-identical to
  the other Agent Skills writers.
- `.dsh/skills/trellis-{start,continue,finish-work}/` — DSH-private entry
  skills.
- `.dsh/skills/trellis-agent-{research,implement,check}/` — child-only role
  skills; implement/check include the pull-based task context prelude.
- `.dsh/DSH.md` — this operator guide.
- `.trellis/` — workflow, specs, tasks, workspace journal, and shared scripts.

## Notes

- Generated Python commands use `python3` in source templates and are rendered
  to the detected Windows launcher during `trellis init` / `trellis update`.
- Role dispatch prompts start with `Active task: <task path>`. This exact task
  path is the child's primary context source; children must not guess globally.
- Each `dsh --profile headless` invocation creates a fresh DSH session. Do not
  expect an active-task pointer to persist across separate headless calls; keep
  the workflow in one session or explicitly resume its returned session id.
- The optional companion plugin is maintained separately at
  <https://github.com/SajoLuo/dsh-trellis>.
