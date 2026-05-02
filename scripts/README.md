# Scripts Guide

This folder contains operational, deploy, install, test, migration, and utility scripts.

## Structure

- `deploy/`: deploy and versioning scripts
- `test/`: local and remote verification scripts
- `install/`: machine/setup helpers
- `ops/`: operational helpers for approvals/runbooks
- `db/`, `utils/`, `daemons/`: focused subsystem scripts

## Usage Rule

When adding or changing scripts in any subfolder, keep a local `README.md` in that same folder with:

1. Purpose
2. How to run
3. Required flags/env
4. Examples
5. Safety notes

This prevents losing usage details across conversations.
