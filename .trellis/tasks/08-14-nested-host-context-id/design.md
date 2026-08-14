# Design — nested-host identity for TRELLIS_CONTEXT_ID

## Behavior gap

Today:

```
outer Claude SessionStart → export TRELLIS_CONTEXT_ID=claude_outer
  └─ bash
       ├─ task.py          → correct (same session)
       └─ dsh / codex / …  → inner task.py / SessionStart sees claude_outer
```

Wanted: the inner host uses its own key. Spawned Trellis scripts still inherit.

## Where the behavior lives

`resolve_context_key` in `common/active_task.py` returns the override before
anything else. That is the only place a Python hook, `task.py`, or
`get_context.py` can distinguish the two cases. OpenCode's
`TrellisContext.getContextKey` is the JS twin and has the same first-match.

Do not fix this by scrubbing the variable at DSH session start only. That is
option 3 in #549 and does not cover pull-based inner hosts.

## Mechanism

Reader-side, two signals that an inherited override is stale:

1. **Proven innermost host.** A small function, not `_ENV_SESSION_KEYS`.
   Each proof must document why the sentinel cannot arrive from an outer
   Trellis session. First entry: `DSH_SHELL=1` + `DSH_SESSION_ID` →
   `dsh_<id>`. Bare `DSH_SESSION_ID` is not a proof.
2. **Hook payload that disagrees with the override.** Session /
   conversation / transcript id on stdin is first-party for the process
   that is running now. Return the payload key when it differs.

Unchanged after that: override, then payload (when no override), then
platform-scoped env tables, then shell ticket.

`allow_environment_context=False` still skips override and host proofs
(Codex native sub-agent path).

## Why not the other options

| Option | Why not in this change |
| --- | --- |
| Write-time PID / nonce scope | Nested agents are still descendants of the writer. Scope-as-tree does not distinguish them without a host detector. |
| Stop writing `CLAUDE_ENV_FILE` | Correct long-term narrowing, but it breaks Claude `task.py` unless we also wire Claude into the shell-ticket / command-prefix path. Separate change. |
| Untargeted native-env wins | A DSH shell launched from Codex still carries `CODEX_THREAD_ID`. An untargeted walk would re-attribute the session. |
| Add `DSH_SESSION_ID` to `_ENV_SESSION_KEYS` | Same untargeted-walk problem on `main`, where `task.py` often has `platform=None`. |

## Files

| File | Why |
| --- | --- |
| `packages/cli/src/templates/trellis/scripts/common/active_task.py` | Resolver |
| `.trellis/scripts/common/active_task.py` | Dogfood twin |
| `packages/cli/src/templates/opencode/lib/trellis-context.js` | JS twin |
| `packages/cli/test/regression.test.ts` | End-to-end `task.py` + SessionStart + OpenCode |
| `.trellis/spec/cli/backend/script-conventions.md` | Precedence contract |
| `.trellis/spec/cli/backend/platform-integration.md` | Same contract for platform authors |

## Compatibility

- Spawned scripts: no payload, no host proof → override still wins.
- Same-session SessionStart: payload key equals override → either value.
- Nested SessionStart: payload key differs → inner key, then
  `_persist_context_key_for_bash` writes the inner key to `CLAUDE_ENV_FILE`.
- Pluginless DSH shell: host proof wins even without a DSH platform on `main`.
- Pi / OMP: already prefer native session id; no change.

## Rollback

Revert the resolver precedence and the two spec paragraphs. No persisted
schema change. Existing session files stay valid.
