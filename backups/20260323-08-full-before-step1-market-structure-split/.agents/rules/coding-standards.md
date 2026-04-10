---
description: Coding standards for file header versioning, naming, and section order
---

Apply these standards whenever adding or refactoring code in this project.

## 1) Version Header Consistency

1. Keep header version/trace markers consistent across related source files.
2. When one file header version marker is updated, update all target files in the same change set to the same version marker format.
3. Do not leave mixed version header styles across KIT and indicator files.

## 2) Naming Convention

1. Feature method naming:
- `get_data_xxx` for data gathering/computation inputs.
- `draw_data_xxx` for rendering and visual updates.
- `process_data_xxx` for orchestration/state mutation pipeline.

2. Helper naming:
- Use `local_` prefix for indicator-local helpers.
- Exception: KIT-clone temporary helpers must follow KIT policy naming `{CORE/SMC/UI}_{method_name}`.

3. Prefer clear domain names:
- Use `trade` naming for trade concepts.
- Use `pd_array` naming for PD array concepts.
- Do not run broad rename migrations unless explicitly requested for the task.

## 3) Code Section Order in File

When adding new code, keep this order:
1. UAT blocks / runtime toggles (if any)
2. Constants
3. Global vars (`var`)
4. Local/common helpers
5. Feature methods grouped by pipeline:
- `get_data_xxx`
- `draw_data_xxx`
- `process_data_xxx`

Keep this order stable to reduce merge conflicts and speed up debugging.
