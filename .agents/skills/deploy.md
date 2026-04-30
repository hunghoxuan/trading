# Deploy Playbook

Use after reading `rules/deploy.md`.

1. Run local checks.
2. Bump versions.
3. Commit and push when requested/needed.
4. Deploy:
   - `bash scripts/deploy_webhook.sh`
5. Verify health + smoke routes.
