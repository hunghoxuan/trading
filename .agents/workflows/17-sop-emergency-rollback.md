# SOP: Emergency Rollback

Goal: restore service quickly and safely after a bad deploy.

## Steps

1. Stop feature work and declare incident mode.
2. Identify last known good commit:
- `git log --oneline -n 10`
3. Use safe revert strategy (preferred):
- `git revert <bad_commit_sha>`
- `git push origin main`
4. Deploy revert:
- `PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh`
5. Verify health and PM2 state.
6. Record incident summary in `.agents/changelog.md` (what failed, what was reverted).

## Notes

- Avoid destructive git commands (`reset --hard`) unless explicitly approved.
- For MT5 EA regressions, also provide compile/re-attach instructions to user.
