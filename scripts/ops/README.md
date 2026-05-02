# Ops Scripts

Operational helper scripts for command-approval warmups and execution hygiene.

## Files

### `warmup_overnight_approvals.sh`
Warm up approval prefixes for overnight runs.

## How To Run

From repo root:

```bash
bash scripts/ops/warmup_overnight_approvals.sh
```

Optional modes:

```bash
bash scripts/ops/warmup_overnight_approvals.sh --with-git-write
bash scripts/ops/warmup_overnight_approvals.sh --with-deploy
bash scripts/ops/warmup_overnight_approvals.sh --with-git-write --with-deploy
```

## Flags

- `--with-git-write`: includes `git add/commit/push` warm-up commands (real commit).
- `--with-deploy`: includes deploy and production health/UI checks.

## Safety Notes

1. Default run is non-destructive (no push, no deploy).
2. `--with-git-write` creates a real commit.
3. Use `Allow and remember` on prompts to save approved prefixes.
