# Implement — nested-host identity for TRELLIS_CONTEXT_ID

## Checklist

1. Extract `_payload_context_key` and `_environment_override_key` from
   `resolve_context_key`. Add `_proven_innermost_host_key` with the DSH
   managed-shell proof only. Change precedence as in `design.md`.
   Add `"dsh"` to `_KNOWN_PLATFORMS` so metadata can infer the prefix.
   Do **not** add `DSH_SESSION_ID` to `_ENV_SESSION_KEYS`.
2. Mirror the payload-vs-override rule in
   `TrellisContext.getContextKey`. Keep no-input override behavior.
3. Update `script-conventions.md` and `platform-integration.md`
   precedence lists. Mention the host-proof rule and that bare native
   env vars still cannot displace an override.
4. Copy the template `active_task.py` to the dogfood twin (byte-identical).
5. Tests in `regression.test.ts`:
   - managed DSH shell outranks inherited override
   - `DSH_SESSION_ID` alone does not
   - explicit override without host proof still works (existing test)
   - Claude SessionStart with foreign inherited override persists the
     payload key
   - OpenCode `getContextKey` prefers `sessionID` over a foreign override
   - OpenCode `getContextKey()` with no input still uses the override
6. Scrub `DSH_SHELL` / `DSH_SESSION_ID` in both `sessionEnv` /
   `AMBIENT_SESSION_ENV_KEYS` lists so host proofs cannot leak from the
   developer shell.

## Validation

```bash
pnpm --filter @mindfoldhq/trellis-cli exec vitest run test/regression.test.ts -t "session-current-task|nested-host|env-file-dedup|OpenCode resolver"
python3 -m py_compile packages/cli/src/templates/trellis/scripts/common/active_task.py .trellis/scripts/common/active_task.py
cmp packages/cli/src/templates/trellis/scripts/common/active_task.py .trellis/scripts/common/active_task.py
```

After the focused tests pass, run the CLI regression file and lint/typecheck
if time allows.

## Review gates

- No new name in `_ENV_SESSION_KEYS`.
- `allow_environment_context=False` still ignores override and host proofs.
- Existing `task.py start` + `TRELLIS_CONTEXT_ID` tests stay green.

## Rollback

`git revert` the resolver commit. No migration.
