# Stop inherited TRELLIS_CONTEXT_ID from capturing nested host sessions

## Goal

When one AI coding platform is launched from inside another Trellis session,
the inner session must resolve its own session identity. It must not silently
adopt the outer session's active task just because `TRELLIS_CONTEXT_ID` is an
ordinary inherited environment variable.

GitHub: https://github.com/mindfold-ai/Trellis/issues/549

## Background

`resolve_context_key` treats `TRELLIS_CONTEXT_ID` as the first match and
returns it before hook payload, platform-native session env, or the shell
ticket. Inheritance is the feature that lets hooks hand identity to `task.py`
and other subprocesses. The same inheritance is what makes a nested agent
look like a script we spawned.

This is not a DSH bug. It surfaced while verifying 0.6.15 against dsh
`0.1.0-rc.6` (Claude Code → dsh). The same shape applies to Claude → Codex,
Codex → dsh, or any platform launched from a terminal inside an editor
session that already has an active task.

DSH-specific isolation on `feat/v0.7-beta` / #548 is a per-platform proof,
not the general mechanism this task ships.

## Requirements

- An inherited `TRELLIS_CONTEXT_ID` MUST NOT win when the current process can
  prove it is a different innermost host than the one that set the override.
- A hook payload that carries a session / conversation / transcript id MUST
  outrank a conflicting inherited override. The payload is first-party
  evidence of the process running now.
- `TRELLIS_CONTEXT_ID` MUST keep working for scripts we spawned: no payload,
  no innermost-host proof, override present → same key as today.
- A platform-native session env var that can be inherited from an outer host
  MUST NOT, by itself, displace an explicit override. That is how leftover
  `CODEX_THREAD_ID` or a hand-set `DSH_SESSION_ID` would steal a session.
- Host proofs MUST be evidence-backed, not guessed by analogy. The first
  verified proof is DSH's rebuilt namespace: `DSH_SHELL=1` plus
  `DSH_SESSION_ID` (live dsh `0.1.0-rc.6`, 2026-08-14).
- Do not add bare `DSH_SESSION_ID` to `_ENV_SESSION_KEYS` on this branch.
  Untargeted lookup would let a leftover DSH id claim a Claude/Codex session.
- OpenCode's JS resolver mirrors Python and MUST apply the same payload-vs-
  override rule. Pi and OMP already prefer native session identity.
- Dogfood and shipped `active_task.py` stay byte-identical.

## Out of Scope

- Full DSH platform support on `main` (templates, init flag, native
  sub-agents). That stays on the DSH beta work.
- Removing `TRELLIS_CONTEXT_ID` from `CLAUDE_ENV_FILE` or stopping OpenCode/Pi
  from prefixing arbitrary bash commands. Write-time narrowing is a follow-up.
- Process-tree / PID-scope detection. Useful for pull-based inner hosts with
  no payload and no host proof; too fragile to ship in this change.
- Changing Snow's `_current_session_ids` preference order.
- Blocking DSH PRs on this fix.

## Acceptance Criteria

- [ ] `task.py start` with `TRELLIS_CONTEXT_ID=claude_outer`, `DSH_SHELL=1`,
      and `DSH_SESSION_ID=inner` writes `dsh_inner` and does not write
      `claude_outer`.
- [ ] `task.py start` with `TRELLIS_CONTEXT_ID=claude_outer` and
      `DSH_SESSION_ID=unmanaged` (no `DSH_SHELL`) still writes `claude_outer`.
- [ ] `task.py start` with only `TRELLIS_CONTEXT_ID=session-a` still writes
      `session-a` (spawned-script contract unchanged).
- [ ] Claude SessionStart whose payload session id differs from an inherited
      `TRELLIS_CONTEXT_ID` persists the payload-derived key to
      `CLAUDE_ENV_FILE`.
- [ ] OpenCode `getContextKey({ sessionID })` returns `opencode_<id>` when
      `TRELLIS_CONTEXT_ID` is a foreign outer key.
- [ ] OpenCode `getContextKey()` with no input still honors
      `TRELLIS_CONTEXT_ID` (bash-prefix / spawned-script path).
- [ ] Specs in `script-conventions.md` and `platform-integration.md` describe
      the new precedence, including the host-proof rule.
- [ ] Dogfood and template `active_task.py` remain byte-identical.
