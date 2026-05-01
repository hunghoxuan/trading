# Token Rules

- Always run shell commands via `rtk` unless raw output is explicitly required.
- Prefer targeted reads:
  - `rg` for search
  - `sed -n 'start,endp'` for partial file reads
  - `head`/`tail` for logs
- Avoid broad scans of large folders (`.git`, `.codex/sessions`, `node_modules`, `dist`, logs) unless required.
- Keep command output bounded (use `head`, `tail`, `--max-*`, or scoped paths).
- Report concise summaries, not full dumps.
- Preferred tool stack:
  - search text: `rtk rg`
  - search files: `rtk fd` (or `rtk fdfind` on Debian/Ubuntu)
  - structured JSON: `rtk jq`
  - bounded file view: `rtk sed -n`, `rtk head`, `rtk tail`
  - readable git diffs: `rtk git -c core.pager=delta diff`
