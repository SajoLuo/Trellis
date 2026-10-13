# DeepSeek Harness Synchronization Contract

## 1. Scope / Trigger

Use this contract when changing generated DSH dispatch instructions in
`packages/cli/src/templates/dsh/DSH.md`, the shared workflow template or its
`.trellis/workflow.md` mirror, and bundled `trellis-meta` platform references.
The companion `dsh-trellis` plugin is optional; the platform adapter must remain
usable without it.

Official alpha.2 sources:

- [Model-facing subagent tool](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-alpha.2/packages/subagent/tool-subagent/src/index.ts)
- [Activation and notice delivery](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-alpha.2/packages/subagent/subagent/src/manager.ts)

## 2. Signatures

- Legacy `subagent` schemas may expose `run_in_background`; only those hosts
  accept the foreground argument `run_in_background: false`.
- Alpha.2 `subagent` returns `{ kind: "activation", subagentId: string }`
  immediately. Its schema has no `run_in_background` parameter.
- Optional `trellis_wait({ subagent_id: string })` returns execution state and
  outcome, not the child report itself. Inspect the actual report/transcript.
- SDK `session/wait` is not automatically a model-callable tool. Never invent
  this tool from the SDK release notes.

## 3. Contracts

Choose synchronization from the actual visible tool schema and host delivery
capabilities before starting a dependent child:

1. With `trellis_wait`, dispatch a supported continuable child, continue useful
   independent work, and wait at the dependent gate. Require a successful settled
   outcome and inspect the actual child report/transcript before advancing.
2. Without it, use legacy foreground dispatch only if its parameter is present.
3. On immediate-return hosts, use a documented native notification/yield path:
   yield the parent and consume a real successful result before advancing.
4. With no reliable synchronization path, do the work in the main session;
   do not launch a child that cannot be synchronized.

Child IDs, tool-return receipts and inactive catalog snapshots are not proof of
successful completion. A settlement event is not proof of notification delivery:
the native runtime may skip or fail delivery independently. The plugin's retained
`settlementNoticeQueued: false` field means unverified, not proven non-delivery.

Keep role loading, exact `Active task:` dispatch context, recursion guards and
all planning/commit phase gates intact. This contract does not change session
identity, task pointers, Python scripts, profile configuration or installation.

## 4. Validation & Error Matrix

| Condition | Required handling |
| --- | --- |
| `run_in_background` absent from schema | Omit it; select a supported event-driven path or main-session work |
| Only a child ID/activation receipt exists | Dependent gate remains closed |
| Wait returns failed, aborted or unknown | Do not pass the gate; inspect/repair or report the blocker |
| Wait settles but report is absent | Retrieve the real report through available host capabilities; do not guess success |
| Native notification has not arrived | Yield through the supported host path; never simulate waiting by polling/sleep |
| No reliable waiter or native delivery path | Do the work directly in the main session |

## 5. Good / Base / Bad Cases

- Good: alpha.2 with the plugin waits for a matching child settlement, then
  checks the outcome and report without claiming that a notice was enqueued.
- Base: pluginless legacy hosts use their supported foreground parameter;
  pluginless alpha.2 uses native notification/yield or main-session work.
- Bad: an immediate child ID or an inactive snapshot is treated as a successful
  implementation/check result, or a removed parameter is sent to alpha.2.

## 6. Tests Required

- Assert both guide and workflow retain the capability-dependent legacy path,
  immediate-return behavior and safe pluginless fallback.
- Check the shared protocol, in-progress breadcrumb and research/implement/check
  dispatch instructions for stale unconditional foreground/notice guarantees.
- Exercise real DSH template collection/writing without mocking internal modules.
- Check generated bundled meta agent guidance, its skill overview and platform
  map for capability-selected paths and stale unconditional foreground advice.
- Compare workflow source and dogfood mirror after normalizing CRLF to LF.
- Keep existing phase-gate and recursion-guard regressions. Report unrelated
  baseline/environment failures explicitly; never label a nonzero check passed.

## 7. Wrong vs Correct

Wrong: "No plugin means `run_in_background: false`; a wait result proves the
native settlement notice was queued."

Correct: inspect actual capabilities. Legacy foreground is schema-dependent;
alpha.2 returns immediately and needs event-driven synchronization or direct
main-session work. A gate requires a real successful outcome and report, not
a notification assumption.
