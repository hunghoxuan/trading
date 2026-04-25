# Deploy Skill

Standard deployment flow:
1. Run local checks.
2. Bump build versions.
3. Commit and push.
4. Deploy with `bash scripts/deploy_webhook.sh`.
5. Verify health endpoints and critical route smoke tests.
